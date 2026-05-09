"""CRUD de inversiones del usuario."""
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.investment import Investment
from app.repositories.investment_entities import InvestmentEntityRepository
from app.repositories.investments import InvestmentRepository
from app.schemas.investment import InvestmentCreate, InvestmentUpdate


@dataclass
class InvestmentServiceDeps:
    """Dependency container for investment service repositories."""

    entities: InvestmentEntityRepository
    investments: InvestmentRepository


def build_investment_service_deps(db: Session) -> InvestmentServiceDeps:
    """Build default repository dependencies for investment services."""
    return InvestmentServiceDeps(
        entities=InvestmentEntityRepository(db),
        investments=InvestmentRepository(db),
    )


def create_investment(
    db: Session,
    user_id: int,
    payload: InvestmentCreate,
    deps: InvestmentServiceDeps | None = None,
) -> Investment:
    """Registrar una nueva inversión asociada a una entidad propia del usuario."""
    resolved_deps = deps or build_investment_service_deps(db)

    if (
        resolved_deps.entities.get_owned(user_id, payload.investment_entity_id)
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
    return resolved_deps.investments.add(investment)


def list_investments(
    db: Session,
    user_id: int,
    deps: InvestmentServiceDeps | None = None,
) -> list[Investment]:
    """Listar todas las inversiones del usuario."""
    resolved_deps = deps or build_investment_service_deps(db)
    return resolved_deps.investments.list_by_user(user_id)


def get_investment(
    db: Session,
    user_id: int,
    investment_id: int,
    deps: InvestmentServiceDeps | None = None,
) -> Investment:
    """Recuperar una inversión propiedad del usuario."""
    resolved_deps = deps or build_investment_service_deps(db)
    investment = resolved_deps.investments.get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")
    return investment


def update_investment(
    db: Session,
    user_id: int,
    investment_id: int,
    payload: InvestmentUpdate,
    deps: InvestmentServiceDeps | None = None,
) -> Investment:
    """Actualizar metadatos de una inversión propiedad del usuario."""
    resolved_deps = deps or build_investment_service_deps(db)
    investment = resolved_deps.investments.get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")

    if (
        resolved_deps.entities.get_owned(user_id, payload.investment_entity_id)
        is None
    ):
        raise ValueError("Invalid investment entity for user")

    investment.name = payload.name
    investment.instrument_type = payload.instrument_type
    investment.current_value = payload.current_value
    investment.investment_entity_id = payload.investment_entity_id
    investment.started_at = payload.started_at
    return resolved_deps.investments.commit_refresh(investment)


def delete_investment(
    db: Session,
    user_id: int,
    investment_id: int,
    deps: InvestmentServiceDeps | None = None,
) -> None:
    """Eliminar una inversión propiedad del usuario."""
    resolved_deps = deps or build_investment_service_deps(db)
    investment = resolved_deps.investments.get_owned(user_id, investment_id)
    if investment is None:
        raise ValueError("Investment not found")
    resolved_deps.investments.delete(investment)
