"""Account authentication RPC behavior contracts."""

import json

import pytest


def _call(server, name, params=None):
    return server.handle_request({"jsonrpc": "2.0", "id": name, "method": name, "params": params or {}})


def _home(tmp_path, monkeypatch, *, dev=True):
    from tui_gateway import server
    home = tmp_path / ".hermes"
    home.mkdir(parents=True)
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setattr(server, "_hermes_home", home)
    (home / "config.yaml").write_text(f"account:\n  dev_mode: {'true' if dev else 'false'}\n", encoding="utf-8")
    return server, home


def test_status_reports_mode_and_capabilities(tmp_path, monkeypatch):
    server, _ = _home(tmp_path, monkeypatch, dev=False)
    result = _call(server, "account.status")["result"]
    assert result == {"authenticated": False, "account": None, "mode": "unconfigured",
                      "capabilities": {"code_login": False, "wechat_login": False}}


@pytest.mark.parametrize('identifier', ['not-a-phone13800138000', '13+800138000'])
def test_invalid_phone_text_cannot_become_a_different_account(tmp_path, monkeypatch, identifier):
    server, _ = _home(tmp_path, monkeypatch)
    result = _call(server, 'account.request_code', {'identifier': identifier})
    assert result['error']['data']['reason'] == 'invalid_identifier'


def test_request_verify_once_and_persist_multiple_identifiers(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch)
    first = _call(server, "account.request_code", {"identifier": "USER@Example.COM"})
    assert first["result"] == {"ok": True, "delivery": "development", "expires_in": 600, "retry_after": 60}
    assert _call(server, "account.request_code", {"identifier": "user@example.com"})["error"]["data"]["reason"] == "retry_cooldown"
    verified = _call(server, "account.verify_code", {"identifier": "user@example.com", "code": "1234"})["result"]
    aid = verified["account"]["id"]
    assert verified["created"] is True
    raw = (home / "account.json").read_text(encoding="utf-8")
    assert "pending_code" not in json.loads(raw)
    assert json.dumps("1234") not in raw
    assert _call(server, "account.verify_code", {"identifier": "user@example.com", "code": "1234"})["error"]["data"]["reason"] == "missing_code"
    _call(server, "account.request_code", {"identifier": "13800138000"})
    bid = _call(server, "account.verify_code", {"identifier": "13800138000", "code": "1234"})["result"]["account"]["id"]
    _call(server, "account.request_code", {"identifier": "USER@EXAMPLE.COM"})
    aid_again = _call(server, "account.verify_code", {"identifier": "user@example.com", "code": "1234"})["result"]["account"]["id"]
    assert aid_again == aid and bid != aid


def test_wrong_code_attempt_limit(tmp_path, monkeypatch):
    server, _ = _home(tmp_path, monkeypatch)
    _call(server, "account.request_code", {"identifier": "a@example.com"})
    for index in range(5):
        response = _call(server, "account.verify_code", {"identifier": "a@example.com", "code": "0000"})
        assert response["error"]["data"]["reason"] == ("attempts_exceeded" if index == 4 else "invalid_code")


def test_expired_code_is_rejected(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch)
    _call(server, "account.request_code", {"identifier": "expired@example.com"})
    state = json.loads((home / "account.json").read_text(encoding="utf-8"))
    state["pending_code"]["expires_at"] = 0
    (home / "account.json").write_text(json.dumps(state), encoding="utf-8")
    response = _call(server, "account.verify_code", {"identifier": "expired@example.com", "code": "1234"})
    assert response["error"]["data"]["reason"] == "expired"


def test_disabled_mode_and_corrupt_state_are_explicit_errors(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch, dev=False)
    assert _call(server, "account.request_code", {"identifier": "a@example.com"})["error"]["data"]["reason"] == "development_disabled"
    home.joinpath("account.json").write_text("{broken", encoding="utf-8")
    assert _call(server, "account.status")["error"]["data"]["reason"] == "state_unavailable"


def test_logout_clears_authentication_but_keeps_accounts(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch)
    _call(server, "account.request_code", {"identifier": "a@example.com"})
    account = _call(server, "account.verify_code", {"identifier": "a@example.com", "code": "1234"})["result"]["account"]
    assert _call(server, "account.logout")["result"]["authenticated"] is False
    persisted = json.loads((home / "account.json").read_text(encoding="utf-8"))
    assert account["id"] in persisted["accounts"]


def test_nickname_update_persists_for_only_the_signed_in_account(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch)
    _call(server, "account.request_code", {"identifier": "first@example.com"})
    first = _call(server, "account.verify_code", {"identifier": "first@example.com", "code": "1234"})["result"]["account"]
    _call(server, "account.request_code", {"identifier": "second@example.com"})
    second = _call(server, "account.verify_code", {"identifier": "second@example.com", "code": "1234"})["result"]["account"]

    rejected = _call(server, "account.update_profile", {"display_name": "  小海盗 🏴‍☠️  ", "account_id": first["id"]})
    assert rejected["error"]["code"] == 4000
    updated = _call(server, "account.update_profile", {"display_name": "  小海盗 🏴‍☠️  "})["result"]
    assert updated["authenticated"] is True
    assert updated["account"] == {**second, "display_name": "小海盗 🏴‍☠️"}
    persisted = json.loads((home / "account.json").read_text(encoding="utf-8"))
    assert persisted["accounts"][first["id"]]["display_name"] == first["display_name"]
    assert persisted["accounts"][second["id"]]["display_name"] == "小海盗 🏴‍☠️"

    _call(server, "account.logout")
    _call(server, "account.request_code", {"identifier": "second@example.com"})
    restored = _call(server, "account.verify_code", {"identifier": "second@example.com", "code": "1234"})["result"]
    assert restored["account"] == updated["account"]


def test_nickname_update_rejects_signed_out_and_invalid_values_without_writing(tmp_path, monkeypatch):
    server, home = _home(tmp_path, monkeypatch)
    assert _call(server, "account.update_profile", {"display_name": "海盗"})["error"]["data"]["reason"] == "not_authenticated"
    assert not (home / "account.json").exists()

    _call(server, "account.request_code", {"identifier": "user@example.com"})
    _call(server, "account.verify_code", {"identifier": "user@example.com", "code": "1234"})
    before = (home / "account.json").read_bytes()
    for invalid in (None, 42, "   ", "名字\n换行", "a" * 33, "\ud800"):
        response = _call(server, "account.update_profile", {"display_name": invalid})
        assert response["error"]["data"]["reason"] == "invalid_display_name"
        assert (home / "account.json").read_bytes() == before
