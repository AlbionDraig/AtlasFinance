from __future__ import annotations

from datetime import date, datetime, timedelta

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st

from modules.api_client import api_request
from modules.components import btn, info_box, inject_component_styles, section_header, show_warning, sticky_period_filter
from modules.ui import (
    render_info_card,
    render_kpi_card,
)

# ── Plotly base layout ────────────────────────────────────────────────────────

_FONT = "Inter, system-ui, sans-serif"
_MONO = "JetBrains Mono, monospace"


# Text colour optimized for the fixed light theme.
_LABEL_COLOR = "#4b5563"  # gray-600
_TITLE_COLOR = "#111827"  # gray-900
_GRID_COLOR = "rgba(107,114,128,0.12)"


def _format_category_label(raw: object, category_lookup: dict[int, str] | None = None) -> str:
    """Return readable category labels, resolving numeric IDs via lookup when available."""
    if raw is None:
        return "Sin categoría"

    text = str(raw).strip()
    if not text or text.lower() in {"none", "nan"}:
        return "Sin categoría"

    # When backend returns numeric category IDs, map them to names from /categories.
    try:
        num = float(text)
        if num.is_integer():
            category_id = int(num)
            if category_lookup and category_id in category_lookup:
                return category_lookup[category_id]
            return "Sin categoría"
    except ValueError:
        pass

    return text


def _sum_amount_by_type(rows: list[dict], tx_type: str) -> float:
    """Sum amounts for a transaction type in a list of serialized transactions."""
    return float(sum(float(tx.get("amount") or 0) for tx in rows if tx.get("transaction_type") == tx_type))


def _filter_transactions_by_currency(rows: list[dict], currency: str) -> list[dict]:
    """Return only transactions matching the selected currency when available."""
    target = (currency or "").strip().upper()
    if not target:
        return rows
    if not any("currency" in tx for tx in rows):
        return rows
    return [tx for tx in rows if str(tx.get("currency") or "").strip().upper() == target]


def _delta_badge(current: float, previous: float, *, inverse: bool = False) -> tuple[str, str, str]:
    """Return badge text, badge tone and tooltip comparing current vs previous period."""
    delta = current - previous

    if previous == 0:
        if current == 0:
            return "0.0%", "flat", "Sin variación frente al período anterior."
        is_good = delta < 0 if inverse else delta > 0
        return (
            "primer período",
            "up" if is_good else "down",
            f"Sin datos en el período anterior · actual: {current:,.2f}",
        )

    pct = (delta / previous) * 100
    is_good = delta < 0 if inverse else delta > 0
    if delta == 0:
        tone = "flat"
    else:
        tone = "up" if is_good else "down"
    sign = "+" if pct > 0 else ""
    return (
        f"{sign}{pct:.1f}%",
        tone,
        f"Período anterior: {previous:,.2f} · actual: {current:,.2f}",
    )


def _delta_points_badge(current: float, previous: float) -> tuple[str, str, str]:
    """Return badge for percentage-point change (used by savings rate)."""
    delta = current - previous
    sign = "+" if delta > 0 else ""
    tone = "flat" if delta == 0 else ("up" if delta > 0 else "down")
    return (
        f"{sign}{delta:.1f} pp",
        tone,
        f"Período anterior: {previous:.1f}% · actual: {current:.1f}%",
    )


def _base_layout(
    *,
    margin: dict | None = None,
    legend: dict | None = None,
    **kwargs: object,
) -> go.Layout:
    """Return a clean Plotly layout with transparent background."""
    _margin = margin if margin is not None else dict(l=0, r=0, t=16, b=0)
    _legend = (
        legend
        if legend is not None
        else dict(
            orientation="h",
            y=1.08,
            x=0,
            font=dict(size=11, family=_FONT, color=_LABEL_COLOR),
            bgcolor="rgba(0,0,0,0)",
        )
    )
    return go.Layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family=_FONT, color=_LABEL_COLOR, size=12),
        margin=_margin,
        uniformtext=dict(minsize=10, mode="hide"),
        hovermode="closest",
        legend=_legend,
        hoverlabel=dict(
            bgcolor="rgba(20,22,29,0.92)",
            bordercolor="rgba(255,255,255,0.08)",
            font=dict(family=_FONT, size=12, color="#e2e4ec"),
        ),
        **kwargs,  # type: ignore[arg-type]
    )


