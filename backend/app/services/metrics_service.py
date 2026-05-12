"""Métricas y agregados del dashboard."""
from collections import defaultdict
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

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
    FinancialHealthAction,
    FinancialHealthFactor,
    FinancialHealthHistoryPoint,
    FinancialHealthSnapshot,
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


def _score_to_int(value: Decimal) -> int:
    """Clamp decimal score to 0-100 and convert it to rounded integer."""
    bounded = max(Decimal("0"), min(Decimal("100"), value))
    return int(bounded.to_integral_value(rounding=ROUND_HALF_UP))


def _savings_score(savings_rate: Decimal) -> int:
    """Compute savings factor score using a progressive threshold scale."""
    if savings_rate >= Decimal("25"):
        return 100
    if savings_rate >= Decimal("15"):
        return _score_to_int(Decimal("80") + (savings_rate - Decimal("15")) * Decimal("2"))
    if savings_rate >= Decimal("5"):
        return _score_to_int(Decimal("50") + (savings_rate - Decimal("5")) * Decimal("3"))
    if savings_rate >= Decimal("0"):
        return _score_to_int(Decimal("35") + savings_rate * Decimal("3"))
    return _score_to_int(Decimal("35") + savings_rate * Decimal("2"))


def _inverse_ratio_score(value: Decimal, target: Decimal) -> int:
    """Score where lower observed values are better than or equal to target."""
    if value <= 0:
        return 100
    if target <= 0:
        return 0
    return _score_to_int((target / value) * Decimal("100"))


def _direct_ratio_score(value: Decimal, target: Decimal) -> int:
    """Score where higher observed values are better up to a target."""
    if target <= 0:
        return 0
    return _score_to_int((value / target) * Decimal("100"))


