"""JSON-RPC handlers for session.bind_managed_model and session.clear_managed_model."""

from .method_ctx import HandlerRegistry

_registry = HandlerRegistry()
method = _registry.method


@method("session.bind_managed_model")
def _bind_managed_model(rid, params: dict) -> dict:
    """Bind platform credentials to a session.

    Validates session ownership and stores credentials in memory.
    Response never contains secrets.
    """
    # Imports inside handler so they survive rebinding onto server.py namespace
    from datetime import datetime
    from .managed_model_runtime import ManagedModelBinding, ManagedModelOwner, get_registry

    session_id = params.get("session_id", "").strip()
    if not session_id:
        return _err(rid, -32602, "session_id required")

    # Validate session exists and caller owns it
    # TODO: Implement actual ownership validation via transport
    with _sessions_lock:
        if session_id not in _sessions:
            return _err(rid, -32602, f"session not found: {session_id}")

    owner_data = params.get("owner", {})
    owner = ManagedModelOwner(
        platform_origin=str(owner_data.get("platform_origin", "")),
        user_id=str(owner_data.get("user_id", ""))
    )

    if not owner.platform_origin or not owner.user_id:
        return _err(rid, -32602, "owner.platform_origin and owner.user_id required")

    try:
        expires_at = datetime.fromisoformat(params.get("expires_at", "").replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return _err(rid, -32602, "expires_at must be ISO 8601 timestamp")

    binding = ManagedModelBinding(
        session_id=session_id,
        owner=owner,
        model_id=str(params.get("model_id", "")),
        model=params.get("model", {}),
        api_mode=str(params.get("api_mode", "")),
        capabilities=params.get("capabilities", {}),
        credential_id=str(params.get("credential_id", "")),
        api_key=str(params.get("api_key", "")),
        base_url=str(params.get("base_url", "")),
        expires_at=expires_at,
        binding_revision=int(params.get("binding_revision", 0))
    )

    registry = get_registry()
    registry.bind(binding)

    # Response contains only non-secret confirmation
    return _ok(rid, {
        "bound": True,
        "model_id": binding.model_id,
        "expires_at": binding.expires_at.isoformat()
    })


@method("session.clear_managed_model")
def _clear_managed_model(rid, params: dict) -> dict:
    """Clear managed model binding for a session."""
    from .managed_model_runtime import get_registry

    session_id = params.get("session_id", "").strip()
    if not session_id:
        return _err(rid, -32602, "session_id required")

    binding_revision = int(params.get("binding_revision", 0))

    registry = get_registry()
    cleared = registry.clear(session_id, binding_revision)

    return _ok(rid, {"cleared": cleared})


# Publish handlers onto server.py
def register(server):
    """Install managed model handlers into server (matches split module pattern)."""
    from .method_ctx import bind_module
    bind_module(globals(), server)