def _axis(title: str = "") -> dict:
    return dict(
        title=title,
        showgrid=True,
        gridcolor=_GRID_COLOR,
        gridwidth=1,
        zeroline=False,
        linecolor="rgba(107,114,128,0.2)",
        tickfont=dict(family=_MONO, size=11, color=_LABEL_COLOR),
        titlefont=dict(family=_FONT, size=11, color=_LABEL_COLOR),
    )


# ── Chart builders ────────────────────────────────────────────────────────────


def _chart_income_expense(monthly: pd.DataFrame) -> go.Figure:
    """Grouped bar: income vs expenses per month."""
    months = monthly.index.tolist()
    fig = go.Figure(
        layout=_base_layout(
            xaxis=_axis(),
            yaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
            },
            barmode="group",
            bargap=0.22,
            bargroupgap=0.06,
            margin=dict(l=10, r=8, t=8, b=8),
        )
    )
    if "income" in monthly.columns:
        fig.add_trace(
            go.Bar(
                x=months,
                y=monthly["income"],
                name="Ingresos",
                marker_color="#10b981",
                marker_line_color="rgba(255,255,255,0.35)",
                marker_line_width=0,
                marker=dict(cornerradius=6),
                hovertemplate="<b>%{x}</b><br>Ingresos: %{y:,.2f}<extra></extra>",
            )
        )
    if "expense" in monthly.columns:
        fig.add_trace(
            go.Bar(
                x=months,
                y=monthly["expense"],
                name="Gastos",
                marker_color="#f43f5e",
                marker_line_color="rgba(255,255,255,0.35)",
                marker_line_width=0,
                marker=dict(cornerradius=6),
                hovertemplate="<b>%{x}</b><br>Gastos: %{y:,.2f}<extra></extra>",
            )
        )
    return fig


def _chart_cashflow(monthly: pd.DataFrame) -> go.Figure:
    """Area chart: net cashflow per month."""
    months = monthly.index.tolist()
    cashflow = monthly.get("income", pd.Series(0, index=monthly.index)) - monthly.get(
        "expense", pd.Series(0, index=monthly.index)
    )
    positive = [v if v >= 0 else 0 for v in cashflow]
    negative = [v if v < 0 else 0 for v in cashflow]

    fig = go.Figure(
        layout=_base_layout(
            xaxis=_axis(),
            yaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
            },
            showlegend=False,
            margin=dict(l=10, r=8, t=8, b=8),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=months,
            y=positive,
            fill="tozeroy",
            fillcolor="rgba(16,185,129,0.15)",
            line=dict(color="#10b981", width=2.5),
            mode="lines+markers",
            marker=dict(size=5, color="#10b981"),
            name="Positivo",
            hovertemplate="%{x}<br>%{y:,.2f}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=months,
            y=negative,
            fill="tozeroy",
            fillcolor="rgba(244,63,94,0.15)",
            line=dict(color="#f43f5e", width=2.5),
            mode="lines+markers",
            marker=dict(size=5, color="#f43f5e"),
            name="Negativo",
            hovertemplate="%{x}<br>%{y:,.2f}<extra></extra>",
        )
    )
    fig.add_hline(y=0, line=dict(color="rgba(107,114,128,0.3)", width=1, dash="dot"))
    return fig


