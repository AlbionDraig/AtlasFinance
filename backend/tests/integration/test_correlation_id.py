"""Tests para correlation ID + logging estructurado."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_request_id_generated_when_absent():
    response = client.get("/health")
    assert response.status_code == 200
    correlation = response.headers.get("X-Request-ID")
    assert correlation
    # UUID4 hex tiene 32 caracteres.
    assert len(correlation) == 32


def test_request_id_propagated_when_provided():
    custom = "test-correlation-1234"
    response = client.get("/health", headers={"X-Request-ID": custom})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom
