from app.main import app


def test_incident_api_is_registered():
    paths = app.openapi()["paths"]

    assert "/api/incidents" in paths
    assert "/api/incidents/key/{incident_key}" in paths
    assert "/api/incidents/{incident_id}" in paths
    assert "/api/incidents/{incident_id}/resolve" in paths
    assert "/api/incidents/{incident_id}/reopen" in paths