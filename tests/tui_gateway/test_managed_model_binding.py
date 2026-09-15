"""Exercise managed bindings through the actual session/transport dispatcher."""
import json
from datetime import datetime, timedelta, timezone

import pytest

import tui_gateway.server as srv
from tui_gateway.managed_model_runtime import get_registry


class Peer:
    def __init__(self, user="gateway-user", read_only=False):
        self.auth_identity = {"provider": "fixture", "user_id": user, "read_only": read_only}

    def write(self, value):
        return True


@pytest.fixture
def rig(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    owner, controller, stranger = Peer(), Peer(), Peer("stranger")
    sessions = []

    def call(peer, method, **params):
        return srv.dispatch({"id": 1, "method": method, "params": params}, peer)

    def create(source="desktop"):
        sid = result(call(owner, "session.create", source=source, cwd=str(tmp_path)))["session_id"]
        sessions.append(sid)
        return sid

    try:
        yield call, create, owner, controller, stranger, tmp_path
    finally:
        for sid in sessions:
            with srv._sessions_lock:
                srv._pop_session_by_id(sid)


def result(response):
    assert "error" not in response, response
    return response["result"]


def prepare(call, sid, owner, controller):
    identity = {"platform_origin": "https://fixture.invalid", "user_id": "platform-user"}
    params = {"session_id": sid, "owner": identity, "model_id": "fixture-model"}
    ticket = result(call(owner, "session.managed_model_ticket", **params))["session_ticket"]
    claim = result(call(controller, "session.claim_managed_model", **params, session_ticket=ticket))
    return {
        **params, "binding_revision": claim["binding_revision"], "api_mode": "chat_completions",
        "model": "fixture-upstream", "capabilities": {"tools": True, "vision": False, "reasoning": False},
        "credential_id": "fixture-credential", "api_key": "test-secret-never-persist",
        "base_url": "https://fixture.invalid/v1",
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    }, ticket


def test_owned_delegation_rejects_strangers_replay_and_wrong_scope(rig):
    call, create, owner, controller, stranger, _ = rig
    sid = create()
    params, ticket = prepare(call, sid, owner, controller)
    for peer, method, extra in (
        (stranger, "session.bind_managed_model", {}),
        (controller, "session.bind_managed_model", {"profile": "missing-profile"}),
        (controller, "session.bind_managed_model", {"owner": {**params["owner"], "user_id": "other"}}),
        (controller, "session.bind_managed_model", {"expires_at": datetime.now(timezone.utc).isoformat()}),
        (controller, "session.claim_managed_model", {"session_ticket": ticket}),
    ):
        assert "error" in call(peer, method, **(params | extra))
    response = result(call(controller, "session.bind_managed_model", **params))
    binding = get_registry().get(sid, srv._sessions[sid])
    assert binding.api_key == params["api_key"]
    assert params["api_key"] not in repr(binding) + json.dumps(response)
    assert "error" in call(stranger, "session.clear_managed_model", session_id=sid,
                           binding_revision=params["binding_revision"])
    assert "error" in call(stranger, "session.managed_model_ticket", **params)
    for peer, session_id in ((Peer(read_only=True), sid), (owner, create("cli"))):
        assert "error" in call(peer, "session.managed_model_ticket", **(params | {"session_id": session_id}))


def test_renewal_keeps_active_binding_until_replaced_and_stale_clear_cannot_remove_it(rig):
    call, create, owner, controller, _, home = rig
    sid = create()
    first, _ = prepare(call, sid, owner, controller)
    result(call(controller, "session.bind_managed_model", **first))
    previous = get_registry().get(sid)
    second, _ = prepare(call, sid, owner, controller)
    assert get_registry().get(sid) is previous
    assert "error" in call(controller, "session.bind_managed_model", **first)
    result(call(controller, "session.bind_managed_model", **second))
    assert result(call(controller, "session.clear_managed_model", session_id=sid,
                       binding_revision=first["binding_revision"]))["cleared"] is False
    assert get_registry().get(sid).binding_revision == second["binding_revision"]
    get_registry().disconnect(controller)
    assert get_registry().get(sid) is None
    for path in home.rglob("*"):
        if path.is_file():
            assert first["api_key"].encode() not in path.read_bytes()


def test_claim_requires_same_gateway_principal_and_live_session_identity(rig):
    call, create, owner, controller, stranger, _ = rig
    sid = create()
    params = {"session_id": sid, "owner": {"platform_origin": "https://fixture.invalid", "user_id": "platform-user"},
              "model_id": "fixture-model"}
    ticket = result(call(owner, "session.managed_model_ticket", **params))["session_ticket"]
    assert "error" in call(stranger, "session.claim_managed_model", **params, session_ticket=ticket)
    old = srv._sessions[sid]
    srv._sessions[sid] = dict(old)
    assert "error" in call(controller, "session.claim_managed_model", **params, session_ticket=ticket)
    srv._sessions[sid] = old
    result(call(controller, "session.claim_managed_model", **params, session_ticket=ticket))
    with srv._sessions_lock:
        srv._pop_session_by_id(sid)
    assert get_registry().get(sid) is None
    assert "error" in call(controller, "session.claim_managed_model", **params, session_ticket=ticket)


def test_expiry_revokes_active_call_and_close_cleans_binding(rig, monkeypatch):
    import tui_gateway.managed_model_runtime as runtime
    call, create, owner, controller, _, _ = rig
    sid = create()
    params, _ = prepare(call, sid, owner, controller)
    result(call(controller, "session.bind_managed_model", **params))
    session = srv._sessions[sid]
    session["running"] = True
    cancelled = []
    monkeypatch.setattr(srv, "_interrupt_session_turn", lambda sid, sess: cancelled.append((sid, sess)))
    class FutureDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime.now(tz) + timedelta(hours=2)
    monkeypatch.setattr(runtime, "datetime", FutureDatetime)
    assert get_registry().get(sid) is None
    assert cancelled == [(sid, session)]
    session["running"] = False
