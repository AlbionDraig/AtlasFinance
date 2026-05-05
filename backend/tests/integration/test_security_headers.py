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
    # Hacemos strip() en cada directiva antes de particionar para manejar
    # correctamente los espacios después de ";" en el valor de la cabecera.
    directives = {}
    for raw in csp.split(";"):
        part = raw.strip()
        if not part:
            continue
        if " " in part:
            key, _, val = part.partition(" ")
            directives[key] = val.strip()
        else:
            directives[part] = ""
    script_sources = set(directives.get("script-src", "").split())
    style_sources = set(directives.get("style-src", "").split())
    assert any(source == "https://cdn.jsdelivr.net" for source in script_sources)
    assert any(source == "https://cdn.jsdelivr.net" for source in style_sources)


def test_security_headers_present_on_openapi():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
