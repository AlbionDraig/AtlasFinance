"""Seed a fixed-payment-due-soon (low severity) alert for Jane Doe demo user.

Creates 3 months of historical recurring charges for a digital subscription
so that the smart-alerts engine detects an upcoming payment within 7 days.

Usage:
    docker exec atlas-backend python scripts/seed_jane_low_alert.py
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.db.base import SessionLocal
from app.models.account import Account
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.services.metrics_service import get_smart_alerts_summary

EMAIL = "jane.doe@sgb.co"
DESCRIPTION = "Adobe Creative Cloud"
AMOUNT = Decimal("69900")


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalars(select(User).where(User.email == EMAIL)).first()
        if user is None:
            raise ValueError(f"User {EMAIL} not found")

        account = db.scalars(
            select(Account)
            .join(Transaction, Transaction.account_id == Account.id)
            .where(Transaction.user_id == user.id)
            .order_by(Account.id)
        ).first()
        if account is None:
            raise ValueError("User has no accounts")

        category = db.scalars(
            select(Category).where(Category.name == "Suscripciones digitales")
        ).first()
        if category is None:
            raise ValueError("Category 'Suscripciones digitales' not found")

        now = datetime.now(timezone.utc)
        # Target day: 3 days from today so the alert fires within the 7-day window
        target_day = (now + timedelta(days=3)).day

        # Create 3 months of historical charges on the same day-of-month
        created = 0
        for months_back in range(3, 0, -1):
            ref = now.replace(day=1) - timedelta(days=1)  # last day of prev month
            for _ in range(months_back - 1):
                ref = ref.replace(day=1) - timedelta(days=1)

            # Clamp target_day to valid range for that month
            import calendar
            max_day = calendar.monthrange(ref.year, ref.month)[1]
            day = min(target_day, max_day)

            occurred = datetime(ref.year, ref.month, day, 10, 0, 0, tzinfo=timezone.utc)

            tx = Transaction(
                description=DESCRIPTION,
                amount=AMOUNT,
                currency=account.currency,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=occurred,
                user_id=user.id,
                account_id=account.id,
                category_id=category.id,
                pocket_id=None,
            )
            db.add(tx)
            created += 1

        db.commit()

        summary = get_smart_alerts_summary(db, user.id)
        low_alerts = [a for a in summary.alerts if a.severity == "low"]
        all_codes = [f"{a.code}({a.severity})" for a in summary.alerts]
        print(
            {
                "transactions_created": created,
                "total_alerts": len(summary.alerts),
                "low_severity_alerts": len(low_alerts),
                "all_alert_codes": all_codes,
                "low_alerts_detail": [
                    {"code": a.code, "detail": a.detail, "due_date": a.due_date}
                    for a in low_alerts
                ],
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
