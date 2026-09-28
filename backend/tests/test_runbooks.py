from app.main import app


def test_runbook_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/runbooks" in paths
    assert "/api/runbooks/execute" in paths
    assert "/api/runbooks/recommendations/{incident_id}" in paths
    assert "/api/runbooks/{runbook_id}" in paths
    assert "/api/runbooks/{runbook_id}/experience" in paths