def _chart_categories(exp_df: pd.DataFrame, category_lookup: dict[int, str] | None = None) -> go.Figure:
    """Horizontal bar: top spending categories."""
    if exp_df.empty:
        return go.Figure(layout=_base_layout())

    cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
    cat = (
        exp_df.groupby(cat_col, as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=True)
        .tail(10)
    )
    cat["label"] = cat[cat_col].map(lambda value: _format_category_label(value, category_lookup))

    palette = [
        "#6366f1", "#8b5cf6", "#a78bfa", "#818cf8",
        "#4f46e5", "#7c3aed", "#6d28d9", "#5b21b6",
        "#4c1d95", "#3b0764",
    ]
    colors = palette[: len(cat)]
    max_amount = float(cat["amount"].max()) if not cat.empty else 0.0

    fig = go.Figure(
        layout=_base_layout(
            xaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
                "range": [0, max_amount * 1.2 if max_amount else 1],
            },
            yaxis=dict(
                showgrid=False,
                zeroline=False,
                linecolor="rgba(107,114,128,0.2)",
                tickfont=dict(family=_FONT, size=12, color=_LABEL_COLOR),
            ),
            showlegend=False,
            margin=dict(l=10, r=22, t=8, b=0),
        )
    )
    fig.add_trace(
        go.Bar(
            x=cat["amount"],
            y=cat["label"],
            orientation="h",
            marker_color=colors,
            marker_line_color="rgba(255,255,255,0.35)",
            marker_line_width=1,
            text=cat["amount"].map(lambda v: f"{v:,.0f}"),
            textposition="outside",
            textfont=dict(family=_MONO, size=11, color=_LABEL_COLOR),
            cliponaxis=False,
            hovertemplate="<b>%{y}</b><br>Gasto: %{x:,.2f}<extra></extra>",
        )
    )
    return fig


def _chart_donut(exp_df: pd.DataFrame, category_lookup: dict[int, str] | None = None) -> go.Figure:
    """Donut chart: spending share by category."""
    if exp_df.empty:
        return go.Figure(layout=_base_layout())

    cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
    cat = (
        exp_df.groupby(cat_col, as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
        .head(8)
    )
    cat["label"] = cat[cat_col].map(lambda value: _format_category_label(value, category_lookup))
    total_spend = float(cat["amount"].sum())

    fig = go.Figure(
        layout=_base_layout(
            margin=dict(l=0, r=0, t=12, b=20),
            legend=dict(
                orientation="h",
                x=0,
                y=-0.08,
                font=dict(size=11, family=_FONT, color=_LABEL_COLOR),
                bgcolor="rgba(0,0,0,0)",
            ),
            showlegend=True,
        )
    )
    fig.add_trace(
        go.Pie(
            labels=cat["label"],
            values=cat["amount"],
            hole=0.68,
            textinfo="percent",
            textposition="inside",
            textfont=dict(family=_FONT, size=12, color="#ffffff"),
            marker=dict(
                colors=[
                    "#6366f1", "#8b5cf6", "#10b981", "#f43f5e",
                    "#f59e0b", "#06b6d4", "#ec4899", "#84cc16",
                ],
                line=dict(color="#f4f5f7", width=2),
            ),
            sort=False,
            hovertemplate="<b>%{label}</b><br>%{value:,.2f} (%{percent})<extra></extra>",
        )
    )
    fig.add_annotation(
        text=f"<b>Total</b><br>{total_spend:,.0f}",
        x=0.5,
        y=0.5,
        xref="paper",
        yref="paper",
        showarrow=False,
        font=dict(family=_MONO, size=13, color=_LABEL_COLOR),
    )
    return fig


def _chart_cumulative_savings(monthly: pd.DataFrame) -> go.Figure:
    """Line chart: cumulative net savings over the selected period."""
    months = monthly.index.tolist()
    income = monthly.get("income", pd.Series(0, index=monthly.index))
    expense = monthly.get("expense", pd.Series(0, index=monthly.index))
    cumulative = (income - expense).cumsum()

    fig = go.Figure(
        layout=_base_layout(
            xaxis=_axis(),
            yaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
            },
            showlegend=False,
            margin=dict(l=10, r=8, t=8, b=8),
        )
    )

    fig.add_trace(
        go.Scatter(
            x=months,
            y=cumulative,
            mode="lines+markers",
            line=dict(color="#0f9d7a", width=2.7),
            marker=dict(size=5, color="#0f9d7a"),
            fill="tozeroy",
            fillcolor="rgba(15,157,122,0.12)",
            hovertemplate="<b>%{x}</b><br>Ahorro acumulado: %{y:,.2f}<extra></extra>",
        )
    )
    fig.add_hline(y=0, line=dict(color="rgba(107,114,128,0.3)", width=1, dash="dot"))
    return fig


