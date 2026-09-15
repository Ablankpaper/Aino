"""Platform managed model runtime binding storage.

Stores short-lived platform credentials in memory per session/owner, never persisted.
Gateway validates session ownership before accepting bindings.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class ManagedModelOwner:
    """Identity of the platform account owning a managed model binding."""
    platform_origin: str
    user_id: str


@dataclass
class ManagedModelBinding:
    """In-memory platform credential binding for a session."""
    session_id: str
    owner: ManagedModelOwner
    model_id: str
    model: dict
    api_mode: str
    capabilities: dict
    credential_id: str
    api_key: str
    base_url: str
    expires_at: datetime
    binding_revision: int


class ManagedModelRegistry:
    """In-memory registry of managed model bindings."""

    def __init__(self):
        self._bindings: dict[str, ManagedModelBinding] = {}

    def bind(self, binding: ManagedModelBinding) -> None:
        """Store a binding for a session."""
        self._bindings[binding.session_id] = binding

    def get(self, session_id: str) -> Optional[ManagedModelBinding]:
        """Retrieve binding for a session."""
        return self._bindings.get(session_id)

    def clear(self, session_id: str, binding_revision: int) -> bool:
        """Clear binding if revision matches."""
        binding = self._bindings.get(session_id)
        if binding and binding.binding_revision == binding_revision:
            del self._bindings[session_id]
            return True
        return False

    def clear_session(self, session_id: str) -> None:
        """Unconditionally clear binding for a session (on session close)."""
        self._bindings.pop(session_id, None)


# Module-level registry instance
_managed_model_registry = ManagedModelRegistry()


def get_registry() -> ManagedModelRegistry:
    """Get the global managed model registry."""
    return _managed_model_registry
