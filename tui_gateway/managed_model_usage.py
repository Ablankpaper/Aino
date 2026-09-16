"""Begin/end correlation for a desktop turn without changing its prompt."""

from uuid import NAMESPACE_OID, uuid4, uuid5

from agent.auxiliary_billing_scope import BillingScope, ManagedCredential, billing_scope


def usage_session_id(session):
    from tui_gateway import server
    from tui_gateway.managed_model_runtime import ManagedBindingError
    session_key = session["session_key"]
    with server._session_db(session) as db:
        if db is None:
            raise ManagedBindingError("managed_auth_unavailable")
        lineage = db.get_compression_lineage(session_key)
    return str(uuid5(NAMESPACE_OID, lineage[0] if lineage else session_key))


def begin_managed_usage(agent):
    key = getattr(agent, "api_key", None)
    scope = (BillingScope("aino", key.user_id, key.session_id, str(uuid4()), "chat")
             if isinstance(key, ManagedCredential) else None)
    return billing_scope.set(scope)


def end_managed_usage(token):
    billing_scope.reset(token)


def current_usage_metadata():
    scope = billing_scope.get()
    if not scope or scope.source != "aino":
        return {}
    return {"billing": {"source": scope.source, "user_id": scope.user_id,
                        "session_id": scope.session_id, "turn_id": scope.turn_id,
                        "status": "pending", **scope.calls.snapshot()}}
