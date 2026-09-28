from types import SimpleNamespace

from app.main import app
from app.services.evaluation_service import (
    baseline_investigation,
)


def test_evaluation_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/evaluations" in paths
    assert "/api/evaluations/compare" in paths
    assert "/api/evaluations/summary" in paths
    assert "/api/evaluations/{evaluation_id}" in paths


def test_baseline_investigation_uses_no_hindsight_memory():
    incident = SimpleNamespace(
        incident_key="INC-TEST-001",
        title="Database connection pressure",
        current_error="remaining connection slots are reserved",
    )

    result = baseline_investigation(
        incident=incident,
        query="Determine the root cause.",
    )

    assert result.mode == "baseline"
    assert result.memories_used == 0
    assert result.confidence == 0.45
    assert result.reasoning_metadata["historical_memory_used"] is False