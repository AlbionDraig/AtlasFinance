"""Métricas y agregados del dashboard."""
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.investment import Investment
from app.models.transaction import Transaction
from app.repositories.accounts import AccountRepository
from app.repositories.categories import CategoryRepository
from app.repositories.investments import InvestmentRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.metric import (
    CategoryExpenseRow,
    DashboardAggregates,
    DashboardMetrics,
    MonthlyBreakdown,
    StackedMonthRow,
)
from app.services._common import get_cached_metrics, set_cached_metrics
from app.services.transactions_service import list_transactions


def _sum_assets(accounts: list[Account], investments: list[Investment]) -> Decimal:
    """Sumar saldos de cuentas e inversiones (sin conversión por ahora)."""
    total_assets = Decimal("0")
    for account in accounts:
        total_assets += account.current_balance
    for investment in investments:
        total_assets += investment.current_value
    return total_assets


def _sum_transactions(transactions: list[Transaction]) -> tuple[Decimal, Decimal]:
    """Sumar ingresos y gastos del periodo."""
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for txn in transactions:
        totals[txn.transaction_type.value] += txn.amount
    return (
        totals[TransactionType.INCOME.value],
        totals[TransactionType.EXPENSE.value],
    )


def get_dashboard_metrics(
    db: Session,
    user_id: int,
    target_currency: str = "COP",
) -> DashboardMetrics:
    """Calcular patrimonio, ingresos, gastos y tasa de ahorro en la moneda objetivo."""
    cached_metrics = get_cached_metrics(user_id, target_currency)
    if cached_metrics is not None:
        return cached_metrics

    accounts = AccountRepository(db).list_all_by_user(user_id)
    investments = InvestmentRepository(db).list_by_user(user_id)
    transactions = TransactionRepository(db).list_all_by_user(user_id)

    total_assets = _sum_assets(accounts, investments)
    total_income, total_expenses = _sum_transactions(transactions)
    cashflow = total_income - total_expenses
    savings_rate = (
        (cashflow / total_income * Decimal("100")) if total_income > 0 else Decimal("0")
    )

    metrics = DashboardMetrics(
        net_worth=total_assets,
        total_income=total_income,
        total_expenses=total_expenses,
        savings_rate=savings_rate.quantize(Decimal("0.01")),
        cashflow=cashflow,
    )
    return set_cached_metrics(user_id, target_currency, metrics)


def _build_monthly_breakdown(cur_txns: list[Transaction]) -> list[MonthlyBreakdown]:
    """Construir el desglose mensual con ingresos, gastos y acumulado."""
    month_income: dict[str, Decimal] = defaultdict(Decimal)
    month_expense: dict[str, Decimal] = defaultdict(Decimal)
    for tx in cur_txns:
        month_key = tx.occurred_at.strftime("%Y-%m")
        if tx.transaction_type == TransactionType.INCOME:
            month_income[month_key] += tx.amount
        else:
            month_expense[month_key] += tx.amount

    all_months = sorted(set(month_income) | set(month_expense))
    monthly: list[MonthlyBreakdown] = []
    cumulative = Decimal("0")
    for m in all_months:
        inc = month_income.get(m, Decimal("0"))
        exp = month_expense.get(m, Decimal("0"))
        cf = inc - exp
        cumulative += cf
        monthly.append(
            MonthlyBreakdown(
                month=m, income=inc, expense=exp, cashflow=cf, cumulative=cumulative
            )
        )
    return monthly


def _resolve_categories(
    db: Session, transactions: list[Transaction]
) -> dict[int, Category]:
    """Pre-cargar metadatos de categorías referenciadas por las transacciones."""
    cat_ids = {tx.category_id for tx in transactions if tx.category_id is not None}
    return {c.id: c for c in CategoryRepository(db).list_by_ids(cat_ids)}


