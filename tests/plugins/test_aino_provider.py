"""Test aino provider plugin registration and behavior."""
from providers import get_provider_profile


def test_aino_provider_registered():
    """Aino provider is discoverable in the provider registry."""
    aino = get_provider_profile("aino")
    assert aino is not None


def test_aino_provider_profile():
    """Aino remains a runtime profile without masquerading as pasted-key setup."""
    aino = get_provider_profile("aino")
    assert aino is not None
    assert aino.name == "aino"
    assert aino.display_name == "Aino"
    assert "session-managed" in aino.description
    assert aino.api_mode == "chat_completions"
    assert aino.auth_type == "session_managed"
    assert aino.env_vars == ()  # No environment credentials
    assert not aino.supports_health_check
    assert aino.aliases == ()


def test_aino_provider_fetch_models_returns_none():
    """Aino provider does not support fetch_models (catalog comes from desktop bridge)."""
    aino = get_provider_profile("aino")
    result = aino.fetch_models(api_key="test-key", base_url="https://example.com")
    assert result is None
