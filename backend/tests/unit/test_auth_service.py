import pytest

from app.schemas.user import UserCreate
from app.services.auth_service import authenticate_user, create_user


def test_create_and_authenticate_user(db_session):
    payload = UserCreate(email="user@test.com", full_name="Test User", password="StrongPass123")
    user = create_user(db_session, payload)

    assert user.id is not None

    auth_ok = authenticate_user(db_session, "user@test.com", "StrongPass123")
    auth_fail = authenticate_user(db_session, "user@test.com", "wrong")

    assert auth_ok is not None
    assert auth_fail is None


def test_create_user_duplicate_email(db_session):
    payload = UserCreate(email="dup@test.com", full_name="Dup User", password="StrongPass123")
    create_user(db_session, payload)

    with pytest.raises(ValueError):
        create_user(db_session, payload)
