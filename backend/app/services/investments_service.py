"""CRUD de inversiones del usuario."""
from sqlalchemy.orm import Session

from app.models.investment import Investment
from app.repositories.investment_entities import InvestmentEntityRepository
from app.repositories.investments import InvestmentRepository
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


def create_investment(db: Session, user_id: int, payload: InvestmentCreate) -> Investment:
    """Registrar una nueva inversión asociada a una entidad propia del usuario."""
    if (
        InvestmentEntityRepository(db).get_owned(user_id, payload.investment_entity_id)
        is None
    ):
        raise ValueError("Invalid investment entity for user")

    investment = Investment(
        name=payload.name,
        instrument_type=payload.instrument_type,
        amount_invested=payload.amount_invested,
        current_value=payload.current_value,
        currency=payload.currency,
        investment_entity_id=payload.investment_entity_id,
        started_at=payload.started_at,
        user_id=user_id,
    )
    return InvestmentRepository(db).add(investment)


def list_investments(db: Session, user_id: int) -> list[Investment]:
    """Listar todas las inversiones del usuario."""
    return InvestmentRepository(db).list_by_user(user_id)


def get_investment(db: Session, user_id: int, investment_id: int) -> Investment:
    """Recuperar una inversión propiedad del usuario."""
    investment = InvestmentRepository(db).get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")
    return investment


def update_investment(
    db: Session, user_id: int, investment_id: int, payload: InvestmentUpdate
) -> Investment:
    """Actualizar metadatos de una inversión propiedad del usuario."""
    repo = InvestmentRepository(db)
    investment = repo.get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")

    if (
        InvestmentEntityRepository(db).get_owned(user_id, payload.investment_entity_id)
        is None
    ):
        raise ValueError("Invalid investment entity for user")

    investment.name = payload.name
    investment.instrument_type = payload.instrument_type
    investment.current_value = payload.current_value
    investment.investment_entity_id = payload.investment_entity_id
    investment.started_at = payload.started_at
    return repo.commit_refresh(investment)


def delete_investment(db: Session, user_id: int, investment_id: int) -> None:
    """Eliminar una inversión propiedad del usuario."""
    repo = InvestmentRepository(db)
    investment = repo.get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")
    repo.delete(investment)
