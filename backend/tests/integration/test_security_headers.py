"""Tests para SecurityHeadersMiddleware sobre la app real."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_security_headers_present_on_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "Permissions-Policy" in response.headers
    assert "Content-Security-Policy" in response.headers
    # En tests environment != production: HSTS no debe estar presente.
    assert "Strict-Transport-Security" not in response.headers


def test_csp_is_strict_for_api_endpoints():
    response = client.get("/health")
    csp = response.headers["Content-Security-Policy"]
    assert "default-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp


def test_csp_is_relaxed_for_docs():
    response = client.get("/docs")
    assert response.status_code == 200
    csp = response.headers["Content-Security-Policy"]
    # En /docs necesitamos permitir scripts/styles externos para Swagger UI.
    assert "cdn.jsdelivr.net" in csp


def test_security_headers_present_on_openapi():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
