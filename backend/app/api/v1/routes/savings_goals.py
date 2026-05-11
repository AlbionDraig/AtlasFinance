"""REST endpoints for savings goals management and scenario simulation.

This layer is intentionally thin: only translates HTTP ↔ services.
Business logic (progress calculation, scenario simulation) lives in savings_goals_service.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.savings_goal import (
    SavingsGoalCreate,
    SavingsGoalRead,
    SavingsGoalScenarioRequest,
    SavingsGoalScenarioResponse,
    SavingsGoalUpdate,
)
from app.services.savings_goals_service import (
    create_savings_goal,
    delete_savings_goal,
    get_savings_goal_with_progress,
    list_savings_goals,
    simulate_scenario,
    update_savings_goal,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_savings_goal_endpoint(
    payload: SavingsGoalCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SavingsGoalRead:
    """Create a new savings goal for the user."""
    try:
        goal = create_savings_goal(db, current_user.id, payload)
        return SavingsGoalRead(
            id=goal.id,
            name=goal.name,
            description=goal.description,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            target_date=goal.target_date,
            progress_percent=0.0,
            days_remaining=0,
            is_completed=False,
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_savings_goals_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[SavingsGoalRead]:
    """Get all savings goals for the authenticated user."""
    goals = list_savings_goals(db, current_user.id)
    return [
        SavingsGoalRead(
            id=g["goal"].id,
            name=g["goal"].name,
            description=g["goal"].description,
            target_amount=g["goal"].target_amount,
            current_amount=g["goal"].current_amount,
            target_date=g["goal"].target_date,
            progress_percent=g["progress_percent"],
            days_remaining=g["days_remaining"],
            is_completed=g["is_completed"],
        )
        for g in goals
    ]


@router.get("/{goal_id}")
def get_savings_goal_endpoint(
    goal_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SavingsGoalRead:
    """Get a specific savings goal with progress info."""
    try:
        result = get_savings_goal_with_progress(db, current_user.id, goal_id)
        return SavingsGoalRead(
            id=result["goal"].id,
            name=result["goal"].name,
            description=result["goal"].description,
            target_amount=result["goal"].target_amount,
            current_amount=result["goal"].current_amount,
            target_date=result["goal"].target_date,
            progress_percent=result["progress_percent"],
            days_remaining=result["days_remaining"],
            is_completed=result["is_completed"],
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.put("/{goal_id}", responses={400: {"description": "Bad Request"}})
def update_savings_goal_endpoint(
    goal_id: int,
    payload: SavingsGoalUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SavingsGoalRead:
    """Update a savings goal."""
    try:
        goal = update_savings_goal(db, current_user.id, goal_id, payload)
        result = get_savings_goal_with_progress(db, current_user.id, goal.id)
        return SavingsGoalRead(
            id=result["goal"].id,
            name=result["goal"].name,
            description=result["goal"].description,
            target_amount=result["goal"].target_amount,
            current_amount=result["goal"].current_amount,
            target_date=result["goal"].target_date,
            progress_percent=result["progress_percent"],
            days_remaining=result["days_remaining"],
            is_completed=result["is_completed"],
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT, responses={400: {"description": "Bad Request"}})
def delete_savings_goal_endpoint(
    goal_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a savings goal."""
    try:
        delete_savings_goal(db, current_user.id, goal_id)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.post("/simulate/scenario", responses={400: {"description": "Bad Request"}})
def simulate_scenario_endpoint(
    payload: SavingsGoalScenarioRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[SavingsGoalScenarioResponse]:
    """Simulate impact of reducing spending in a category on savings goals."""
    try:
        results = simulate_scenario(
            db,
            current_user.id,
            payload.category_id,
            payload.reduction_percent,
            payload.months_ahead,
        )
        return [
            SavingsGoalScenarioResponse(
                goal_id=r["goal_id"],
                goal_name=r["goal_name"],
                current_amount=r["current_amount"],
                projected_amount=r["projected_amount"],
                target_amount=r["target_amount"],
                projected_progress_percent=r["projected_progress_percent"],
                will_reach_target=r["will_reach_target"],
                days_to_target=r["days_to_target"],
            )
            for r in results
        ]
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
