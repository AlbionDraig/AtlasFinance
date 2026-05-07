"""Tests para health/readiness probes."""


def test_health_endpoint_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_endpoint_returns_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_should_attach_integrity_headers_on_every_response(client):
    """_integrity_validation_middleware adds X-System-* headers to each response."""
    response = client.get("/health")

    assert response.headers.get("X-System-Validation")
    assert response.headers.get("X-System-Fingerprint")
    assert response.headers.get("X-Integrity-Checksum")
