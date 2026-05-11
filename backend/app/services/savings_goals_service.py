"""Savings goals service with progress tracking and scenario simulation."""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import TypedDict, cast

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.enums import TransactionType
from app.models.savings_goal import SavingsGoal
from app.models.transaction import Transaction
from app.repositories.pockets import PocketRepository
from app.repositories.savings_goals import SavingsGoalRepository
from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalUpdate


class SavingsGoalProgress(TypedDict):
    """Computed progress payload for a savings goal."""

    goal: SavingsGoal
    current_amount: Decimal
    progress_percent: float
    days_remaining: int
    is_completed: bool


class SavingsGoalScenarioProjection(TypedDict):
    """Scenario simulation projection for one savings goal."""

    goal_id: int
    goal_name: str
    current_amount: Decimal
    projected_amount: Decimal
    target_amount: Decimal
    projected_progress_percent: float
    will_reach_target: bool
    days_to_target: int | None


def create_savings_goal(db: Session, user_id: int, payload: SavingsGoalCreate) -> SavingsGoal:
    """Create a new savings goal for the user."""
    pocket = None
    if payload.pocket_id is not None:
        pocket = PocketRepository(db).get_owned(user_id, payload.pocket_id)
        if pocket is None:
            raise ValueError("Pocket not found")

    goal = SavingsGoal(
        user_id=user_id,
        pocket_id=payload.pocket_id,
        name=payload.name,
        description=payload.description,
        target_amount=payload.target_amount,
        current_amount=pocket.balance if pocket is not None else Decimal("0"),
        target_date=payload.target_date,
    )
    return SavingsGoalRepository(db).add(goal)


def get_savings_goal_with_progress(
    db: Session, user_id: int, goal_id: int
) -> SavingsGoalProgress:
    """Get a savings goal with progress metrics."""
    goal = SavingsGoalRepository(db).get_owned(user_id, goal_id)
    if goal is None:
        raise ValueError("Savings goal not found")

    current_amount = _resolve_current_amount(goal)
    progress_percent = _calculate_progress_percent(current_amount, goal.target_amount)
    days_remaining = _calculate_days_remaining(goal.target_date)
    is_completed = current_amount >= goal.target_amount

    return {
        "goal": goal,
        "current_amount": current_amount,
        "progress_percent": progress_percent,
        "days_remaining": days_remaining,
        "is_completed": is_completed,
    }


def list_savings_goals(db: Session, user_id: int) -> list[SavingsGoalProgress]:
    """Get all savings goals for a user with progress info."""
    goals = SavingsGoalRepository(db).list_by_user(user_id)

    result: list[SavingsGoalProgress] = []
    for goal in goals:
        current_amount = _resolve_current_amount(goal)
        progress_percent = _calculate_progress_percent(current_amount, goal.target_amount)
        days_remaining = _calculate_days_remaining(goal.target_date)
        is_completed = current_amount >= goal.target_amount

        result.append({
            "goal": goal,
            "current_amount": current_amount,
            "progress_percent": progress_percent,
            "days_remaining": days_remaining,
            "is_completed": is_completed,
        })

    return result


def update_savings_goal(
    db: Session, user_id: int, goal_id: int, payload: SavingsGoalUpdate
) -> SavingsGoal:
    """Update a savings goal."""
    goals = SavingsGoalRepository(db)
    goal = goals.get_owned(user_id, goal_id)
    if goal is None:
        raise ValueError("Savings goal not found")

    if payload.name is not None:
        goal.name = payload.name
    if payload.description is not None:
        goal.description = payload.description
    if payload.target_amount is not None:
        goal.target_amount = payload.target_amount

    if "pocket_id" in payload.model_fields_set:
        if payload.pocket_id is None:
            goal.current_amount = _resolve_current_amount(goal)
            goal.pocket_id = None
        else:
            pocket = PocketRepository(db).get_owned(user_id, payload.pocket_id)
            if pocket is None:
                raise ValueError("Pocket not found")
            goal.pocket_id = pocket.id
            goal.current_amount = pocket.balance

    if payload.current_amount is not None:
        if goal.pocket_id is not None:
            raise ValueError("Cannot manually update current amount for pocket-linked goals")
        goal.current_amount = payload.current_amount
    if payload.target_date is not None:
        goal.target_date = payload.target_date

    return goals.commit_refresh(goal)


