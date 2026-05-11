"""Repository for Budget model."""

from sqlalchemy import and_, select

from app.models.budget import Budget
from app.repositories.base import BaseRepository


class BudgetRepository(BaseRepository[Budget]):
    """Budget-specific queries."""

    model = Budget

    def get_owned(self, user_id: int, budget_id: int) -> Budget | None:
        """Get a budget by ID, verifying it belongs to the user."""
        query = select(Budget).where(
            and_(
                Budget.id == budget_id,
                Budget.user_id == user_id,
            )
        )
        return self.db.scalars(query).first()

    def list_by_user_month(self, user_id: int, year: int, month: int) -> list[Budget]:
        """Get all budgets for a user in a specific month."""
        query = select(Budget).where(
            and_(
                Budget.user_id == user_id,
                Budget.year == year,
                Budget.month == month,
            )
        ).order_by(Budget.category_id)
        return list(self.db.scalars(query).all())

    def get_by_user_category_month(
        self, user_id: int, category_id: int, year: int, month: int
    ) -> Budget | None:
        """Get budget for specific user/category/month."""
        query = select(Budget).where(
            and_(
                Budget.user_id == user_id,
                Budget.category_id == category_id,
                Budget.year == year,
                Budget.month == month,
            )
        )
        return self.db.scalars(query).first()

    def list_by_user(self, user_id: int) -> list[Budget]:
        """Get all budgets for a user."""
        query = select(Budget).where(Budget.user_id == user_id).order_by(
            Budget.year.desc(), Budget.month.desc()
        )
        return list(self.db.scalars(query).all())
