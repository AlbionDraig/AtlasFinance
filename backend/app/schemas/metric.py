from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import MoneyDecimal


class DashboardMetrics(BaseModel):
    """Aggregated KPI values shown in the financial dashboard."""
    net_worth: MoneyDecimal
    total_income: MoneyDecimal
    total_expenses: MoneyDecimal
    savings_rate: MoneyDecimal
    cashflow: MoneyDecimal


class MonthlyBreakdown(BaseModel):
    """Income, expense, cashflow and running cumulative for a single calendar month."""
    month: str  # "YYYY-MM"
    income: MoneyDecimal
    expense: MoneyDecimal
    cashflow: MoneyDecimal
    cumulative: MoneyDecimal


class CategoryExpenseRow(BaseModel):
    """Total expense and fixed/variable classification for a single category."""
    name: str
    value: MoneyDecimal
    is_fixed: bool


class StackedMonthRow(BaseModel):
    """Per-month expense breakdown keyed by category name (for stacked charts)."""
    month: str  # "YYYY-MM"
    categories: dict[str, Decimal]


class DashboardAggregates(BaseModel):
    """Pre-computed chart data and period totals for the financial dashboard."""
    income: MoneyDecimal
    expenses: MoneyDecimal
    transaction_count: int
    monthly: list[MonthlyBreakdown]
    top_categories: list[CategoryExpenseRow]
    stacked: list[StackedMonthRow]
    stacked_cats: list[str]
    fixed_total: MoneyDecimal
    biggest_expense_amount: MoneyDecimal | None
    biggest_expense_description: str | None
    prev_income: MoneyDecimal
    prev_expenses: MoneyDecimal

