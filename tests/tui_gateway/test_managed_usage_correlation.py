"""Billing metadata travels on the real wire, never in the conversation."""

from uuid import UUID

import pytest

from tests.tui_gateway.test_managed_model_agent import managed_gateway  # noqa: F401


@pytest.mark.parametrize("protocol", ["chat_completions", "responses", "anthropic_messages"])
def test_managed_tool_rounds_share_turn_but_not_request_ids(managed_gateway, protocol):
    f = managed_gateway
    f.protocol = protocol
    sid = f.create()["session_id"]
    f.bind(sid)
    f.submit(sid, "Read the fixture file")
    first_turn = list(f.request_headers)
    assert len(first_turn) >= 2
    headers = [{k.lower(): v for k, v in h.items()} for h in first_turn]
    assert len({h.get("x-aino-session-id") for h in headers}) == 1
    UUID(headers[0]["x-aino-session-id"])
    assert len({h["x-aino-turn-id"] for h in headers}) == 1
    assert len({h["x-aino-call-id"] for h in headers}) == len(headers)
    assert {h["x-aino-purpose"] for h in headers} == {"chat"}
    for h in headers:
        UUID(h["x-aino-turn-id"])
        UUID(h["x-aino-call-id"])
    f.submit(sid, "Continue")
    second = {k.lower(): v for k, v in f.request_headers[-1].items()}
    assert second["x-aino-turn-id"] != headers[0]["x-aino-turn-id"]
    for _, _, body in f.requests:
        assert headers[0]["x-aino-turn-id"] not in str(body)
    completed = [e["params"]["payload"] for e in f.chat.events
                 if e.get("params", {}).get("type") == "message.complete"]
    assert completed[-1]["turn_metrics"]["billing"]["turn_id"] == second["x-aino-turn-id"]
    billing = completed[0]["turn_metrics"]["billing"]
    assert {call["call_id"] for call in billing["calls"]} == {h["x-aino-call-id"] for h in headers}
    assert billing["calls_complete"] is True
    assert billing["status"] == "pending"  # HTTP completion is not a ledger receipt.
    from tui_gateway import server
    with server._session_db(server._sessions[sid]) as db:
        messages = db.get_messages_as_conversation(server._sessions[sid]["session_key"])
    persisted = [m["display_metadata"]["turn_metrics"]["billing"] for m in messages
                 if m.get("display_metadata", {}).get("turn_metrics", {}).get("billing")]
    assert persisted[0]["calls"] == billing["calls"]


def test_late_title_updates_original_reply_not_next_identical_reply(managed_gateway, tmp_path, monkeypatch):
    import threading
    import yaml
    import agent.title_generator as titles
    from tui_gateway import server
    f = managed_gateway
    config = yaml.safe_load((tmp_path / "config.yaml").read_text())
    config["auxiliary"]["title_generation"]["enabled"] = True
    (tmp_path / "config.yaml").write_text(yaml.safe_dump(config))
    release, finished = threading.Event(), threading.Event()
    original = titles.auto_title_session

    def delayed(*args, **kwargs):
        try:
            assert release.wait(timeout=10)
            original(*args, **kwargs)
        finally:
            finished.set()

    monkeypatch.setattr(titles, "auto_title_session", delayed)
    sid = f.create()["session_id"]
    f.bind(sid)
    try:
        f.submit(sid, "Read the fixture file and explain it")
        completed = [e["params"]["payload"] for e in f.chat.events
                     if e.get("params", {}).get("type") == "message.complete"]
        first = completed[-1]["turn_metrics"]["billing"]
        assert first["calls_complete"] is False
        f.submit(sid, "Continue")
        release.set()
        assert finished.wait(timeout=10)
        with f.chat.condition:
            assert f.chat.condition.wait_for(lambda: any(
                e.get("params", {}).get("payload", {}).get("reply_billing", {}).get("calls_complete")
                for e in f.chat.events), timeout=10)
        with server._session_db(server._sessions[sid]) as db:
            messages = db.get_messages_as_conversation(server._sessions[sid]["session_key"])
        bills = [m["display_metadata"]["turn_metrics"]["billing"] for m in messages
                 if m.get("display_metadata", {}).get("turn_metrics", {}).get("billing")]
        assert bills[0]["turn_id"] == first["turn_id"]
        assert bills[0]["calls_complete"] is True
        assert {call["purpose"] for call in bills[0]["calls"]} == {"chat", "title"}
        assert {call["purpose"] for call in bills[1]["calls"]} == {"chat"}
    finally:
        release.set()
        finished.wait(timeout=10)


