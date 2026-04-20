from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.base import get_db
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.services.auth_service import authenticate_user, create_user

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def register(payload: UserCreate, db: Annotated[Session, Depends(get_db)]) -> UserRead:
    try:
        user = create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return user


@router.post("/login", responses={401: {"description": "Unauthorized"}})
def login(payload: UserLogin, db: Annotated[Session, Depends(get_db)]) -> Token:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token)
