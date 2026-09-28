from app.main import app


def test_learning_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/learning/incidents/{incident_id}" in paths
    assert "/api/learning/incidents/{incident_id}/status" in paths
    assert "/api/learning/incidents/{incident_id}/rebuild" in paths

    assert "/api/postmortems" in paths
    assert "/api/postmortems/incidents/{incident_id}/learn" in paths