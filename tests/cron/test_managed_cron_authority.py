"""A desktop lease is never an unattended scheduler credential."""

import json
from uuid import uuid4

import pytest


def test_cron_rejects_platform_authority_before_persisting(tmp_path):
    from cron.jobs import create_job, list_jobs
    from tools.cronjob_tools import registry
    from agent.auxiliary_billing_scope import BillingScope, billing_scope

    token = billing_scope.set(BillingScope("aino", "fixture-user", str(uuid4()), str(uuid4()), "chat"))
    try:
        reply = json.loads(registry._tools["cronjob_manage"].handler({
            "action": "create", "schedule": "every 30m", "prompt": "fixture", "paused": True}))
        assert reply.get("success") is False
        assert "BYOK" in reply["error"]
        assert list_jobs(include_disabled=True) == []
    finally:
        billing_scope.reset(token)
    with pytest.raises(ValueError, match="BYOK"):
        create_job(prompt="fixture", schedule="every 30m", provider="aino", paused=True)
    assert list_jobs(include_disabled=True) == []