def _classify_fixed_variable(category_name: str) -> str:
    """Classify expense category into fixed vs variable using practical keyword rules."""
    label = category_name.strip().lower()
    fixed_keywords = (
        "arriendo",
        "alquiler",
        "servicio",
        "suscrip",
        "internet",
        "celular",
        "seguro",
        "educaci",
        "colegio",
        "universidad",
        "hipoteca",
    )
    if any(key in label for key in fixed_keywords):
        return "Gasto fijo"
    return "Gasto variable"


def _chart_fixed_vs_variable(exp_df: pd.DataFrame, category_lookup: dict[int, str] | None = None) -> go.Figure:
    """Bar chart: fixed vs variable expense split for quick budget control."""
    if exp_df.empty:
        return go.Figure(layout=_base_layout())

    cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
    tmp = exp_df.copy()
    tmp["resolved_category"] = tmp[cat_col].map(lambda value: _format_category_label(value, category_lookup))
    tmp["bucket"] = tmp["resolved_category"].map(_classify_fixed_variable)

    bucket = tmp.groupby("bucket", as_index=False)["amount"].sum()
    order = ["Gasto fijo", "Gasto variable"]
    bucket["bucket"] = pd.Categorical(bucket["bucket"], categories=order, ordered=True)
    bucket = bucket.sort_values("bucket")

    colors = {"Gasto fijo": "#f59e0b", "Gasto variable": "#6366f1"}

    fig = go.Figure(
        layout=_base_layout(
            xaxis=_axis(),
            yaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
            },
            showlegend=False,
            margin=dict(l=10, r=10, t=8, b=8),
        )
    )
    fig.add_trace(
        go.Bar(
            x=bucket["bucket"],
            y=bucket["amount"],
            marker_color=[colors.get(str(v), "#64748b") for v in bucket["bucket"]],
            text=bucket["amount"].map(lambda v: f"{v:,.0f}"),
            textposition="outside",
            cliponaxis=False,
            hovertemplate="<b>%{x}</b><br>Total: %{y:,.2f}<extra></extra>",
        )
    )
    return fig


# ── Main screen ───────────────────────────────────────────────────────────────


