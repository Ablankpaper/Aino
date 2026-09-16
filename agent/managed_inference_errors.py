"""Recoverable managed failures without replaying a paid turn or tool effects."""

from agent.auxiliary_billing_scope import ManagedCredential

_CODES = {
    "DESKTOP_CREDENTIAL_EXPIRED": "managed_credential_expired",
    "DESKTOP_CREDENTIAL_REVOKED": "managed_credential_revoked",
    "DESKTOP_CREDENTIAL_SCOPE": "managed_credential_revoked",
    "DESKTOP_AUTH_UNAVAILABLE": "managed_auth_unavailable",
    "INSUFFICIENT_BALANCE": "managed_balance_unavailable",
    "SUBSCRIPTION_NOT_FOUND": "managed_balance_unavailable",
    "SUBSCRIPTION_INVALID": "managed_balance_unavailable",
    "USAGE_LIMIT_EXCEEDED": "managed_balance_unavailable",
    "API_KEY_QUOTA_EXHAUSTED": "managed_balance_unavailable",
    "insufficient_quota": "managed_balance_unavailable",
    "awaiting_managed_credentials": "managed_credential_expired",
    "managed_model_identity_mismatch": "managed_credential_revoked",
    "managed_billing_scope_mismatch": "managed_credential_revoked",
    "managed_credential_destination_mismatch": "managed_credential_revoked",
}
_MESSAGES = {
    "managed_credential_expired": "Aino model authorization expired. Reconnect the platform model before sending again.",
    "managed_credential_revoked": "Aino model authorization was revoked. Sign in and select the model again.",
    "managed_auth_unavailable": "Aino authorization is temporarily unavailable. Your conversation is preserved.",
    "managed_upstream_auth_failed": "The Aino model channel rejected authentication. Select another model or retry later.",
    "managed_balance_unavailable": "Aino balance or subscription quota is unavailable. Check your account or select another model.",
}


def managed_failure_result(agent, error, messages, api_call_count):
    if not isinstance(getattr(agent, "api_key", None), ManagedCredential):
        return None
    body = getattr(error, "body", None)
    detail = body.get("error", body) if isinstance(body, dict) else {}
    code = detail.get("code") if isinstance(detail, dict) else None
    reason = _CODES.get(code)
    cause = error
    # SDKs may wrap the local credential failure in an APIConnectionError.
    for _ in range(4):
        if cause is None or reason:
            break
        reason = _CODES.get(str(cause))
        cause = cause.__cause__
    if reason is None:
        reason = {401: "managed_upstream_auth_failed", 403: "managed_upstream_auth_failed",
                  402: "managed_balance_unavailable"}.get(getattr(error, "status_code", None))
    if reason is None:
        return None
    message = _MESSAGES[reason]
    return {"final_response": message, "error": message, "messages": messages,
            "api_calls": api_call_count, "failed": True, "completed": False,
            "failure_reason": reason, "failure_retryable": False}
