"""Local Aino account authentication RPCs used by the desktop client."""

from __future__ import annotations

import contextlib
import json
import os
import re
import threading
import time
import uuid
from pathlib import Path

from .method_ctx import HandlerRegistry, bind_module

_registry = HandlerRegistry()
method = _registry.method

_ACCOUNT_FILE = "account.json"
_CODE_TTL_SECONDS = 600
_CODE_RETRY_SECONDS = 60
_MAX_CODE_ATTEMPTS = 5
_DEV_CODE = "1234"
_ACCOUNT_LOCK = threading.RLock()
_E_IDENTIFIER, _E_CODE, _E_INVALID_CODE, _E_DISABLED, _E_RETRY, _E_STATE = 6101, 6102, 6103, 6104, 6105, 6106
_E_NAME, _E_AUTH = 6107, 6108
_IDENTIFIER_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$|^\+?[0-9][0-9\s-]{5,20}$")


def _account_path() -> Path:
    return Path(get_hermes_home()) / _ACCOUNT_FILE


def _read_state() -> dict:
    path = _account_path()
    if not path.is_file():
        return {"accounts": {}, "active_account_id": None, "authenticated": False}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as exc:
        raise RuntimeError(f"account state is unreadable: {path}") from exc
    if not isinstance(raw, dict):
        raise RuntimeError(f"account state is invalid: {path}")
    if isinstance(raw.get("account"), dict) and not isinstance(raw.get("accounts"), dict):
        account = raw["account"]
        aid = str(account.get("id") or uuid.uuid4().hex)
        raw = {"accounts": {aid: account}, "active_account_id": aid if raw.get("authenticated") else None,
               "authenticated": bool(raw.get("authenticated"))}
    accounts = raw.get("accounts")
    if accounts is None:
        raw["accounts"] = {}
    elif not isinstance(accounts, dict):
        raise RuntimeError(f"account state is invalid: {path}")
    return raw


def _write_state(state: dict) -> None:
    import tempfile
    path = _account_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(state, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp_name, path)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp_name)


def _normalize_identifier(value) -> str:
    import re
    raw = " ".join(str(value or "").strip().split())
    if "@" in raw:
        return raw.casefold()
    return re.sub(r"[\s-]", "", raw)


def _valid_identifier(identifier: str) -> bool:
    return bool(_IDENTIFIER_RE.fullmatch(identifier))


def _development_mode() -> bool:
    # The unpackaged Electron renderer sets this internal marker for local UI
    # development. Packaged builds do not, so the fixed code remains opt-in.
    if os.environ.get("HERMES_DESKTOP_DEV_SERVER"):
        return True
    path = Path(get_hermes_home()) / "config.yaml"
    try:
        import yaml
        cfg = yaml.safe_load(path.read_text(encoding="utf-8")) if path.is_file() else {}
    except (OSError, UnicodeError, ValueError, yaml.YAMLError):
        return False
    account = cfg.get("account") if isinstance(cfg, dict) else None
    return isinstance(account, dict) and account.get("dev_mode") is True


def _account_public(account: dict | None) -> dict | None:
    if not isinstance(account, dict):
        return None
    return {"id": str(account.get("id") or ""), "identifier": str(account.get("identifier") or ""),
            "display_name": str(account.get("display_name") or account.get("identifier") or "")}


def _status_payload(state: dict) -> dict:
    dev = _development_mode()
    aid = state.get("active_account_id")
    account = state.get("accounts", {}).get(str(aid)) if aid else None
    authenticated = bool(dev and state.get("authenticated") and account)
    return {"authenticated": authenticated, "account": _account_public(account) if authenticated else None,
            "mode": "development" if dev else "unconfigured",
            "capabilities": {"code_login": dev, "wechat_login": False}}


def _state_error(rid, exc):
    return _err(rid, _E_STATE, str(exc), {"reason": "state_unavailable"})


def _code_hash(code: str) -> str:
    import hashlib
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


@method("account.status")
@_registry.profile_scoped
def account_status(rid, params):
    try:
        with _ACCOUNT_LOCK:
            return _ok(rid, _status_payload(_read_state()))
    except (OSError, RuntimeError) as exc:
        return _state_error(rid, exc)