def delete_savings_goal(db: Session, user_id: int, goal_id: int) -> None:
    """Delete a savings goal."""
    goals = SavingsGoalRepository(db)
    goal = goals.get_owned(user_id, goal_id)
    if goal is None:
        raise ValueError("Savings goal not found")
    goals.delete(goal)


def simulate_scenario(
    db: Session,
    user_id: int,
    category_id: int,
    reduction_percent: float,
    months_ahead: int,
) -> list[SavingsGoalScenarioProjection]:
    """
    Simulate impact of reducing spending in a category on savings goals.

    Returns list of projected amounts for each savings goal based on the
    reduced spending being directed to savings.
    """
    # Calculate current monthly average in this category
    avg_monthly_spending = _calculate_avg_monthly_spending(
        db, user_id, category_id, months_back=3
    )

    # Calculate monthly savings from reduction
    monthly_savings = avg_monthly_spending * Decimal(str(reduction_percent)) / Decimal("100")

    # Get all active goals using effective current amount (manual or pocket-linked)
    goals = SavingsGoalRepository(db).list_by_user(user_id)

    result: list[SavingsGoalScenarioProjection] = []
    for goal in goals:
        current_amount = _resolve_current_amount(goal)
        if current_amount >= goal.target_amount:
            continue

        # Project future amount
        projected_amount = current_amount + (monthly_savings * Decimal(str(months_ahead)))

        # Check if goal will be reached
        will_reach = projected_amount >= goal.target_amount

        # Calculate days to reach target
        days_to_target = None
        if monthly_savings > 0:
            remaining_needed = goal.target_amount - current_amount
            if remaining_needed > 0:
                months_needed = float(remaining_needed / monthly_savings)
                days_to_target = int(months_needed * 30)

        progress_percent = min(
            100.0,
            float(projected_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0.0
        )

        result.append({
            "goal_id": goal.id,
            "goal_name": goal.name,
            "current_amount": current_amount,
            "projected_amount": projected_amount,
            "target_amount": goal.target_amount,
            "projected_progress_percent": progress_percent,
            "will_reach_target": will_reach,
            "days_to_target": days_to_target,
        })

    return result


def _calculate_progress_percent(current: Decimal, target: Decimal) -> float:
    """Calculate progress percentage for a goal."""
    if target <= 0:
        return 0.0
    percent = float(current / target * 100)
    return min(100.0, percent)


def _resolve_current_amount(goal: SavingsGoal) -> Decimal:
    """Resolve current amount from pocket balance when goal is pocket-linked."""
    if goal.pocket_id is not None and goal.pocket is not None:
        return cast(Decimal, goal.pocket.balance)
    return goal.current_amount


def _calculate_days_remaining(target_date: datetime) -> int:
    """Calculate days remaining until target date."""
    today = datetime.now(target_date.tzinfo) if target_date.tzinfo else datetime.now()
    delta = target_date - today
    return max(0, delta.days)


def _calculate_avg_monthly_spending(
    db: Session, user_id: int, category_id: int, months_back: int = 3
) -> Decimal:
    """Calculate average monthly spending in a category over recent months."""
    now = datetime.now()
    start_date = now - timedelta(days=months_back * 30)

    query = db.query(Transaction).filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.occurred_at >= start_date,
        )
    )

    total = Decimal("0")
    for txn in query:
        total += txn.amount

    # Divide by number of months to get average
    avg = total / Decimal(str(months_back)) if months_back > 0 else Decimal("0")
    return avg
