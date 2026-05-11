"""Budget service with spending analysis and trend calculations."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.schemas.budget import BudgetCreate, BudgetUpdate


def create_budget(db: Session, user_id: int, payload: BudgetCreate) -> Budget:
    """Create a monthly budget for a category."""
    # Validate category exists
    if CategoryRepository(db).get(payload.category_id) is None:
        raise ValueError("Invalid category")

    # Check if budget already exists for this month/category
    existing = BudgetRepository(db).get_by_user_category_month(
        user_id, payload.category_id, payload.year, payload.month
    )
    if existing:
        raise ValueError("Budget already exists for this month and category")

    budget = Budget(
        user_id=user_id,
        category_id=payload.category_id,
        year=payload.year,
        month=payload.month,
        amount_limit=payload.amount_limit,
    )
    return BudgetRepository(db).add(budget)


def get_budget_with_spending(
    db: Session, user_id: int, budget_id: int
) -> dict:
    """Get budget with current spending and status."""
    budget = BudgetRepository(db).get_owned(user_id, budget_id)
    if budget is None:
        raise ValueError("Budget not found")

    # Calculate current spending in this month/category
    current_spent = _calculate_category_spending(
        db, user_id, budget.category_id, budget.year, budget.month
    )
    remaining = budget.amount_limit - current_spent
    status = _determine_budget_status(current_spent, budget.amount_limit)

    return {
        "budget": budget,
        "current_spent": current_spent,
        "remaining": remaining,
        "status": status,
    }


def list_budgets_by_month(
    db: Session, user_id: int, year: int, month: int
) -> dict:
    """Get all budgets for a user in a specific month with spending info."""
    budgets = BudgetRepository(db).list_by_user_month(user_id, year, month)

    budget_list = []
    total_limit = Decimal("0")
    total_spent = Decimal("0")

    for budget in budgets:
        current_spent = _calculate_category_spending(
            db, user_id, budget.category_id, year, month
        )
        remaining = budget.amount_limit - current_spent
        status = _determine_budget_status(current_spent, budget.amount_limit)

        budget_list.append({
            "id": budget.id,
            "category_id": budget.category_id,
            "year": budget.year,
            "month": budget.month,
            "amount_limit": budget.amount_limit,
            "current_spent": current_spent,
            "remaining": remaining,
            "status": status,
        })

        total_limit += budget.amount_limit
        total_spent += current_spent

    return {
        "year": year,
        "month": month,
        "budgets": budget_list,
        "total_limit": total_limit,
        "total_spent": total_spent,
    }


def update_budget(
    db: Session, user_id: int, budget_id: int, payload: BudgetUpdate
) -> Budget:
    """Update a budget's limit."""
    budgets = BudgetRepository(db)
    budget = budgets.get_owned(user_id, budget_id)
    if budget is None:
        raise ValueError("Budget not found")

    budget.amount_limit = payload.amount_limit
    return budgets.commit_refresh(budget)


def delete_budget(db: Session, user_id: int, budget_id: int) -> None:
    """Delete a budget."""
    budgets = BudgetRepository(db)
    budget = budgets.get_owned(user_id, budget_id)
    if budget is None:
        raise ValueError("Budget not found")
    budgets.delete(budget)


def _calculate_category_spending(
    db: Session, user_id: int, category_id: int, year: int, month: int
) -> Decimal:
    """Calculate total spending in a category for a given month."""
    # Create date range for the month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # Query spending (EXPENSE type) for this category in the month
    query = db.query(Transaction).filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.occurred_at >= start_date,
            Transaction.occurred_at < end_date,
        )
    )

    total = Decimal("0")
    for txn in query:
        total += txn.amount

    return total


def _determine_budget_status(spent: Decimal, limit: Decimal) -> str:
    """Determine budget status based on spending vs limit."""
    if spent > limit:
        return "exceeded"
    percent = (spent / limit * 100) if limit > 0 else 0
    if percent >= 80:
        return "warning"
    return "ok"
