"""Seed savings goals for Jane Doe covering all main UI/business states.

The script is idempotent for goals created with the configured prefix.
It removes previous seeded goals and recreates deterministic scenarios.

Usage:
    docker exec atlas-backend python scripts/seed_jane_savings_goals_states.py
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.base import SessionLocal
from app.models.account import Account
from app.models.bank import Bank
from app.models.pocket import Pocket
from app.models.savings_goal import SavingsGoal
from app.models.user import User
from app.services.savings_goals_service import list_savings_goals

EMAIL = "jane.doe@sgb.co"
GOAL_PREFIX = "seed-state::"
GOAL_TAG = "seed-state"
POCKET_NAME = "Ahorro vacaciones Europa"
POCKET_BALANCE = Decimal("320.00")
SEEDED_DISPLAY_NAMES = (
    # nombres actuales
    "Fondo de emergencia",
    "Nuevo computador",
    "Viaje a Cartagena",
    "MacBook Pro",
    "Moto eléctrica",
    "Curso de inglés",
    "Remodelación cocina",
    "Vacaciones Europa",
    # nombres legacy (anteriores al renombrado)
    "Meta seed - sin progreso",
    "Meta seed - progreso parcial 25",
    "Meta seed - urgente 90",
    "Meta seed - completada exacta",
    "Meta seed - sobrecumplida",
    "Meta seed - vence hoy",
    "Meta seed - vencida",
    "Meta seed - vinculada a bolsillo",
)


def _target_date(days_offset: int) -> datetime:
    """Build a stable target datetime at noon UTC for clear day-diff behavior."""
    base = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
    return base + timedelta(days=days_offset)


def _get_user(db: Session) -> User:
    """Fetch the demo user used by the local seeded environment."""
    user = db.scalars(select(User).where(User.email == EMAIL)).first()
    if user is None:
        raise ValueError(f"User {EMAIL} not found")
    return user


def _get_user_account(db: Session, user_id: int) -> Account:
    """Return the first account that belongs to the user."""
    account = db.scalars(
        select(Account)
        .join(Bank, Bank.id == Account.bank_id)
        .where(Bank.user_id == user_id)
        .order_by(Account.id)
    ).first()
    if account is None:
        raise ValueError("User has no accounts")
    return account


def _get_or_create_seed_pocket(db: Session, account: Account) -> Pocket:
    """Ensure a deterministic pocket exists for pocket-linked goal scenarios."""
    pocket = db.scalars(
        select(Pocket)
        .where(Pocket.account_id == account.id, Pocket.name == POCKET_NAME)
        .order_by(Pocket.id)
    ).first()

    if pocket is None:
        pocket = Pocket(
            name=POCKET_NAME,
            balance=POCKET_BALANCE,
            currency=account.currency,
            account_id=account.id,
        )
        db.add(pocket)
        db.flush()
    else:
        pocket.balance = POCKET_BALANCE

    return pocket


def _clear_previous_seeded_goals(db: Session, user_id: int) -> int:
    """Delete previously seeded savings goals by naming prefix."""
    goals = list(
        db.scalars(
            select(SavingsGoal).where(
                SavingsGoal.user_id == user_id,
                or_(
                    SavingsGoal.name.like(f"{GOAL_PREFIX}%"),
                    SavingsGoal.description.like(f"[{GOAL_TAG}]%"),
                    SavingsGoal.name.in_(SEEDED_DISPLAY_NAMES),
                ),
            )
        ).all()
    )

    for goal in goals:
        db.delete(goal)

    db.flush()
    return len(goals)


def main() -> None:
    db = SessionLocal()
    try:
        user = _get_user(db)
        account = _get_user_account(db, user.id)
        pocket = _get_or_create_seed_pocket(db, account)
        removed_count = _clear_previous_seeded_goals(db, user.id)

        scenarios = [
            {
                "code": "zero_progress",
                "display_name": "Fondo de emergencia",
                "description": "Reserva equivalente a 3 meses de gastos fijos para imprevistos.",
                "target_amount": Decimal("3000.00"),
                "current_amount": Decimal("0.00"),
                "days_offset": 150,
                "pocket_id": None,
            },
            {
                "code": "partial_25",
                "display_name": "Nuevo computador",
                "description": "Laptop para trabajo remoto y estudios.",
                "target_amount": Decimal("1200.00"),
                "current_amount": Decimal("300.00"),
                "days_offset": 45,
                "pocket_id": None,
            },
            {
                "code": "partial_90_urgent",
                "display_name": "Viaje a Cartagena",
                "description": "Vacaciones en Semana Santa con estadía de 5 noches.",
                "target_amount": Decimal("800.00"),
                "current_amount": Decimal("720.00"),
                "days_offset": 15,
                "pocket_id": None,
            },
            {
                "code": "exact_completed",
                "display_name": "MacBook Pro",
                "description": "Equipo de trabajo principal, meta completada.",
                "target_amount": Decimal("2500.00"),
                "current_amount": Decimal("2500.00"),
                "days_offset": 45,
                "pocket_id": None,
            },
            {
                "code": "over_completed",
                "display_name": "Moto el\u00e9ctrica",
                "description": "Cuota inicial para moto el\u00e9ctrica urbana.",
                "target_amount": Decimal("1500.00"),
                "current_amount": Decimal("2100.00"),
                "days_offset": 150,
                "pocket_id": None,
            },
            {
                "code": "due_today",
                "display_name": "Curso de inglés",
                "description": "Matrícula del semestre de inglés avanzado, vence hoy.",
                "target_amount": Decimal("600.00"),
                "current_amount": Decimal("300.00"),
                "days_offset": 0,
                "pocket_id": None,
            },
            {
                "code": "overdue",
                "display_name": "Remodelación cocina",
                "description": "Renovación de mesones y gabinetes de la cocina.",
                "target_amount": Decimal("2000.00"),
                "current_amount": Decimal("1000.00"),
                "days_offset": -10,
                "pocket_id": None,
            },
            {
                "code": "pocket_linked",
                "display_name": "Vacaciones Europa",
                "description": "Recorrido por España, Francia e Italia durante julio.",
                "target_amount": Decimal("5000.00"),
                "current_amount": pocket.balance,
                "days_offset": 60,
                "pocket_id": pocket.id,
            },
        ]

        created_names: list[str] = []
        for scenario in scenarios:
            goal = SavingsGoal(
                user_id=user.id,
                pocket_id=scenario["pocket_id"],
                name=scenario["display_name"],
                description=scenario["description"],
                target_amount=scenario["target_amount"],
                current_amount=scenario["current_amount"],
                target_date=_target_date(scenario["days_offset"]),
            )
            db.add(goal)
            created_names.append(goal.name)

        db.commit()

        computed = [
            item
            for item in list_savings_goals(db, user.id)
            if item["goal"].name in SEEDED_DISPLAY_NAMES
        ]
        computed.sort(key=lambda item: item["goal"].name)

        print(
            {
                "user": EMAIL,
                "removed_previous_seeded_goals": removed_count,
                "created_goals": len(created_names),
                "seeded_goal_names": created_names,
                "linked_pocket": {
                    "id": pocket.id,
                    "name": pocket.name,
                    "balance": str(pocket.balance),
                },
                "computed_states": [
                    {
                        "name": item["goal"].name,
                        "target_amount": str(item["goal"].target_amount),
                        "current_amount": str(item["current_amount"]),
                        "progress_percent": item["progress_percent"],
                        "days_remaining": item["days_remaining"],
                        "is_completed": item["is_completed"],
                        "pocket_id": item["goal"].pocket_id,
                    }
                    for item in computed
                ],
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
