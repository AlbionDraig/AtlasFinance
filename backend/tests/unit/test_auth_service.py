import pytest

from app.schemas.user import UserCreate
from app.services.auth_service import authenticate_user, create_user

TEST_PASSWORD = "AtlasFinanceTestPwd123!"


def test_create_and_authenticate_user(db_session):
    payload = UserCreate(email="user@test.com", full_name="Test User", password=TEST_PASSWORD)
    user = create_user(db_session, payload)

    assert user.id is not None

    auth_ok = authenticate_user(db_session, "user@test.com", TEST_PASSWORD)
    auth_fail = authenticate_user(db_session, "user@test.com", "wrong")

    assert auth_ok is not None
    assert auth_fail is None


def test_create_user_duplicate_email(db_session):
    payload = UserCreate(email="dup@test.com", full_name="Dup User", password=TEST_PASSWORD)
    create_user(db_session, payload)

    with pytest.raises(ValueError):
        create_user(db_session, payload)
