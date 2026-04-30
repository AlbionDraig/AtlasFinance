from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_token_from_bearer_or_cookie
from app.api.error_handlers import raise_bad_request_from_value_error
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import create_access_token, create_refresh_token
from app.db.base import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserRead, UserUpdate
from app.services.auth_service import (
    authenticate_user,
    create_user,
    revoke_access_token,
    update_user,
)
from app.services.refresh_token_service import (
    find_active_refresh_token,
    is_expired,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token,
    store_refresh_token,
)

settings = get_settings()

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
@limiter.limit(settings.rate_limit_register)
def register(
    request: Request,  # noqa: ARG001  required by slowapi
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
) -> UserRead:
    """Register a new user with hashed password."""
    try:
        user = create_user(db, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
    return UserRead.model_validate(user)


@router.post("/login", responses={401: {"description": "Unauthorized"}})
@limiter.limit(settings.rate_limit_login)
def login(
    request: Request,  # noqa: ARG001
    payload: UserLogin,
    db: Annotated[Session, Depends(get_db)],
    response: Response,
) -> Token:
    """Authenticate user, set cookie, and return access token payload."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(subject=user.id, response=response)
    # Emite refresh token y persiste su hash para habilitar rotación.
    refresh_jwt, refresh_exp = create_refresh_token(subject=user.id, response=response)
    store_refresh_token(db, user.id, refresh_jwt, refresh_exp)
    return Token(access_token=access_token)


@router.get("/me")
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    """Return the authenticated user profile."""
    return UserRead.model_validate(current_user)


@router.patch("/me", responses={400: {"description": "Bad Request"}})
def update_current_user(
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserRead:
    """Update the authenticated user's profile fields."""
    try:
        user = update_user(db, current_user, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
    return UserRead.model_validate(user)


@router.post("/refresh", responses={401: {"description": "Unauthorized"}})
@limiter.limit(settings.rate_limit_refresh)
def refresh_token(
    request: Request,  # noqa: ARG001
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str, Cookie(alias="refresh_token")],
) -> Token:
    """Validate refresh token and issue a new access token payload."""
    try:
        # Refresh flow trusts HttpOnly cookie and rotates both tokens.
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Verifica el hash en BD: detecta tokens nunca emitidos o ya revocados.
        record = find_active_refresh_token(db, token)
        if record is None or record.user_id != int(user_id):
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if is_expired(record):
            raise HTTPException(status_code=401, detail="Refresh token expired")
        if record.revoked:
            # Reuso detectado: el token ya fue rotado antes. Asume robo y revoca todos.
            revoke_all_user_refresh_tokens(db, record.user_id)
            raise HTTPException(status_code=401, detail="Refresh token reuse detected")

        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Rotación: revoca el actual y emite uno nuevo.
        revoke_refresh_token(db, record)
        access_token = create_access_token(subject=user.id, response=response)
        new_refresh, new_exp = create_refresh_token(subject=user.id, response=response)
        store_refresh_token(db, user.id, new_refresh, new_exp)
        return Token(access_token=access_token)
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Refresh token expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, responses={401: {"description": "Unauthorized"}})
def logout(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str, Depends(get_token_from_bearer_or_cookie)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Invalidate the current access token so it cannot be reused after logout."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        exp = payload.get("exp")
        if exp is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
        revoke_access_token(db, token, expires_at)
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    # Revoca todos los refresh tokens del usuario para invalidar la sesión completa.
    revoke_all_user_refresh_tokens(db, current_user.id)
    response.delete_cookie(key="access_token", path="/")
    # refresh_token cookie con path acotado a /api/v1/auth para coincidir con set_cookie.
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