@method("account.request_code")
@_registry.profile_scoped
def account_request_code(rid, params):
    identifier = _normalize_identifier(params.get("identifier"))
    if not identifier or not _valid_identifier(identifier):
        return _err(rid, _E_IDENTIFIER, "a valid email address or phone number is required", {"reason": "invalid_identifier"})
    if not _development_mode():
        return _err(rid, _E_DISABLED, "account verification is not configured for this installation", {"reason": "development_disabled"})
    try:
        with _ACCOUNT_LOCK:
            state = _read_state(); pending = state.get("pending_code"); now = time.time()
            if isinstance(pending, dict) and pending.get("identifier") == identifier:
                retry_after = int(_CODE_RETRY_SECONDS - (now - float(pending.get("requested_at") or 0)))
                if retry_after > 0:
                    return _err(rid, _E_RETRY, "please wait before requesting another code", {"reason": "retry_cooldown", "retry_after": retry_after})
            state["pending_code"] = {"identifier": identifier, "code_hash": _code_hash(_DEV_CODE),
                                      "requested_at": now, "expires_at": now + _CODE_TTL_SECONDS, "attempts": 0}
            _write_state(state)
    except (OSError, RuntimeError) as exc:
        return _state_error(rid, exc)
    return _ok(rid, {"ok": True, "delivery": "development", "expires_in": _CODE_TTL_SECONDS, "retry_after": _CODE_RETRY_SECONDS})


@method("account.verify_code")
@_registry.profile_scoped
def account_verify_code(rid, params):
    identifier = _normalize_identifier(params.get("identifier")); code = str(params.get("code") or "").strip()
    if not identifier or not _valid_identifier(identifier):
        return _err(rid, _E_IDENTIFIER, "a valid email address or phone number is required", {"reason": "invalid_identifier"})
    if not code:
        return _err(rid, _E_CODE, "verification code is required", {"reason": "missing_code"})
    if not _development_mode():
        return _err(rid, _E_DISABLED, "account verification is not configured for this installation", {"reason": "development_disabled"})
    try:
        with _ACCOUNT_LOCK:
            state = _read_state(); pending = state.get("pending_code")
            if not isinstance(pending, dict) or pending.get("identifier") != identifier:
                return _err(rid, _E_CODE, "request a verification code first", {"reason": "missing_code"})
            if float(pending.get("expires_at") or 0) < time.time():
                state.pop("pending_code", None); _write_state(state)
                return _err(rid, _E_CODE, "verification code has expired", {"reason": "expired"})
            attempts = int(pending.get("attempts") or 0)
            if attempts >= _MAX_CODE_ATTEMPTS:
                return _err(rid, _E_INVALID_CODE, "too many verification attempts", {"reason": "attempts_exceeded"})
            if _code_hash(code) != str(pending.get("code_hash") or ""):
                pending["attempts"] = attempts + 1; _write_state(state)
                reason = "attempts_exceeded" if attempts + 1 >= _MAX_CODE_ATTEMPTS else "invalid_code"
                return _err(rid, _E_INVALID_CODE, "verification code is incorrect", {"reason": reason, "attempts_remaining": max(0, _MAX_CODE_ATTEMPTS - attempts - 1)})
            accounts = state.setdefault("accounts", {})
            account = next((item for item in accounts.values() if isinstance(item, dict) and item.get("identifier") == identifier), None)
            created = account is None
            if account is None:
                account = {"id": uuid.uuid4().hex, "identifier": identifier, "display_name": identifier, "created_at": int(time.time())}
                accounts[account["id"]] = account
            state["active_account_id"] = account["id"]; state["authenticated"] = True; state.pop("pending_code", None); _write_state(state)
            return _ok(rid, {**_status_payload(state), "created": created})
    except (OSError, RuntimeError) as exc:
        return _state_error(rid, exc)


@method("account.update_profile")
@_registry.profile_scoped
def account_update_profile(rid, params):
    import unicodedata

    try:
        with _ACCOUNT_LOCK:
            state = _read_state()
            status = _status_payload(state)
            if not status["authenticated"]:
                return _err(rid, _E_AUTH, "sign in before updating your account", {"reason": "not_authenticated"})
            value = params.get("display_name")
            name = value.strip() if isinstance(value, str) else ""
            if not 1 <= len(name) <= 32 or any(unicodedata.category(char) in {"Cc", "Cs"} for char in name):
                return _err(rid, _E_NAME, "nickname must contain 1 to 32 characters without control characters", {"reason": "invalid_display_name"})
            account = state["accounts"][state["active_account_id"]]
            account["display_name"] = name
            _write_state(state)
            return _ok(rid, _status_payload(state))
    except (OSError, RuntimeError) as exc:
        return _state_error(rid, exc)


@method("account.logout")
@_registry.profile_scoped
def account_logout(rid, params):
    try:
        with _ACCOUNT_LOCK:
            state = _read_state(); state["authenticated"] = False; state["active_account_id"] = None; state.pop("pending_code", None); _write_state(state)
        return _ok(rid, _status_payload(state))
    except (OSError, RuntimeError) as exc:
        return _state_error(rid, exc)


def register(server) -> None:
    bind_module(globals(), server, skip=("_",))