def _calculate_factor_inputs(
    accounts: list[Account],
    investments: list[Investment],
    total_income: Decimal,
    total_expenses: Decimal,
    monthly: list[MonthlyBreakdown],
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """Build raw values for savings, debt, liquidity and diversification factors."""
    savings_rate = (
        ((total_income - total_expenses) / total_income) * Decimal("100")
        if total_income > 0
        else Decimal("0")
    )

    debt_balance = sum(
        (abs(account.current_balance) for account in accounts if account.current_balance < 0),
        Decimal("0"),
    )
    positive_cash = sum(
        (account.current_balance for account in accounts if account.current_balance > 0),
        Decimal("0"),
    )
    total_investments = sum((inv.current_value for inv in investments), Decimal("0"))
    debt_denominator = positive_cash + total_investments + debt_balance
    debt_ratio = (
        (debt_balance / debt_denominator) * Decimal("100")
        if debt_denominator > 0
        else Decimal("0")
    )

    avg_monthly_expense = (
        sum((row.expense for row in monthly), Decimal("0")) / Decimal(str(len(monthly)))
        if monthly
        else total_expenses
    )
    liquidity_months = (
        (positive_cash / avg_monthly_expense)
        if avg_monthly_expense > 0
        else (Decimal("12") if positive_cash > 0 else Decimal("0"))
    )

    account_type_count = len({acc.account_type.value for acc in accounts})
    instrument_type_count = len(
        {
            inv.instrument_type.strip().lower()
            for inv in investments
            if inv.instrument_type.strip()
        }
    )
    entity_count = len({inv.investment_entity_id for inv in investments})

    account_component = _score_to_int((Decimal(str(account_type_count)) / Decimal("3")) * Decimal("100"))
    instrument_component = _score_to_int((Decimal(str(instrument_type_count)) / Decimal("4")) * Decimal("100"))
    entity_component = _score_to_int((Decimal(str(entity_count)) / Decimal("4")) * Decimal("100"))

    if investments:
        diversification_index = (
            Decimal(str(account_component)) * Decimal("0.35")
            + Decimal(str(instrument_component)) * Decimal("0.40")
            + Decimal(str(entity_component)) * Decimal("0.25")
        )
    else:
        baseline = Decimal("30") if account_type_count >= 2 else Decimal("10")
        diversification_index = Decimal(str(account_component)) * Decimal("0.70") + baseline * Decimal("0.30")

    return (
        savings_rate.quantize(Decimal("0.01")),
        debt_ratio.quantize(Decimal("0.01")),
        liquidity_months.quantize(Decimal("0.01")),
        diversification_index.quantize(Decimal("0.01")),
    )


def _build_weekly_plan(factors: list[FinancialHealthFactor]) -> list[FinancialHealthAction]:
    """Build concrete weekly actions prioritizing the weakest factors."""
    ordered = sorted(factors, key=lambda factor: factor.score)
    plan: list[FinancialHealthAction] = []

    for factor in ordered[:3]:
        priority = "high" if factor.score < 50 else "medium" if factor.score < 70 else "low"
        gain = max(3, min(15, (70 - factor.score) // 2 if factor.score < 70 else 3))

        if factor.key == "savings":
            target_value = max(Decimal("15"), factor.value + Decimal("3"))
            action_key = "increase_savings_rate"
            target_unit = "%"
        elif factor.key == "debt":
            target_value = max(Decimal("15"), factor.value - Decimal("5"))
            action_key = "reduce_debt_ratio"
            target_unit = "%"
        elif factor.key == "liquidity":
            target_value = max(Decimal("3"), factor.value + Decimal("0.5"))
            action_key = "build_liquidity_buffer"
            target_unit = "months"
        else:
            target_value = max(Decimal("65"), factor.value + Decimal("8"))
            action_key = "diversify_portfolio"
            target_unit = "%"

        plan.append(
            FinancialHealthAction(
                factor=factor.key,
                priority=priority,
                action_key=action_key,
                target_value=target_value.quantize(Decimal("0.01")),
                target_unit=target_unit,
                estimated_score_gain=int(gain),
            )
        )

    return plan


def _build_health_history(
    monthly_rows: list[MonthlyBreakdown],
    debt_score: int,
    diversification_score: int,
    weight_savings: Decimal,
    weight_debt: Decimal,
    weight_liquidity: Decimal,
    weight_diversification: Decimal,
) -> list[FinancialHealthHistoryPoint]:
    """Build monthly score evolution and identify the driver of each change."""
    if not monthly_rows:
        return []

    history: list[FinancialHealthHistoryPoint] = []
    prev_score: int | None = None
    prev_savings_score: int | None = None
    prev_liquidity_score: int | None = None

    for row in monthly_rows[-12:]:
        month_savings_rate = (
            (row.cashflow / row.income) * Decimal("100") if row.income > 0 else Decimal("0")
        )
        month_liquidity = (
            (row.cumulative / row.expense)
            if row.expense > 0 and row.cumulative > 0
            else Decimal("0")
        )
        month_savings_score = _savings_score(month_savings_rate)
        month_liquidity_score = _direct_ratio_score(month_liquidity, Decimal("6"))

        month_score = _score_to_int(
            Decimal(str(month_savings_score)) * weight_savings
            + Decimal(str(debt_score)) * weight_debt
            + Decimal(str(month_liquidity_score)) * weight_liquidity
            + Decimal(str(diversification_score)) * weight_diversification
        )

        if prev_score is None:
            delta: int | None = None
            change_driver = "baseline"
            change_direction = "stable"
        else:
            delta = month_score - prev_score
            if abs(delta) <= 1:
                change_driver = "stable"
                change_direction = "stable"
            else:
                savings_delta = month_savings_score - (prev_savings_score or month_savings_score)
                liquidity_delta = month_liquidity_score - (prev_liquidity_score or month_liquidity_score)
                change_driver = "savings" if abs(savings_delta) >= abs(liquidity_delta) else "liquidity"
                change_direction = "up" if delta > 0 else "down"

        history.append(
            FinancialHealthHistoryPoint(
                month=row.month,
                score=month_score,
                delta=delta,
                change_driver=change_driver,
                change_direction=change_direction,
            )
        )

        prev_score = month_score
        prev_savings_score = month_savings_score
        prev_liquidity_score = month_liquidity_score

    return history


def _build_financial_health(
    accounts: list[Account],
    investments: list[Investment],
    total_income: Decimal,
    total_expenses: Decimal,
    monthly: list[MonthlyBreakdown],
    history_rows: list[MonthlyBreakdown],
) -> FinancialHealthSnapshot:
    """Assemble financial health score, factors, weekly plan and history."""
    weight_savings = Decimal("0.35")
    weight_debt = Decimal("0.25")
    weight_liquidity = Decimal("0.25")
    weight_diversification = Decimal("0.15")

    savings_rate, debt_ratio, liquidity_months, diversification_index = _calculate_factor_inputs(
        accounts,
        investments,
        total_income,
        total_expenses,
        monthly,
    )

    savings_score = _savings_score(savings_rate)
    debt_score = _inverse_ratio_score(debt_ratio, Decimal("25"))
    liquidity_score = _direct_ratio_score(liquidity_months, Decimal("6"))
    diversification_score = _direct_ratio_score(diversification_index, Decimal("70"))

    factors = [
        FinancialHealthFactor(
            key="savings",
            score=savings_score,
            value=savings_rate,
            target=Decimal("20.00"),
            unit="%",
            weight=weight_savings,
        ),
        FinancialHealthFactor(
            key="debt",
            score=debt_score,
            value=debt_ratio,
            target=Decimal("25.00"),
            unit="%",
            weight=weight_debt,
        ),
        FinancialHealthFactor(
            key="liquidity",
            score=liquidity_score,
            value=liquidity_months,
            target=Decimal("6.00"),
            unit="months",
            weight=weight_liquidity,
        ),
        FinancialHealthFactor(
            key="diversification",
            score=diversification_score,
            value=diversification_index,
            target=Decimal("70.00"),
            unit="%",
            weight=weight_diversification,
        ),
    ]

    score = _score_to_int(
        Decimal(str(savings_score)) * weight_savings
        + Decimal(str(debt_score)) * weight_debt
        + Decimal(str(liquidity_score)) * weight_liquidity
        + Decimal(str(diversification_score)) * weight_diversification
    )

    level = "strong" if score >= 80 else "stable" if score >= 60 else "attention"
    history = _build_health_history(
        history_rows,
        debt_score=debt_score,
        diversification_score=diversification_score,
        weight_savings=weight_savings,
        weight_debt=weight_debt,
        weight_liquidity=weight_liquidity,
        weight_diversification=weight_diversification,
    )
    if not history:
        history = [
            FinancialHealthHistoryPoint(
                month=datetime.now().strftime("%Y-%m"),
                score=score,
                delta=None,
                change_driver="baseline",
                change_direction="stable",
            )
        ]

    return FinancialHealthSnapshot(
        score=score,
        level=level,
        factors=factors,
        weekly_plan=_build_weekly_plan(factors),
        history=history,
    )


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
    accounts = AccountRepository(db).list_all_by_user(user_id)
    investments = InvestmentRepository(db).list_by_user(user_id)

    cat_map = _resolve_categories(db, cur_txns + prev_txns)

    def _cat_info(tx: Transaction) -> tuple[str, bool]:
        if tx.category_id is None or tx.category_id not in cat_map:
            return "Sin categoría", False
        cat = cat_map[tx.category_id]
        return cat.name, cat.is_fixed

    monthly = _build_monthly_breakdown(cur_txns)
    history_monthly = _build_monthly_breakdown(prev_txns + cur_txns)

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

    financial_health = _build_financial_health(
        accounts=accounts,
        investments=investments,
        total_income=total_income,
        total_expenses=total_expenses,
        monthly=monthly,
        history_rows=history_monthly,
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
        financial_health=financial_health,
    )
