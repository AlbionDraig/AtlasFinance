from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_token_from_bearer_or_cookie
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.base import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.services.auth_service import authenticate_user, create_user, revoke_access_token

settings = get_settings()

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def register(payload: UserCreate, db: Annotated[Session, Depends(get_db)]) -> UserRead:
    """Register a new user with hashed password."""
    try:
        user = create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return user


@router.post("/login", responses={401: {"description": "Unauthorized"}})
def login(payload: UserLogin, db: Annotated[Session, Depends(get_db)], response: Response) -> Token:
    """Authenticate user, set cookie, and return access token payload."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(subject=user.id, response=response)
    return Token(access_token=access_token)


@router.get("/me")
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    """Return the authenticated user profile."""
    return current_user


@router.post("/refresh", responses={401: {"description": "Unauthorized"}})
def refresh_token(response: Response, db: Annotated[Session, Depends(get_db)],
                  token: Annotated[str, Cookie(alias="refresh_token")]) -> Token:
    """Validate refresh token and issue a new access token payload."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Issue new access token
        access_token = create_access_token(subject=user.id, response=response)
        return Token(access_token=access_token)
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Refresh token expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str, Depends(get_token_from_bearer_or_cookie)],
    _: Annotated[User, Depends(get_current_user)],
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

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
