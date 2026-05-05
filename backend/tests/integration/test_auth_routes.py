from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from jose import jwt

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.main import app

TEST_PASSWORD = f"AtlasAuthTestPwd-{uuid4().hex}"
settings = get_settings()


def _register(client, email: str = "auth-routes@test.com"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Auth Routes",
            "password": TEST_PASSWORD,
        },
    )


def test_register_duplicate_email_returns_400(client):
    first = _register(client, "duplicate@test.com")
    assert first.status_code == 201

    second = _register(client, "duplicate@test.com")
    assert second.status_code == 400


def test_login_invalid_credentials_returns_401(client):
    _register(client, "invalid-login@test.com")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "invalid-login@test.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_refresh_invalid_token_returns_401(client):
    client.cookies.set("refresh_token", "not-a-jwt")

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"


def test_refresh_missing_sub_returns_401(client):
    payload = {"exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp())}
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    client.cookies.set("refresh_token", token)

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"


def test_refresh_unknown_user_returns_401(client):
    payload = {
        "sub": "999999",
        "type": "refresh",
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    client.cookies.set("refresh_token", token)

    response = client.post("/api/v1/auth/refresh")

    # Sin registro previo en BD el token nunca fue emitido por el sistema:
    # respondemos genérico para no filtrar existencia del usuario.
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"


def test_refresh_expired_token_returns_401(client):
    payload = {
        "sub": "1",
        "exp": int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp()),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    client.cookies.set("refresh_token", token)

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token expired"


def test_logout_invalid_token_returns_401_when_user_dependency_overridden(client):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    try:
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": "Bearer not-a-jwt"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_login_emits_refresh_cookie_and_rotation_revokes_previous(client):
    """Verifica el flujo completo: login persiste refresh, refresh rota e invalida el anterior."""
    register = _register(client, email="rotation@test.com")
    assert register.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "rotation@test.com", "password": TEST_PASSWORD},
    )
    assert login.status_code == 200

    first_refresh = client.cookies.get("refresh_token")
    assert first_refresh, "Login debe emitir cookie refresh_token"

    # Primera rotación: emite uno nuevo y revoca el anterior.
    rotated = client.post("/api/v1/auth/refresh")
    assert rotated.status_code == 200
    second_refresh = client.cookies.get("refresh_token")
    assert second_refresh and second_refresh != first_refresh

    # Reutilizar el primero (ya revocado) debe fallar con detección de reuso.
    client.cookies.set("refresh_token", first_refresh)
    reused = client.post("/api/v1/auth/refresh")
    assert reused.status_code == 401
    assert reused.json()["detail"] == "Refresh token reuse detected"

    # Tras detectar reuso, el segundo (que era válido) también queda revocado.
    client.cookies.set("refresh_token", second_refresh)
    after_reuse = client.post("/api/v1/auth/refresh")
    assert after_reuse.status_code == 401