def get_dashboard_aggregates(  # pylint: disable=too-many-arguments,too-many-locals
    db: Session,
    user_id: int,
    start_date: datetime,
    end_date: datetime,
    target_currency: str,  # noqa: ARG001 — reservado para conversión multi-moneda
    prev_start_date: datetime,
    prev_end_date: datetime,
    top_n: int = 10,
) -> DashboardAggregates:
    """Calcular datos para los gráficos y totales del dashboard."""
    cur_txns, _ = list_transactions(
        db, user_id, start_date=start_date, end_date=end_date, limit=10_000
    )
    prev_txns, _ = list_transactions(
        db, user_id, start_date=prev_start_date, end_date=prev_end_date, limit=10_000
    )

    cat_map = _resolve_categories(db, cur_txns + prev_txns)

    def _cat_info(tx: Transaction) -> tuple[str, bool]:
        if tx.category_id is None or tx.category_id not in cat_map:
            return "Sin categoría", False
        cat = cat_map[tx.category_id]
        return cat.name, cat.is_fixed

    monthly = _build_monthly_breakdown(cur_txns)

    # Top categorías por gasto.
    cat_totals: dict[str, Decimal] = defaultdict(Decimal)
    cat_is_fixed: dict[str, bool] = {}
    for tx in cur_txns:
        if tx.transaction_type == TransactionType.EXPENSE:
            name, is_fixed = _cat_info(tx)
            cat_totals[name] += tx.amount
            cat_is_fixed[name] = is_fixed

    sorted_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    top_categories = [
        CategoryExpenseRow(name=name, value=val, is_fixed=cat_is_fixed.get(name, False))
        for name, val in sorted_cats[:top_n]
    ]
    top5_names = [c.name for c in top_categories[:5]]

    # Apilado por mes (top-5 + "Otras") para gráficos del dashboard.
    month_cat: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for tx in cur_txns:
        if tx.transaction_type == TransactionType.EXPENSE:
            name, _ = _cat_info(tx)
            month_key = tx.occurred_at.strftime("%Y-%m")
            month_cat[month_key][name] += tx.amount

    has_otras = False
    stacked: list[StackedMonthRow] = []
    for m in sorted(month_cat.keys()):
        cats = month_cat[m]
        row_cats: dict[str, Decimal] = {}
        otras = Decimal("0")
        for cat_name, val in cats.items():
            if cat_name in top5_names:
                row_cats[cat_name] = val
            else:
                otras += val
        if otras > 0:
            row_cats["Otras"] = otras
            has_otras = True
        stacked.append(StackedMonthRow(month=m, categories=row_cats))

    stacked_cats = top5_names + (["Otras"] if has_otras else [])

    # Escalares derivados.
    fixed_total = sum(
        (
            tx.amount
            for tx in cur_txns
            if tx.transaction_type == TransactionType.EXPENSE and _cat_info(tx)[1]
        ),
        Decimal("0"),
    )

    expense_txns = [tx for tx in cur_txns if tx.transaction_type == TransactionType.EXPENSE]
    biggest: Transaction | None = (
        max(expense_txns, key=lambda t: t.amount) if expense_txns else None
    )

    total_income = sum(
        (tx.amount for tx in cur_txns if tx.transaction_type == TransactionType.INCOME),
        Decimal("0"),
    )
    total_expenses = sum(
        (tx.amount for tx in cur_txns if tx.transaction_type == TransactionType.EXPENSE),
        Decimal("0"),
    )

    prev_income = sum(
        (tx.amount for tx in prev_txns if tx.transaction_type == TransactionType.INCOME),
        Decimal("0"),
    )
    prev_expenses = sum(
        (tx.amount for tx in prev_txns if tx.transaction_type == TransactionType.EXPENSE),
        Decimal("0"),
    )

    return DashboardAggregates(
        income=total_income,
        expenses=total_expenses,
        transaction_count=len(cur_txns),
        monthly=monthly,
        top_categories=top_categories,
        stacked=stacked,
        stacked_cats=stacked_cats,
        fixed_total=fixed_total,
        biggest_expense_amount=biggest.amount if biggest else None,
        biggest_expense_description=biggest.description if biggest else None,
        prev_income=prev_income,
        prev_expenses=prev_expenses,
    )
