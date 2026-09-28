from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.agent.orchestrator import IncidentIntelligenceAgent
from app.agent.schemas import AgentChatRequest
from app.db.session import get_db
from app.main import app


def test_investigation_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/investigations/incidents/{incident_id}" in paths
    assert "/api/investigations/incidents/{incident_id}/actions" in paths
    assert "/api/investigations/incidents/{incident_id}/trajectory" in paths
    assert "/api/investigations/incidents/{incident_id}/comparison" in paths
    assert "/api/investigations/incidents/{incident_id}/chat" in paths


def test_chat_request_rejects_blank_messages_and_unbounded_history():
    with pytest.raises(ValidationError):
        AgentChatRequest(message="   ")

    with pytest.raises(ValidationError):
        AgentChatRequest(
            message="What happened?",
            history=[{"role": "user", "content": "Earlier question"}] * 13,
        )


def test_chat_endpoint_scopes_incident_to_organization():
    class EmptyQuery:
        def filter(self, *_args):
            return self

        def first(self):
            return None

    class EmptyDatabase:
        def query(self, *_args):
            return EmptyQuery()

    app.dependency_overrides[get_db] = EmptyDatabase
    try:
        response = TestClient(app).post(
            "/api/investigations/incidents/not-owned/chat",
            params={"organization_id": "different-organization"},
            json={"message": "What is happening?"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_uses_hindsight_and_returns_memory_provenance():
    class FakeHindsight:
        async def recall(self, **kwargs):
            assert kwargs["organization_id"] == "org-1"
            assert kwargs["service_id"] == "payments"
            return {"results": [{
                "id": "memory-1",
                "type": "incident",
                "score": 0.87,
                "text": "INC-2026-0922: inspect active connections before changing database limits.",
            }]}

        async def reflect(self, **_kwargs):
            return {"text": "Inspect active connections before changing database limits."}

    incident = SimpleNamespace(
        id="incident-1",
        incident_key="INC-2026-0928-001",
        title="Payments API connection pressure",
        description="Database connection exhaustion is affecting requests.",
        environment="production",
        current_error="remaining connection slots are reserved",
        impact="Elevated request failures.",
        root_cause=None,
        resolution_summary=None,
        status="investigating",
        severity="SEV-1",
        service_id="payments",
        organization_id="org-1",
    )
    agent = IncidentIntelligenceAgent()
    agent.hindsight = FakeHindsight()

    response = await agent.chat(
        incident=incident,
        message="What worked previously?",
        history=[],
        investigation_context="No actions recorded.",
    )

    assert response.historical_memory_status == "available"
    assert response.memories_used == 1
    assert response.sources[0].source_incident_key == "INC-2026-0922"


@pytest.mark.asyncio
async def test_chat_reports_historical_memory_unavailable_without_fabricating():
    class OfflineHindsight:
        async def recall(self, **_kwargs):
            raise RuntimeError("Hindsight is offline")

        async def reflect(self, **_kwargs):
            raise RuntimeError("Hindsight is offline")

    incident = SimpleNamespace(
        id="incident-1",
        incident_key="INC-2026-0928-001",
        title="Payments API connection pressure",
        description="Database connection exhaustion is affecting requests.",
        environment="production",
        current_error="remaining connection slots are reserved",
        impact="Elevated request failures.",
        root_cause=None,
        resolution_summary=None,
        status="investigating",
        severity="SEV-1",
        service_id="payments",
        organization_id="org-1",
    )
    agent = IncidentIntelligenceAgent()
    agent.hindsight = OfflineHindsight()

    response = await agent.chat(
        incident=incident,
        message="What happened before?",
        history=[],
        investigation_context="Recorded actions: 1; successful: 0; failed: 1.",
    )

    assert response.historical_memory_status == "unavailable"
    assert "Historical memory is unavailable" in response.answer
    assert "Recorded failure signal" in response.answer
    assert response.sources == []
    assert response.recommended_actions == []
