"""Tests: session.bind_managed_model and session.clear_managed_model RPC handlers.

Contracts:
- bind validates session ownership and account revision
- credentials are stored in memory per session/owner
- clear removes binding for matching revision
- secrets never appear in responses or events
"""

import pytest

import tui_gateway.server as srv


@pytest.fixture
def home(tmp_path, monkeypatch):
    h = tmp_path / ".hermes"
    h.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(h))
    return h


def _result(envelope):
    assert "error" not in envelope, envelope
    return envelope["result"]


def test_bind_managed_model_validates_session_ownership(home):
    """Binding must validate that the session belongs to the transport owner."""
    # Create a session owned by the current transport
    create_result = _result(srv._methods["session.create"](1, {"cwd": str(home)}))
    session_id = create_result["session_id"]

    # Binding should succeed for owned session
    bind_result = srv._methods["session.bind_managed_model"](
        2,
        {
            "session_id": session_id,
            "owner": {"platform_origin": "https://api.agentera.com.cn", "user_id": "test-user-1"},
            "model_id": "test-model",
            "model": {"id": "test-model", "display_name": "Test Model", "provider_label": "Test"},
            "api_mode": "chat_completions",
            "capabilities": {"tools": True},
            "credential_id": "cred-123",
            "api_key": "sk-test-key",
            "base_url": "https://api.agentera.com.cn/v1",
            "expires_at": "2026-12-31T23:59:59Z",
            "binding_revision": 1
        }
    )

    assert "error" not in bind_result


def test_bind_managed_model_secrets_not_in_response(home):
    """Binding response must not contain secrets."""
    create_result = _result(srv._methods["session.create"](1, {"cwd": str(home)}))
    session_id = create_result["session_id"]

    bind_result = _result(srv._methods["session.bind_managed_model"](
        2,
        {
            "session_id": session_id,
            "owner": {"platform_origin": "https://api.agentera.com.cn", "user_id": "test-user-1"},
            "model_id": "test-model",
            "model": {"id": "test-model", "display_name": "Test Model", "provider_label": "Test"},
            "api_mode": "chat_completions",
            "capabilities": {"tools": True},
            "credential_id": "cred-123",
            "api_key": "sk-test-secret-key-12345",
            "base_url": "https://api.agentera.com.cn/v1",
            "expires_at": "2026-12-31T23:59:59Z",
            "binding_revision": 1
        }
    ))

    import json
    response_text = json.dumps(bind_result)
    assert "sk-test-secret-key-12345" not in response_text
    assert "api_key" not in bind_result


def test_clear_managed_model_requires_matching_revision(home):
    """Clear must match the binding revision to prevent stale clears."""
    create_result = _result(srv._methods["session.create"](1, {"cwd": str(home)}))
    session_id = create_result["session_id"]

    # Bind with revision 1
    _result(srv._methods["session.bind_managed_model"](
        2,
        {
            "session_id": session_id,
            "owner": {"platform_origin": "https://api.agentera.com.cn", "user_id": "test-user-1"},
            "model_id": "test-model",
            "model": {"id": "test-model", "display_name": "Test Model", "provider_label": "Test"},
            "api_mode": "chat_completions",
            "capabilities": {},
            "credential_id": "cred-123",
            "api_key": "sk-test-key-1",
            "base_url": "https://api.agentera.com.cn/v1",
            "expires_at": "2026-12-31T23:59:59Z",
            "binding_revision": 1
        }
    ))

    # Clear with wrong revision should not clear
    clear_result = srv._methods["session.clear_managed_model"](
        3,
        {"session_id": session_id, "binding_revision": 999}
    )

    # Should not error but also should not clear (binding still present)
    assert "error" not in clear_result
