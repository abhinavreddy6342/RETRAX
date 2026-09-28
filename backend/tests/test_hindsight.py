from app.main import app


def test_hindsight_memory_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/memories" in paths
    assert "/api/memories/recall" in paths
    assert "/api/memories/reflect" in paths
    assert "/api/memories/incident-experience" in paths
    assert "/api/memories/incident-reflection" in paths


def test_hindsight_investigation_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/investigations/incidents/{incident_id}" in paths
    assert "/api/investigations/incidents/{incident_id}/comparison" in paths