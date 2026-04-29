import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate, UserUpdate


def test_user_create_password_requires_uppercase():
    with pytest.raises(ValidationError, match="uppercase"):
        UserCreate(email="user@test.com", full_name="User Test", password="atlas123!")


def test_user_create_password_requires_number():
    with pytest.raises(ValidationError, match="number"):
        UserCreate(email="user@test.com", full_name="User Test", password="AtlasTest!")


def test_user_create_password_requires_special_character():
    with pytest.raises(ValidationError, match="special character"):
        UserCreate(email="user@test.com", full_name="User Test", password="AtlasTest1")


def test_user_update_new_password_none_is_allowed():
    payload = UserUpdate(full_name="Nuevo Nombre", new_password=None)
    assert payload.new_password is None
