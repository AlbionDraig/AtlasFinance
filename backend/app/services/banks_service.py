"""CRUD de bancos del usuario."""
from sqlalchemy.orm import Session

from app.models.bank import Bank
from app.repositories.banks import BankRepository
from app.schemas.bank import BankCreate, BankUpdate
from app.services._common import ensure_country_code_exists, get_user


def create_bank(db: Session, user_id: int, payload: BankCreate) -> Bank:
    """Crear un banco propiedad del usuario autenticado."""
    get_user(db, user_id)
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    bank = Bank(name=payload.name, country_code=normalized_code, user_id=user_id)
    return BankRepository(db).add(bank)


def list_banks(db: Session, user_id: int) -> list[Bank]:
    """Listar bancos del usuario, los más recientes primero."""
    return BankRepository(db).list_by_user(user_id)


def update_bank(db: Session, user_id: int, bank_id: int, payload: BankUpdate) -> Bank:
    """Actualizar nombre y país de un banco propiedad del usuario."""
    repo = BankRepository(db)
    bank = repo.get_owned(user_id, bank_id)
    if bank is None:
        raise ValueError("Bank not found")
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    bank.name = payload.name
    bank.country_code = normalized_code
    return repo.commit_refresh(bank)


def delete_bank(db: Session, user_id: int, bank_id: int) -> None:
    """Eliminar un banco propiedad del usuario."""
    repo = BankRepository(db)
    bank = repo.get_owned(user_id, bank_id)
    if bank is None:
        raise ValueError("Bank not found")
    repo.delete(bank)