def test_background_title_has_the_original_turn_scope(managed_gateway, tmp_path):
    import yaml
    f = managed_gateway
    config = yaml.safe_load((tmp_path / "config.yaml").read_text())
    config["auxiliary"]["title_generation"]["enabled"] = True
    (tmp_path / "config.yaml").write_text(yaml.safe_dump(config))
    sid = f.create()["session_id"]
    f.bind(sid)
    f.submit(sid, "Read the fixture file and explain it")
    with f.request_condition:
        assert f.request_condition.wait_for(lambda: any(
            h.get("X-Aino-Purpose") == "title" for h in f.request_headers), timeout=10)
    headers = [{k.lower(): v for k, v in h.items()} for h in f.request_headers]
    assert {h["x-aino-purpose"] for h in headers} == {"chat", "title"}
    assert len({h["x-aino-turn-id"] for h in headers}) == 1


@pytest.mark.parametrize("status,reason", [(401, "managed_upstream_auth_failed"),
    (402, "managed_balance_unavailable"),
    ((401, "DESKTOP_CREDENTIAL_EXPIRED"), "managed_credential_expired"),
    ((401, "DESKTOP_CREDENTIAL_REVOKED"), "managed_credential_revoked"),
    ((403, "INSUFFICIENT_BALANCE"), "managed_balance_unavailable"),
    ((403, "SUBSCRIPTION_NOT_FOUND"), "managed_balance_unavailable"),
    ((429, "USAGE_LIMIT_EXCEEDED"), "managed_balance_unavailable")])
def test_managed_refusals_are_not_replayed_or_sent_to_byok(managed_gateway, status, reason):
    f = managed_gateway
    sid = f.create()["session_id"]
    f.bind(sid)
    f.response_status["Bearer fixture-secret-one"] = status
    f.submit(sid, "Keep this draft when refused")
    completed = [e["params"]["payload"] for e in f.chat.events
                 if e.get("params", {}).get("type") == "message.complete"]
    assert completed[-1]["status"] == "error"
    assert completed[-1]["error_surface"]["code"] == reason
    assert len(f.requests) == 1
    assert not any(r[1] == "Bearer byok-fixture-key" for r in f.requests)


@pytest.mark.parametrize("named_profile", [False, True])
def test_billing_identity_survives_compression_resume_but_not_a_branch(managed_gateway, tmp_path, named_profile):
    import json
    from hermes_cli.profiles import get_profile_dir
    from tests.tui_gateway.test_managed_model_agent import result
    from tui_gateway import server as srv
    from tui_gateway.managed_session import runtime_for_session
    f = managed_gateway
    if named_profile:
        f.profile = "billing-fixture"
        profile = get_profile_dir(f.profile)
        assert profile.is_relative_to(tmp_path)
        profile.mkdir(parents=True)
        (profile / "config.yaml").write_text((tmp_path / "config.yaml").read_text())
    draft = f.create()
    sid, stored = draft["session_id"], draft["stored_session_id"]
    f.bind(sid)
    f.submit(sid, "Read the fixture file")
    _, runtime = runtime_for_session(sid)
    initial = runtime["api_key"].session_id
    with srv._session_db(srv._sessions[sid]) as db:
        metadata = json.loads(db.get_session(stored)["model_config"])
        db.end_session(stored, "compression")
        result(f.call("session.close", session_id=sid))
        assert db.get_session(stored)["end_reason"] == "compression"
        tip = "fixture-compressed-" + str(UUID(initial))
        db.create_session(tip, source="desktop", parent_session_id=stored,
                          model="fixture-upstream", model_config=metadata)
        assert db.get_compression_lineage(tip) == [stored, tip]
        resumed = result(f.call("session.resume", session_id=tip, source="desktop", lazy=True))
        sid = resumed["session_id"]
        f.sessions.append(sid)
        f.bind(sid)
        _, runtime = runtime_for_session(sid)
        assert runtime["api_key"].session_id == initial
        branch = result(f.call("session.branch", session_id=sid, name="separate billing"))
        f.sessions.append(branch["session_id"])
        f.bind(branch["session_id"])
        _, runtime = runtime_for_session(branch["session_id"])
        assert runtime["api_key"].session_id != initial
