"""Pricing catalogs must be cached separately by authentication state."""

import json
from unittest.mock import MagicMock

import hermes_cli.models as models


def test_authenticated_and_anonymous_catalogs_do_not_share_cache(monkeypatch):
    models._pricing_cache.clear()
    models._pricing_cache_retry_after.clear()
    requests = []

    def fake_urlopen(req, timeout=8.0):
        auth = req.get_header("Authorization")
        requests.append(auth)
        ids = ["vendor/allowed"] if auth else ["vendor/allowed", "vendor/blocked"]
        response = MagicMock()
        response.read.return_value = json.dumps(
            {"data": [{"id": mid, "pricing": {"prompt": "0", "completion": "0"}} for mid in ids]}
        ).encode()
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        return response

    monkeypatch.setattr(models, "_urlopen_model_catalog_request", fake_urlopen)
    anonymous = models.fetch_models_with_pricing(api_key="", base_url="https://example.test")
    authenticated = models.fetch_models_with_pricing(api_key="sk-test", base_url="https://example.test")

    assert sorted(anonymous) == ["vendor/allowed", "vendor/blocked"]
    assert sorted(authenticated) == ["vendor/allowed"]
    assert requests == [None, "Bearer sk-test"]


def test_peek_cached_pricing_prefers_authenticated_catalog(monkeypatch):
    models._pricing_cache.clear()
    models._pricing_cache_retry_after.clear()
    models._pricing_cache["https://example.test"] = {"anonymous": {}}
    models._pricing_cache["https://example.test\x00auth"] = {"authenticated": {}}

    assert models.peek_cached_pricing("https://example.test/v1") == {"authenticated": {}}
