"""Repository for SavingsGoal model."""
from sqlalchemy import and_, select

from app.models.savings_goal import SavingsGoal
from app.repositories.base import BaseRepository


class SavingsGoalRepository(BaseRepository[SavingsGoal]):
    """SavingsGoal-specific queries."""

    model = SavingsGoal

    def get_owned(self, user_id: int, goal_id: int) -> SavingsGoal | None:
        """Get a savings goal by ID, verifying it belongs to the user."""
        query = select(SavingsGoal).where(
            and_(
                SavingsGoal.id == goal_id,
                SavingsGoal.user_id == user_id,
            )
        )
        return self.db.scalars(query).first()

    def list_by_user(self, user_id: int) -> list[SavingsGoal]:
        """Get all savings goals for a user."""
        query = select(SavingsGoal).where(SavingsGoal.user_id == user_id).order_by(
            SavingsGoal.target_date
        )
        return list(self.db.scalars(query).all())

    def list_active_by_user(self, user_id: int) -> list[SavingsGoal]:
        """Get all active (not yet reached) savings goals for a user."""
        query = (
            select(SavingsGoal)
            .where(
                and_(
                    SavingsGoal.user_id == user_id,
                    SavingsGoal.current_amount < SavingsGoal.target_amount,
                )
            )
            .order_by(SavingsGoal.target_date)
        )
        return list(self.db.scalars(query).all())
