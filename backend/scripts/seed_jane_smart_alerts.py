"""Seed a deterministic budget-overrun alert for Jane Doe demo user."""

from datetime import datetime, timezone

from sqlalchemy import select

from app.db.base import SessionLocal
from app.models.account import Account
from app.models.budget import Budget
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.services.metrics_service import get_smart_alerts_summary

EMAIL = "jane.doe@sgb.co"


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalars(select(User).where(User.email == EMAIL)).first()
        if user is None:
            raise ValueError("User jane.doe@sgb.co not found")

        account = db.scalars(
            select(Account).where(Account.user_id == user.id).order_by(Account.id)
        ).first()
        if account is None:
            raise ValueError("User has no accounts")

        category = db.scalars(select(Category).where(Category.name == "Supermercado")).first()
        if category is None:
            category = db.scalars(
                select(Category).where(Category.category_type != "income").order_by(Category.id)
            ).first()
        if category is None:
            raise ValueError("No expense category found")

        now = datetime.now(timezone.utc)

        budget = db.scalars(
            select(Budget).where(
                Budget.user_id == user.id,
                Budget.category_id == category.id,
                Budget.year == now.year,
                Budget.month == now.month,
            )
        ).first()
        if budget is None:
            budget = Budget(
                user_id=user.id,
                category_id=category.id,
                year=now.year,
                month=now.month,
                amount_limit=50000,
            )
            db.add(budget)
        else:
            budget.amount_limit = 50000

        tx = Transaction(
            description="Gasto demo smart alerts",
            amount=180000,
            currency=account.currency,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=now,
            user_id=user.id,
            account_id=account.id,
            category_id=category.id,
            pocket_id=None,
        )
        db.add(tx)
        account.current_balance = account.current_balance - tx.amount

        db.commit()
        db.refresh(tx)

        summary = get_smart_alerts_summary(db, user.id)
        codes = [item.code for item in summary.alerts]
        print(
            {
                "user_id": user.id,
                "account_id": account.id,
                "category_id": category.id,
                "budget_limit": str(budget.amount_limit),
                "expense_created": str(tx.amount),
                "alerts_count": len(summary.alerts),
                "alert_codes": codes,
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