def dashboard_screen() -> None:
    """Render private financial dashboard with KPI cards and Plotly charts."""
    inject_component_styles()

    section_header("Panorama financiero", "Vista general de tus finanzas en el período elegido.")

    def _toast(message: str, icon: str = "") -> None:
        if hasattr(st, "toast"):
            st.toast(message, icon=icon or None)
        else:
            st.info(f"{icon} {message}".strip())

    # ── Filter state (draft + applied) ──────────────────────────────────────
    today = date.today()
    default_from = date(today.year, 1, 1)
    default_to = today

    user_key = (st.session_state.get("user_email") or "anon").strip().lower() or "anon"
    prefs_by_user = st.session_state.setdefault("db_preferences_by_user", {})

    # Switch dashboard preferences when the authenticated user changes.
    if st.session_state.get("db_prefs_user") != user_key:
        user_prefs = prefs_by_user.get(user_key, {})
        st.session_state["db_currency"] = user_prefs.get("currency", "COP")
        st.session_state["db_period"] = user_prefs.get("period", "Año actual")
        st.session_state["db_from"] = user_prefs.get("date_from", default_from)
        st.session_state["db_to"] = user_prefs.get("date_to", default_to)
        st.session_state["db_currency_draft"] = st.session_state["db_currency"]
        st.session_state["db_period_draft"] = st.session_state["db_period"]
        st.session_state["db_from_draft"] = st.session_state["db_from"]
        st.session_state["db_to_draft"] = st.session_state["db_to"]
        st.session_state["db_chart_type"] = user_prefs.get("chart_type", "Ingresos vs gastos (barras)")
        st.session_state["db_secondary_chart_type"] = user_prefs.get("secondary_chart_type", "Flujo neto mensual (área)")
        st.session_state["db_prefs_user"] = user_key

    # Applied values drive API queries and cards/charts.
    if "db_currency" not in st.session_state:
        st.session_state["db_currency"] = "COP"
    if "db_period" not in st.session_state:
        st.session_state["db_period"] = "Año actual"
    if "db_from" not in st.session_state:
        st.session_state["db_from"] = default_from
    if "db_to" not in st.session_state:
        st.session_state["db_to"] = default_to

    # Draft values are what user edits in the filter panel before applying.
    if "db_currency_draft" not in st.session_state:
        st.session_state["db_currency_draft"] = st.session_state["db_currency"]
    if "db_period_draft" not in st.session_state:
        st.session_state["db_period_draft"] = st.session_state["db_period"]
    if "db_from_draft" not in st.session_state:
        st.session_state["db_from_draft"] = st.session_state["db_from"]
    if "db_to_draft" not in st.session_state:
        st.session_state["db_to_draft"] = st.session_state["db_to"]
    if "db_chart_type" not in st.session_state:
        st.session_state["db_chart_type"] = "Ingresos vs gastos (barras)"
    if "db_secondary_chart_type" not in st.session_state:
        st.session_state["db_secondary_chart_type"] = "Flujo neto mensual (área)"

    if st.session_state.pop("db_filters_applied_notice", False):
        _toast("Filtros aplicados y sincronizados.", "✅")

    # ── Sticky filter bar (period + currency) ──────────────────────────
    filter_result = sticky_period_filter(
        period_options=["Año actual", "Últimos 90 días", "Últimos 30 días", "Personalizado"],
        default_period=st.session_state["db_period"],
        default_from=st.session_state["db_from_draft"],
        default_to=st.session_state["db_to_draft"],
        default_currency=st.session_state["db_currency"],
    )
    period_value = filter_result["period_value"]
    from_value = filter_result["from_value"]
    to_value = filter_result["to_value"]
    currency_value = filter_result["currency_value"]
    is_custom = filter_result["is_custom"]

    # Apply currency immediately on change
    if currency_value != st.session_state["db_currency"]:
        st.session_state["db_currency"] = currency_value
        st.session_state["db_currency_draft"] = currency_value
        st.session_state["db_last_applied"] = datetime.now().strftime("%H:%M:%S")
        st.rerun()

    should_apply_period = period_value != st.session_state["db_period"]
    should_apply_custom_dates = (
        is_custom
        and (
            from_value != st.session_state["db_from"]
            or to_value != st.session_state["db_to"]
        )
    )

    if should_apply_period or should_apply_custom_dates:
        st.session_state["db_period"] = period_value
        st.session_state["db_period_draft"] = period_value

        if is_custom:
            st.session_state["db_from"] = from_value
            st.session_state["db_from_draft"] = from_value
            st.session_state["db_to"] = to_value
            st.session_state["db_to_draft"] = to_value

        prefs_by_user[user_key] = {
            "currency": st.session_state["db_currency"],
            "period": st.session_state["db_period"],
            "date_from": st.session_state["db_from"],
            "date_to": st.session_state["db_to"],
            "chart_type": st.session_state.get("db_chart_type", "Ingresos vs gastos (barras)"),
            "secondary_chart_type": st.session_state.get("db_secondary_chart_type", "Flujo neto mensual (área)"),
        }
        st.session_state["db_last_applied"] = datetime.now().strftime("%H:%M:%S")
        st.rerun()

    # Apply deferred reset for widget-bound draft values before widgets render.
    if st.session_state.get("db_reset_pending", False):
        st.session_state["db_currency_draft"] = st.session_state.get("db_currency", "COP")
        st.session_state["db_period_draft"] = st.session_state.get("db_period", "Año actual")
        st.session_state["db_from_draft"] = st.session_state.get("db_from", default_from)
        st.session_state["db_to_draft"] = st.session_state.get("db_to", default_to)
        st.session_state["db_reset_pending"] = False

    # Keep draft dates deterministic for non-custom presets.
    draft_period = st.session_state["db_period_draft"]
    if draft_period == "Últimos 30 días":
        draft_from, draft_to = today - timedelta(days=29), today
    elif draft_period == "Últimos 90 días":
        draft_from, draft_to = today - timedelta(days=89), today
    elif draft_period == "Año actual":
        draft_from, draft_to = date(today.year, 1, 1), today
    else:
        draft_from, draft_to = st.session_state["db_from_draft"], st.session_state["db_to_draft"]

    if draft_period != "Personalizado":
        st.session_state["db_from_draft"] = draft_from
        st.session_state["db_to_draft"] = draft_to

    # Applied period/date used for backend calls.
    applied_period = st.session_state["db_period"]
    if applied_period == "Últimos 30 días":
        date_from, date_to = today - timedelta(days=29), today
    elif applied_period == "Últimos 90 días":
        date_from, date_to = today - timedelta(days=89), today
    elif applied_period == "Año actual":
        date_from, date_to = date(today.year, 1, 1), today
    else:
        date_from, date_to = st.session_state["db_from"], st.session_state["db_to"]

    invalid_range_swapped = False
    if date_from > date_to:
        date_from, date_to = date_to, date_from
        invalid_range_swapped = True

    period_days = max((date_to - date_from).days + 1, 1)
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=period_days - 1)

    currency = st.session_state["db_currency"]

    if st.session_state.get("db_refreshing", False):
        _toast("Actualizando tablero con los nuevos filtros...", "⏳")

    # ── Data fetch ────────────────────────────────────────────────────────────
    try:
        metrics_resp = api_request("GET", "/metrics/dashboard", params={"currency": currency})
        accounts_resp = api_request("GET", "/accounts/")
        tx_resp = api_request(
            "GET",
            "/transactions/",
            params={
                "start_date": f"{date_from.isoformat()}T00:00:00",
                "end_date": f"{date_to.isoformat()}T23:59:59",
                "currency": currency,
            },
        )
        prev_tx_resp = api_request(
            "GET",
            "/transactions/",
            params={
                "start_date": f"{prev_from.isoformat()}T00:00:00",
                "end_date": f"{prev_to.isoformat()}T23:59:59",
                "currency": currency,
            },
        )
        metrics_resp.raise_for_status()
        accounts_resp.raise_for_status()
        tx_resp.raise_for_status()
        prev_tx_resp.raise_for_status()
    except requests.RequestException as exc:
        st.session_state["db_refreshing"] = False
        st.error(f"Error consultando la API: {exc}")
        return

    category_lookup: dict[int, str] = {}
    try:
        categories_resp = api_request("GET", "/categories/")
        categories_resp.raise_for_status()
        categories = categories_resp.json()
        category_lookup = {
            int(cat["id"]): str(cat.get("name") or "Sin categoría")
            for cat in categories
            if "id" in cat
        }
    except requests.RequestException:
        # Dashboard remains usable even if category catalog fails temporarily.
        category_lookup = {}

    metrics = metrics_resp.json()
    accounts = accounts_resp.json()
    transactions = _filter_transactions_by_currency(tx_resp.json(), currency)
    previous_transactions = _filter_transactions_by_currency(prev_tx_resp.json(), currency)
    st.session_state["db_refreshing"] = False

    net_worth_value = float(metrics.get("net_worth", 0) or 0)
    if isinstance(accounts, list):
        # Net worth card should strictly reflect balances in the selected currency.
        currency_accounts = [
            acc for acc in accounts if str(acc.get("currency") or "").strip().upper() == currency
        ]
        net_worth_value = float(
            sum(float(acc.get("current_balance") or 0) for acc in currency_accounts)
        )

    current_income = _sum_amount_by_type(transactions, "income")
    current_expense = _sum_amount_by_type(transactions, "expense")
    current_cashflow = current_income - current_expense
    current_savings = (current_cashflow / current_income * 100) if current_income > 0 else 0.0

    prev_income = _sum_amount_by_type(previous_transactions, "income")
    prev_expense = _sum_amount_by_type(previous_transactions, "expense")
    prev_cashflow = prev_income - prev_expense
    prev_savings = (prev_cashflow / prev_income * 100) if prev_income > 0 else 0.0

    net_badge, net_badge_type, net_badge_tip = _delta_badge(current_cashflow, prev_cashflow)
    income_badge, income_badge_type, income_badge_tip = _delta_badge(current_income, prev_income)
    expense_badge, expense_badge_type, expense_badge_tip = _delta_badge(current_expense, prev_expense, inverse=True)
    savings_badge, savings_badge_type, savings_badge_tip = _delta_points_badge(current_savings, prev_savings)

    # ── KPI strip ─────────────────────────────────────────────────────────────
    k1, k2, k3, k4 = st.columns(4)
    savings = current_savings
    with k1:
        render_kpi_card(
            "Patrimonio neto",
            f"{net_worth_value:,.2f}",
            currency,
            badge=net_badge,
            badge_type=net_badge_type,
            badge_tooltip=net_badge_tip,
        )
    with k2:
        render_kpi_card(
            "Ingresos",
            f"{current_income:,.2f}",
            currency,
            badge=income_badge,
            badge_type=income_badge_type,
            badge_tooltip=income_badge_tip,
        )
    with k3:
        render_kpi_card(
            "Gastos",
            f"{current_expense:,.2f}",
            currency,
            badge=expense_badge,
            badge_type=expense_badge_type,
            badge_tooltip=expense_badge_tip,
        )
    with k4:
        if current_income == 0:
            savings_display = "Sin datos"
            savings_sub = "sin ingresos en el período"
        elif savings == 0.0:
            savings_display = "Sin ahorro"
            savings_sub = "ingresos = gastos"
        else:
            rate_quality = "buena" if savings >= 20 else ("ok" if savings >= 5 else "baja")
            savings_display = f"{savings:.1f}%"
            savings_sub = f"del ingreso · {rate_quality}"
        render_kpi_card(
            "Tasa de ahorro",
            savings_display,
            savings_sub,
            badge=savings_badge,
            badge_type=savings_badge_type,
            badge_tooltip=savings_badge_tip,
        )

    st.caption(
        "Variaciones calculadas contra el período equivalente anterior: "
        f"{prev_from.isoformat()} a {prev_to.isoformat()} ({period_days} días)."
    )

    # ── DataFrame prep ────────────────────────────────────────────────────────
    if transactions:
        df = pd.DataFrame(transactions)
        df["occurred_at"] = pd.to_datetime(df["occurred_at"], utc=True).dt.tz_convert(None)
        df["month"] = df["occurred_at"].dt.to_period("M").astype(str)

        monthly = (
            df.groupby(["month", "transaction_type"], as_index=False)["amount"]
            .sum()
            .pivot(index="month", columns="transaction_type", values="amount")
            .fillna(0)
        )
        exp_df = df[df["transaction_type"] == "expense"].copy()
        income_df = df[df["transaction_type"] == "income"].copy()
    else:
        df = pd.DataFrame(columns=["occurred_at", "transaction_type", "amount", "category_id", "currency"])
        monthly = pd.DataFrame(columns=["income", "expense"]) 
        exp_df = pd.DataFrame(columns=df.columns)
        income_df = pd.DataFrame(columns=df.columns)

    period_income = float(income_df["amount"].sum()) if not income_df.empty else 0.0
    period_expense = float(exp_df["amount"].sum()) if not exp_df.empty else 0.0
    period_balance = period_income - period_expense
    avg_expense = float(exp_df["amount"].mean()) if not exp_df.empty else 0.0

    top_cat_text = "Sin gastos"
    if not exp_df.empty:
        cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
        cat_rank = exp_df.groupby(cat_col, as_index=False)["amount"].sum().sort_values("amount", ascending=False)
        if not cat_rank.empty:
            top_label = _format_category_label(cat_rank.iloc[0][cat_col], category_lookup)
            top_value = float(cat_rank.iloc[0]["amount"])
            top_cat_text = f"{top_label} · {top_value:,.0f} {currency}"

    i1, i2 = st.columns(2)
    with i1:
        render_info_card(
            "Gasto promedio",
            f"{avg_expense:,.0f} {currency}",
            sub="Promedio de gasto por transacción.",
            tone="expense",
        )
    with i2:
        render_info_card(
            "Mayor impacto",
            top_cat_text,
            sub="Categoría con mayor peso en el período.",
            tone="impact",
        )

    if invalid_range_swapped:
        _toast("Rango inválido: la fecha 'Desde' no puede ser mayor que 'Hasta'.", "⚠️")

    st.markdown("### Análisis")
    analysis_panel = st.container(border=True)
    with analysis_panel:
        primary_chart_options = [
            "Ingresos vs gastos (barras)",
            "Top categorías (barras)",
            "Ahorro acumulado (línea)",
        ]
        if st.session_state.get("db_chart_type") not in primary_chart_options:
            st.session_state["db_chart_type"] = "Ingresos vs gastos (barras)"

        chart_type = st.selectbox(
            "Gráfico principal",
            primary_chart_options,
            key="db_chart_type",
            help="Elige cómo quieres visualizar la información financiera en esta sección.",
        )
        prefs_by_user.setdefault(user_key, {})["chart_type"] = chart_type

        chart_description = {
            "Ingresos vs gastos (barras)": "Compara, mes a mes, cuánto dinero entró y cuánto salió. Te ayuda a ver rápidamente en qué meses gastaste más de lo que ingresaste.",
            "Top categorías (barras)": "Ordena las categorías donde más dinero gastaste. Sirve para identificar en qué temas se concentra la mayor parte de tus egresos.",
            "Ahorro acumulado (línea)": "Muestra cómo evoluciona tu ahorro neto a lo largo del período, acumulando mes a mes ingresos menos gastos.",
        }

        info_box(chart_description[chart_type], variant="info")

        if chart_type == "Ingresos vs gastos (barras)":
            st.plotly_chart(
                _chart_income_expense(monthly),
                width="stretch",
                config={"displayModeBar": False},
            )
        elif chart_type == "Top categorías (barras)":
            if not exp_df.empty:
                st.plotly_chart(
                    _chart_categories(exp_df, category_lookup),
                    width="stretch",
                    config={"displayModeBar": False},
                )
            else:
                st.info("Sin gastos registrados en el período.")
        elif chart_type == "Ahorro acumulado (línea)":
            st.plotly_chart(
                _chart_cumulative_savings(monthly),
                width="stretch",
                config={"displayModeBar": False},
            )

        secondary_options = [
            "Flujo neto mensual (área)",
            "Distribución de gasto (donut)",
            "Gasto fijo vs variable (barras)",
        ]
        if st.session_state.get("db_secondary_chart_type") not in secondary_options:
            st.session_state["db_secondary_chart_type"] = "Flujo neto mensual (área)"

        with st.expander("Ver más análisis"):
            secondary_chart_type = st.selectbox(
                "Gráfico secundario",
                secondary_options,
                key="db_secondary_chart_type",
            )
            prefs_by_user.setdefault(user_key, {})["secondary_chart_type"] = secondary_chart_type

            secondary_description = {
                "Flujo neto mensual (área)": "Muestra el resultado final por mes (ingresos menos gastos) para detectar meses en positivo y negativo.",
                "Distribución de gasto (donut)": "Visualiza el peso relativo de cada categoría de gasto dentro del total del período.",
                "Gasto fijo vs variable (barras)": "Separa el gasto total entre compromisos recurrentes y gasto más flexible para controlar presupuesto.",
            }

            info_box(secondary_description[secondary_chart_type], variant="info")

            if secondary_chart_type == "Flujo neto mensual (área)":
                st.plotly_chart(
                    _chart_cashflow(monthly),
                    width="stretch",
                    config={"displayModeBar": False},
                )
            elif secondary_chart_type == "Distribución de gasto (donut)":
                if not exp_df.empty:
                    st.plotly_chart(
                        _chart_donut(exp_df, category_lookup),
                        width="stretch",
                        config={"displayModeBar": False},
                    )
                else:
                    st.info("Sin gastos registrados en el período.")
            elif secondary_chart_type == "Gasto fijo vs variable (barras)":
                if not exp_df.empty:
                    st.plotly_chart(
                        _chart_fixed_vs_variable(exp_df, category_lookup),
                        width="stretch",
                        config={"displayModeBar": False},
                    )
                else:
                    st.info("Sin gastos registrados en el período.")


