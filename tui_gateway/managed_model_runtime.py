"""Short-lived, transport-delegated model authority; never persisted with sessions."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import secrets
import threading
import time


class ManagedBindingError(ValueError):
    pass


@dataclass(frozen=True)
class ManagedModelOwner:
    platform_origin: str
    user_id: str


@dataclass(frozen=True)
class ManagedModelBinding:
    session_id: str
    owner: ManagedModelOwner
    model_id: str
    model: str
    api_mode: str
    capabilities: dict
    credential_id: str
    api_key: str = field(repr=False)
    base_url: str
    expires_at: datetime
    binding_revision: int


@dataclass
class _Authority:
    session: dict = field(repr=False)
    peer: object = field(repr=False)
    owner: ManagedModelOwner
    model_id: str
    revision: int
    ticket: str = field(repr=False)
    deadline: float
    controller: object = field(default=None, repr=False)
    binding: ManagedModelBinding | None = field(default=None, repr=False)
    timer: threading.Timer | None = field(default=None, repr=False)


def transport_principal(transport):
    identity = getattr(transport, "auth_identity", None)
    if isinstance(identity, dict):
        if identity.get("read_only") or identity.get("role") in {"viewer", "read_only"}:
            raise ManagedBindingError("managed_binding_forbidden")
        scopes = identity.get("scopes")
        if scopes is not None and (not isinstance(scopes, (list, tuple, set))
                                   or not all(isinstance(scope, str) for scope in scopes)
                                   or not ({"write", "session:write", "*"} & set(scopes))):
            raise ManagedBindingError("managed_binding_forbidden")
        if not identity.get("user_id") or not identity.get("provider"):
            raise ManagedBindingError("managed_binding_forbidden")
        return identity["provider"], identity["user_id"]
    # Legacy token-auth WS peers have no identity payload. Their exact session
    # transport issues a one-time capability; a public session id never suffices.
    return None


def _interrupt(binding, session):
    if not binding or not session.get("running"):
        return
    from . import server
    with server._sessions_lock:
        if server._sessions.get(binding.session_id) is not session:
            return
        with get_registry()._lock:
            current = get_registry()._active.get(binding.session_id)
            if current and current.revision != binding.binding_revision:
                return
        server._interrupt_session_turn(binding.session_id, session)


class ManagedModelRegistry:
    def __init__(self):
        self._lock = threading.RLock()
        self._pending: dict[str, _Authority] = {}
        self._active: dict[str, _Authority] = {}
        self._revision = 0

    @staticmethod
    def _cancel(a):
        if a and a.timer:
            a.timer.cancel()

    def issue(self, sid, session, peer, owner, model_id):
        with self._lock:
            self._revision += 1
            self._cancel(self._pending.pop(sid, None))
            # Renewing a lease must not interrupt the current turn or mutate
            # its prompt/history. Keep the active lease until replacement.
            a = _Authority(session, peer, owner, model_id, self._revision,
                           secrets.token_urlsafe(32), time.monotonic() + 60)
            self._pending[sid] = a
            a.timer = threading.Timer(60, self._expire_pending, args=(sid, a))
            a.timer.daemon = True
            a.timer.start()
            return a.ticket

    def _expire_pending(self, sid, a):
        with self._lock:
            if self._pending.get(sid) is a:
                self._pending.pop(sid)

    def claim(self, sid, session, peer, ticket, owner, model_id):
        with self._lock:
            a = self._pending.get(sid)
            if (not a or a.session is not session or a.peer is not session.get("transport")
                    or session.get("_closing") or a.deadline <= time.monotonic()
                    or not a.ticket or not secrets.compare_digest(a.ticket, ticket)
                    or a.owner != owner or a.model_id != model_id
                    or transport_principal(a.peer) != transport_principal(peer)):
                raise ManagedBindingError("managed_binding_forbidden")
            a.ticket = ""
            a.controller = peer
            return a.revision

    def bind(self, binding, session, peer):
        sid = binding.session_id
        with self._lock:
            a = self._pending.get(sid)
            if (not a or a.session is not session or a.peer is not session.get("transport")
                    or session.get("_closing") or a.controller is not peer
                    or a.deadline <= time.monotonic()
                    or binding.binding_revision != a.revision or binding.owner != a.owner
                    or binding.model_id != a.model_id):
                raise ManagedBindingError("managed_binding_stale")
            seconds = (binding.expires_at - datetime.now(timezone.utc)).total_seconds()
            if not 0 < seconds <= 3605:
                raise ManagedBindingError("managed_binding_expired")
            previous = self._active.get(sid)
            if session.get("running") and (not previous or
                    previous.owner != a.owner or previous.model_id != a.model_id):
                raise ManagedBindingError("managed_binding_busy")
            self._cancel(previous)
            self._cancel(a)
            self._pending.pop(sid)
            a.binding = binding
            self._active[sid] = a
            a.timer = threading.Timer(seconds, self._expire, args=(sid, a))
            a.timer.daemon = True
            a.timer.start()

    def _expire(self, sid, a):
        with self._lock:
            if self._active.get(sid) is not a:
                return
            self._active.pop(sid)
        # Never call session/agent code holding the registry lock.
        _interrupt(a.binding, a.session)

    def get(self, session_id, session=None):
        expired = None
        with self._lock:
            a = self._active.get(session_id)
            if not a:
                return None
            if (a.session.get("_closing") or a.peer is not a.session.get("transport")
                    or (session is not None and session is not a.session)
                    or a.binding.expires_at <= datetime.now(timezone.utc)):
                expired = self._active.pop(session_id)
                self._cancel(expired)
            else:
                return a.binding
        _interrupt(expired.binding, expired.session)
        return None

    def clear(self, session_id, binding_revision, peer):
        removed = []
        with self._lock:
            for pool in (self._pending, self._active):
                a = pool.get(session_id)
                if not a or a.revision != binding_revision:
                    continue
                if peer is not a.controller and peer is not a.peer:
                    raise ManagedBindingError("managed_binding_forbidden")
                removed.append(pool.pop(session_id))
                self._cancel(a)
        for a in removed:
            _interrupt(a.binding, a.session)
        return bool(removed)

    def clear_session(self, session_id):
        with self._lock:
            for pool in (self._pending, self._active):
                self._cancel(pool.pop(session_id, None))

    def detach_transport(self, peer):
        removed = []
        with self._lock:
            for pool in (self._pending, self._active):
                for sid, a in list(pool.items()):
                    if peer is a.peer or peer is a.controller:
                        removed.append(pool.pop(sid))
                        self._cancel(a)
        return removed

    @staticmethod
    def interrupt_detached(removed):
        for a in removed:
            _interrupt(a.binding, a.session)

    def disconnect(self, peer):
        self.interrupt_detached(self.detach_transport(peer))


_managed_model_registry = ManagedModelRegistry()


def get_registry():
    return _managed_model_registry
