from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.revoked_token import RevokedToken
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import (
    authenticate_user,
    create_user,
    is_access_token_revoked,
    revoke_access_token,
    update_user,
)

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


def test_update_user_updates_profile_fields_and_password(db_session):
    user = create_user(
        db_session,
        UserCreate(email="profile@test.com", full_name="Profile User", password=TEST_PASSWORD),
    )

    updated = update_user(
        db_session,
        user,
        UserUpdate(
            full_name="Updated Profile",
            email="updated-profile@test.com",
            current_password=TEST_PASSWORD,
            new_password="UpdatedPwd123!",
        ),
    )

    assert updated.full_name == "Updated Profile"
    assert updated.email == "updated-profile@test.com"
    assert authenticate_user(db_session, "updated-profile@test.com", "UpdatedPwd123!") is not None
    assert authenticate_user(db_session, "profile@test.com", TEST_PASSWORD) is None


def test_update_user_rejects_conflicting_email(db_session):
    user = create_user(
        db_session,
        UserCreate(email="owner@test.com", full_name="Owner", password=TEST_PASSWORD),
    )
    create_user(
        db_session,
        UserCreate(email="taken@test.com", full_name="Taken", password=TEST_PASSWORD),
    )

    with pytest.raises(ValueError, match="Email already in use"):
        update_user(db_session, user, UserUpdate(email="taken@test.com"))


def test_update_user_requires_current_password_when_setting_new_one(db_session):
    user = create_user(
        db_session,
        UserCreate(email="password-check@test.com", full_name="Password Check", password=TEST_PASSWORD),
    )

    with pytest.raises(ValueError, match="current_password is required"):
        update_user(db_session, user, UserUpdate(new_password="UpdatedPwd123!"))


def test_update_user_rejects_incorrect_current_password(db_session):
    user = create_user(
        db_session,
        UserCreate(email="bad-current@test.com", full_name="Bad Current", password=TEST_PASSWORD),
    )

    with pytest.raises(ValueError, match="Incorrect current password"):
        update_user(
            db_session,
            user,
            UserUpdate(current_password="wrong-password", new_password="UpdatedPwd123!"),
        )


def test_revoke_access_token_normalizes_naive_expiration_and_is_idempotent(db_session):
    token = "revocable-access-token"
    naive_expiration = datetime.now() + timedelta(minutes=5)

    revoke_access_token(db_session, token, naive_expiration)
    revoke_access_token(db_session, token, naive_expiration)

    revoked_tokens = db_session.scalars(select(RevokedToken)).all()

    assert len(revoked_tokens) == 1
    expected_expiration_utc = naive_expiration.astimezone().astimezone(timezone.utc).replace(tzinfo=None)
    assert abs((revoked_tokens[0].expires_at - expected_expiration_utc).total_seconds()) < 1
    assert is_access_token_revoked(db_session, token) is True


def test_is_access_token_revoked_cleans_expired_tokens(db_session):
    expired_token = "expired-access-token"
    active_token = "active-access-token"

    revoke_access_token(db_session, expired_token, datetime.now(timezone.utc) - timedelta(minutes=1))
    revoke_access_token(db_session, active_token, datetime.now(timezone.utc) + timedelta(minutes=5))

    assert is_access_token_revoked(db_session, expired_token) is False
    assert is_access_token_revoked(db_session, active_token) is True

    remaining_hashes = {row.token_hash for row in db_session.scalars(select(RevokedToken)).all()}
    assert len(remaining_hashes) == 1
