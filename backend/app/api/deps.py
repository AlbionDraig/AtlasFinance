from datetime import datetime, timezone
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import get_db
from app.models.user import User
from app.services.auth_service import is_access_token_revoked

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login", auto_error=False)


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_token_from_bearer_or_cookie(
    bearer_token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    cookie_token: Annotated[str | None, Cookie(alias="access_token")] = None,
) -> str:
    """Return auth token from cookie or fallback Authorization header."""
    token = cookie_token or bearer_token
    if not token:
        raise _credentials_exception()
    return token


def get_current_user(
    token: Annotated[str, Depends(get_token_from_bearer_or_cookie)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exception = _credentials_exception()

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        exp = payload.get("exp")
        if sub is None:
            raise ValueError("sub claim is missing")
        if exp is None:
            raise ValueError("exp claim is missing")

        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise ValueError("token expired")

        if is_access_token_revoked(db, token):
            raise ValueError("token revoked")

        user_id = int(sub)
    except (JWTError, TypeError, ValueError) as exc:
        raise credentials_exception from exc

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user
