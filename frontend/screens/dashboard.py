from __future__ import annotations

from datetime import date, datetime, timedelta

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st

from modules.api_client import api_request
from modules.components import btn, info_box, inject_component_styles, section_header, select_field, show_warning, sticky_period_filter
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


def _format_card_amount(value: float) -> str:
    """Format KPI amounts without decimals when the value is effectively an integer."""
    rounded = round(float(value), 2)
    if rounded.is_integer():
        return f"{int(rounded):,}"
    return f"{rounded:,.2f}"


def _currency_symbol(currency: str) -> str:
    """Return a compact currency symbol prefix for card amounts."""
    code = (currency or "").strip().upper()
    if code == "USD":
        return "US$"
    if code == "COP":
        return "COP$"
    return f"{code} " if code else ""


def _format_money(value: float, currency: str) -> str:
    """Format monetary values with symbol and smart decimals for cards."""
    return f"{_currency_symbol(currency)}{_format_card_amount(value)}"


def _format_month_label(month_key: str) -> str:
    """Format a YYYY-MM period key into a compact Spanish month label."""
    months = [
        "ene", "feb", "mar", "abr", "may", "jun",
        "jul", "ago", "sep", "oct", "nov", "dic",
    ]
    try:
        period = pd.Period(month_key, freq="M")
    except ValueError:
        return month_key
    return f"{months[period.month - 1]} {period.year}"


def _tone_from_number(value: float, *, zero_tone: str = "default") -> str:
    """Map a numeric value to a semantic UI tone for reusable KPI styling."""
    if value > 0:
        return "positive"
    if value < 0:
        return "negative"
    return zero_tone


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
        return (
            "primer período",
            "flat",
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


def _delta_points_badge(
    current: float,
    previous: float,
    *,
    has_previous_data: bool = True,
) -> tuple[str, str, str]:
    """Return badge for percentage-point change (used by savings rate)."""
    if not has_previous_data:
        return (
            "primer período",
            "flat",
            "Sin datos en el período anterior, no se puede calcular variación.",
        )

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


def _render_plotly_chart(fig: go.Figure, *, slot_key: str) -> None:
    """Render a Plotly chart with a slot-specific identity to avoid Streamlit ID collisions."""
    chart = go.Figure(fig)
    meta = chart.layout.meta if isinstance(chart.layout.meta, dict) else {}
    chart.update_layout(meta={**meta, "streamlit_slot_key": slot_key})
    st.plotly_chart(
        chart,
        key=slot_key,
        width="stretch",
        config={"displayModeBar": False},
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


def _chart_expense_category_trend(exp_df: pd.DataFrame, category_lookup: dict[int, str] | None = None) -> go.Figure:
    """Stacked bars: monthly expense split across the most relevant categories."""
    if exp_df.empty or "month" not in exp_df.columns:
        return go.Figure(layout=_base_layout())

    cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
    tmp = exp_df.copy()
    tmp["resolved_category"] = tmp[cat_col].map(lambda value: _format_category_label(value, category_lookup))

    recent_month = str(tmp["month"].max())
    recent_totals = (
        tmp[tmp["month"] == recent_month]
        .groupby("resolved_category", as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "recent_amount"})
    )
    total_totals = (
        tmp.groupby("resolved_category", as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "total_amount"})
    )
    ranked_categories = total_totals.merge(recent_totals, on="resolved_category", how="left").fillna({"recent_amount": 0})

    top_categories = (
        ranked_categories.sort_values(["recent_amount", "total_amount"], ascending=False)
        .head(5)["resolved_category"]
        .tolist()
    )
    if not top_categories:
        return go.Figure(layout=_base_layout())

    tmp["resolved_category"] = tmp["resolved_category"].where(
        tmp["resolved_category"].isin(top_categories),
        "Otras",
    )
    monthly_category = (
        tmp.groupby(["month", "resolved_category"], as_index=False)["amount"]
        .sum()
        .pivot(index="month", columns="resolved_category", values="amount")
        .fillna(0)
    )

    preferred_order = top_categories + (["Otras"] if "Otras" in monthly_category.columns else [])
    ordered_categories = [name for name in preferred_order if name in monthly_category.columns]
    palette = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#64748b"]

    fig = go.Figure(
        layout=_base_layout(
            xaxis=_axis(),
            yaxis={
                **_axis(),
                "tickformat": "~s",
                "separatethousands": True,
            },
            barmode="stack",
            margin=dict(l=10, r=8, t=8, b=8),
        )
    )
    for index, category_name in enumerate(ordered_categories):
        fig.add_trace(
            go.Bar(
                x=monthly_category.index.tolist(),
                y=monthly_category[category_name],
                name=category_name,
                marker_color=palette[index % len(palette)],
                hovertemplate="<b>%{x}</b><br>" + category_name + ": %{y:,.2f}<extra></extra>",
            )
        )
    return fig


def _expense_category_trend_insight(exp_df: pd.DataFrame, category_lookup: dict[int, str] | None = None) -> str:
    """Summarize the latest month dominant expense category for the stacked chart."""
    if exp_df.empty or "month" not in exp_df.columns:
        return "Sin suficiente detalle para explicar la composición del gasto mensual."

    cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
    tmp = exp_df.copy()
    tmp["resolved_category"] = tmp[cat_col].map(lambda value: _format_category_label(value, category_lookup))
    recent_month = str(tmp["month"].max())
    recent_totals = (
        tmp[tmp["month"] == recent_month]
        .groupby("resolved_category", as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
    )
    if recent_totals.empty:
        return "Sin suficiente detalle para explicar la composición del gasto mensual."

    top_row = recent_totals.iloc[0]
    top_amount = float(top_row["amount"])
    total_amount = float(recent_totals["amount"].sum())
    share = (top_amount / total_amount * 100) if total_amount > 0 else 0.0
    return f"En {_format_month_label(recent_month)}, {top_row['resolved_category']} explicó {share:.1f}% del gasto del mes."


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
    kpi_card_options = [
        "Patrimonio neto",
        "Ingresos",
        "Gastos",
        "Tasa de ahorro",
    ]
    insight_card_options = [
        "Balance del período",
        "Movimientos",
        "Relación gastos/ingresos",
        "Mayor impacto",
        "Mayor gasto individual",
        "Cobertura de efectivo",
        "Mes más costoso",
        "Variación del gasto",
        "Participación de gasto fijo",
    ]

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
        saved_visible_kpis = user_prefs.get("visible_kpis", kpi_card_options)
        saved_visible_insights = user_prefs.get("visible_insights", insight_card_options)
        st.session_state["db_visible_kpis"] = [
            label for label in saved_visible_kpis if label in kpi_card_options
        ] or kpi_card_options.copy()
        st.session_state["db_visible_insights"] = [
            label for label in saved_visible_insights if label in insight_card_options
        ] or insight_card_options.copy()
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
    if "db_visible_kpis" not in st.session_state:
        st.session_state["db_visible_kpis"] = kpi_card_options.copy()
    if "db_visible_insights" not in st.session_state:
        st.session_state["db_visible_insights"] = insight_card_options.copy()

    if st.session_state.pop("db_filters_applied_notice", False):
        _toast("Filtros aplicados y sincronizados.", "✅")

    # Date bounds should follow real transaction history for current currency.
    data_min_date = default_from
    data_max_date = default_to
    try:
        bounds_resp = api_request(
            "GET",
            "/transactions/",
            params={"currency": st.session_state["db_currency"]},
        )
        bounds_resp.raise_for_status()
        all_tx_for_currency = _filter_transactions_by_currency(
            bounds_resp.json(),
            st.session_state["db_currency"],
        )
        if all_tx_for_currency:
            occurred = pd.to_datetime(
                [tx.get("occurred_at") for tx in all_tx_for_currency],
                errors="coerce",
                utc=True,
            )
            occurred = occurred.dropna()
            if len(occurred) > 0:
                data_min_date = occurred.min().date()
                data_max_date = occurred.max().date()
    except requests.RequestException:
        # Keep fallback bounds when API is temporarily unavailable.
        pass

    if data_min_date > data_max_date:
        data_min_date, data_max_date = data_max_date, data_min_date

    st.session_state["db_from_draft"] = min(
        max(st.session_state["db_from_draft"], data_min_date),
        data_max_date,
    )
    st.session_state["db_to_draft"] = min(
        max(st.session_state["db_to_draft"], data_min_date),
        data_max_date,
    )

    # Apply deferred reset before widgets render.
    if st.session_state.get("db_reset_pending", False):
        st.session_state["db_currency_draft"] = st.session_state.get("db_currency", "COP")
        st.session_state["db_period_draft"] = st.session_state.get("db_period", "Año actual")
        st.session_state["db_from_draft"] = st.session_state.get("db_from", default_from)
        st.session_state["db_to_draft"] = st.session_state.get("db_to", default_to)
        st.session_state["db_reset_pending"] = False

    # Keep disabled date fields in sync for non-custom presets.
    draft_period = st.session_state["db_period_draft"]
    if draft_period == "Últimos 30 días":
        draft_from, draft_to = today - timedelta(days=29), today
    elif draft_period == "Últimos 90 días":
        draft_from, draft_to = today - timedelta(days=89), today
    elif draft_period == "Año actual":
        draft_from, draft_to = date(today.year, 1, 1), date(today.year, 12, 31)
    else:
        draft_from, draft_to = st.session_state["db_from_draft"], st.session_state["db_to_draft"]

    if draft_period != "Personalizado":
        st.session_state["db_from_draft"] = draft_from
        st.session_state["db_to_draft"] = draft_to

    # Applied period context to show directly under sticky filters.
    applied_period_preview = st.session_state["db_period"]
    if applied_period_preview == "Últimos 30 días":
        cap_from, cap_to = today - timedelta(days=29), today
    elif applied_period_preview == "Últimos 90 días":
        cap_from, cap_to = today - timedelta(days=89), today
    elif applied_period_preview == "Año actual":
        cap_from, cap_to = date(today.year, 1, 1), date(today.year, 12, 31)
    else:
        cap_from, cap_to = st.session_state["db_from"], st.session_state["db_to"]

    if cap_from > cap_to:
        cap_from, cap_to = cap_to, cap_from

    if applied_period_preview == "Año actual":
        cap_prev_from = date(cap_from.year - 1, 1, 1)
        cap_prev_to = date(cap_from.year - 1, 12, 31)
    else:
        cap_days = max((cap_to - cap_from).days + 1, 1)
        cap_prev_to = cap_from - timedelta(days=1)
        cap_prev_from = cap_prev_to - timedelta(days=cap_days - 1)
    cap_prev_days = max((cap_prev_to - cap_prev_from).days + 1, 1)
    filter_context_caption = (
        "Variaciones vs período anterior equivalente: "
        f"{cap_prev_from.isoformat()} a {cap_prev_to.isoformat()} ({cap_prev_days} días)"
    )

    # ── Sticky filter bar (period + currency) ──────────────────────────
    filter_result = sticky_period_filter(
        period_options=["Año actual", "Últimos 90 días", "Últimos 30 días", "Personalizado"],
        default_period=st.session_state["db_period"],
        default_from=st.session_state["db_from_draft"],
        default_to=st.session_state["db_to_draft"],
        min_date=data_min_date,
        max_date=data_max_date,
        default_currency=st.session_state["db_currency"],
        context_caption=filter_context_caption,
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
            "visible_kpis": st.session_state.get("db_visible_kpis", kpi_card_options),
            "visible_insights": st.session_state.get("db_visible_insights", insight_card_options),
        }
        st.session_state["db_last_applied"] = datetime.now().strftime("%H:%M:%S")
        st.rerun()

    # Applied period/date used for backend calls.
    applied_period = st.session_state["db_period"]
    if applied_period == "Últimos 30 días":
        date_from, date_to = today - timedelta(days=29), today
    elif applied_period == "Últimos 90 días":
        date_from, date_to = today - timedelta(days=89), today
    elif applied_period == "Año actual":
        date_from, date_to = date(today.year, 1, 1), date(today.year, 12, 31)
    else:
        date_from, date_to = st.session_state["db_from"], st.session_state["db_to"]

    invalid_range_swapped = False
    if date_from > date_to:
        date_from, date_to = date_to, date_from
        invalid_range_swapped = True

    period_days = max((date_to - date_from).days + 1, 1)
    if applied_period == "Año actual":
        prev_from = date(date_from.year - 1, 1, 1)
        prev_to = date(date_from.year - 1, 12, 31)
    else:
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
    has_previous_period_data = len(previous_transactions) > 0

    net_badge, net_badge_type, net_badge_tip = _delta_badge(current_cashflow, prev_cashflow)
    income_badge, income_badge_type, income_badge_tip = _delta_badge(current_income, prev_income)
    expense_badge, expense_badge_type, expense_badge_tip = _delta_badge(current_expense, prev_expense, inverse=True)
    savings_badge, savings_badge_type, savings_badge_tip = _delta_points_badge(
        current_savings,
        prev_savings,
        has_previous_data=has_previous_period_data,
    )

    with st.expander("Personalizar tarjetas", expanded=False):
        st.multiselect(
            "Tarjetas KPI visibles",
            options=kpi_card_options,
            default=st.session_state.get("db_visible_kpis", kpi_card_options),
            key="db_visible_kpis",
            help="Selecciona cuáles KPI quieres ver en la parte superior.",
        )
        st.multiselect(
            "Tarjetas de insights visibles",
            options=insight_card_options,
            default=st.session_state.get("db_visible_insights", insight_card_options),
            key="db_visible_insights",
            help="Selecciona cuáles tarjetas de análisis quieres mostrar.",
        )

    prefs_by_user.setdefault(user_key, {})["visible_kpis"] = st.session_state.get(
        "db_visible_kpis", kpi_card_options
    )
    prefs_by_user.setdefault(user_key, {})["visible_insights"] = st.session_state.get(
        "db_visible_insights", insight_card_options
    )

    savings = current_savings
    if current_income == 0:
        savings_display = "Sin datos"
        savings_sub = "sin ingresos en el período"
        savings_tone = "default"
    elif savings == 0.0:
        savings_display = "0.0%"
        savings_sub = "ingresos = gastos"
        savings_tone = "default"
    else:
        if savings <= -999:
            savings_display = "<999%"
        elif savings >= 999:
            savings_display = ">999%"
        else:
            savings_display = f"{abs(savings):,.1f}%"

        if not has_previous_period_data:
            savings_sub = "del ingreso"
        else:
            rate_quality = (
                "margen saludable"
                if savings >= 20
                else ("margen moderado" if savings >= 5 else "margen bajo")
            )
            savings_sub = f"del ingreso · {rate_quality}"

        savings_tone = _tone_from_number(savings)

    # ── KPI strip ─────────────────────────────────────────────────────────────
    def _render_kpi(label: str) -> None:
        if label == "Patrimonio neto":
            render_kpi_card(
                "Patrimonio neto",
                _format_money(net_worth_value, currency),
                "saldo actual",
                badge=net_badge,
                badge_type=net_badge_type,
                badge_tooltip=net_badge_tip,
                help_text="Es el dinero total que tienes hoy en tus cuentas de esta moneda.",
                value_tone=_tone_from_number(net_worth_value),
            )
        elif label == "Ingresos":
            render_kpi_card(
                "Ingresos",
                _format_money(current_income, currency),
                "total del período",
                badge=income_badge,
                badge_type=income_badge_type,
                badge_tooltip=income_badge_tip,
                help_text="Todo lo que te entro de dinero en el período seleccionado.",
                value_tone="positive",
                sub_tone="positive",
            )
        elif label == "Gastos":
            render_kpi_card(
                "Gastos",
                _format_money(current_expense, currency),
                "total del período",
                badge=expense_badge,
                badge_type=expense_badge_type,
                badge_tooltip=expense_badge_tip,
                help_text="Todo lo que salio de dinero en el período seleccionado.",
                value_tone="negative",
                sub_tone="negative",
            )
        elif label == "Tasa de ahorro":
            render_kpi_card(
                "Tasa de ahorro",
                savings_display,
                savings_sub,
                badge=savings_badge,
                badge_type=savings_badge_type,
                badge_tooltip=savings_badge_tip,
                help_text="Que porcentaje de tus ingresos lograste guardar en el período.",
                value_tone=savings_tone,
                sub_tone=savings_tone,
            )

    visible_kpis = [
        label for label in kpi_card_options if label in st.session_state.get("db_visible_kpis", [])
    ]
    if visible_kpis:
        for column, label in zip(st.columns(len(visible_kpis)), visible_kpis):
            with column:
                _render_kpi(label)
    else:
        st.info("No hay tarjetas KPI visibles. Actívalas en 'Personalizar tarjetas'.")

    # ── DataFrame prep ────────────────────────────────────────────────────────────────────
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
    expense_count = len(exp_df.index)
    transaction_count = len(df.index)

    if period_income > 0:
        expense_ratio = (period_expense / period_income) * 100
        expense_ratio_value = f"{expense_ratio:.1f}%"
        if expense_ratio <= 70:
            expense_ratio_tone = "positive"
            expense_ratio_quality = "saludable"
        elif expense_ratio <= 90:
            expense_ratio_tone = "impact"
            expense_ratio_quality = "moderado"
        else:
            expense_ratio_tone = "negative"
            expense_ratio_quality = "alto"
        expense_ratio_sub = (
            f"{_format_money(period_expense, currency)} gastados "
            f"de {_format_money(period_income, currency)} · nivel {expense_ratio_quality}"
        )
    else:
        expense_ratio_value = "Sin datos"
        expense_ratio_sub = "No hay ingresos registrados en el período."
        expense_ratio_tone = "impact"
    monthly_expense_avg = float(monthly["expense"].mean()) if "expense" in monthly.columns and not monthly.empty else 0.0

    balance_tone = _tone_from_number(period_balance, zero_tone="balance")

    if period_balance > 0:
        balance_sub = "Terminaste el período con saldo positivo."
    elif period_balance < 0:
        balance_sub = "Terminaste el período gastando más de lo que ingresó."
    else:
        balance_sub = "Ingresos y gastos quedaron equilibrados."

    top_cat_value = "Sin gastos"
    top_cat_sub = "No hay egresos suficientes para identificar una categoría dominante."
    biggest_expense_value = "Sin gastos"
    biggest_expense_sub = "No hay egresos registrados en el período filtrado."
    highest_spend_month_value = "Sin gastos"
    highest_spend_month_sub = "No hay meses con gasto registrado en el período."
    if not exp_df.empty:
        cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
        cat_rank = exp_df.groupby(cat_col, as_index=False)["amount"].sum().sort_values("amount", ascending=False)
        if not cat_rank.empty:
            top_label = _format_category_label(cat_rank.iloc[0][cat_col], category_lookup)
            top_value = float(cat_rank.iloc[0]["amount"])
            top_share = (top_value / period_expense * 100) if period_expense > 0 else 0.0
            top_cat_value = top_label
            top_cat_sub = f"{top_share:.1f}% del gasto · {_format_money(top_value, currency)}"

        biggest_expense = exp_df.loc[exp_df["amount"].idxmax()]
        biggest_expense_value = _format_money(float(biggest_expense["amount"]), currency)
        biggest_expense_sub = str(biggest_expense.get("description") or "Movimiento sin descripción")

    if "expense" in monthly.columns and not monthly.empty:
        expense_by_month = monthly[monthly["expense"] > 0]["expense"]
        if not expense_by_month.empty:
            highest_month = str(expense_by_month.idxmax())
            highest_spend_month_value = _format_month_label(highest_month)
            highest_spend_month_sub = f"Gasto total: {_format_money(float(expense_by_month.max()), currency)}"

    cash_coverage_value = "Sin referencia"
    cash_coverage_sub = "Necesitas gasto mensual para estimar cobertura."
    cash_coverage_tone = "impact"
    if monthly_expense_avg > 0 and net_worth_value > 0:
        cash_coverage_months = net_worth_value / monthly_expense_avg
        cash_coverage_value = f"{cash_coverage_months:.1f} meses"
        cash_coverage_sub = f"Al ritmo promedio de {_format_money(monthly_expense_avg, currency)} por mes."
        if cash_coverage_months >= 6:
            cash_coverage_tone = "positive"
        elif cash_coverage_months < 1:
            cash_coverage_tone = "negative"
    elif net_worth_value <= 0:
        cash_coverage_value = _format_money(net_worth_value, currency)
        cash_coverage_sub = "Sin saldo positivo suficiente para cubrir gasto futuro."
        cash_coverage_tone = "negative"

    expense_variation_value = "Sin referencia"
    expense_variation_sub = "No hay período anterior comparable para medir variación."
    expense_variation_tone = "impact"
    if prev_expense > 0:
        expense_delta_pct = ((current_expense - prev_expense) / prev_expense) * 100
        sign = "+" if expense_delta_pct > 0 else ""
        expense_variation_value = f"{sign}{expense_delta_pct:.1f}%"
        expense_variation_sub = (
            f"Anterior: {_format_money(prev_expense, currency)} · "
            f"Actual: {_format_money(current_expense, currency)}"
        )
        expense_variation_tone = "negative" if expense_delta_pct > 0 else ("positive" if expense_delta_pct < 0 else "impact")
    elif current_expense > 0:
        expense_variation_value = "primer período"
        expense_variation_sub = f"Gasto actual: {_format_money(current_expense, currency)}"

    fixed_share_value = "Sin gastos"
    fixed_share_sub = "No hay egresos para separar gasto fijo y variable."
    fixed_share_tone = "impact"
    if not exp_df.empty and period_expense > 0:
        cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
        fixed_total = float(
            exp_df.assign(
                resolved_category=exp_df[cat_col].map(
                    lambda value: _format_category_label(value, category_lookup)
                )
            )
            .assign(bucket=lambda frame: frame["resolved_category"].map(_classify_fixed_variable))
            .loc[lambda frame: frame["bucket"] == "Gasto fijo", "amount"]
            .sum()
        )
        fixed_share = (fixed_total / period_expense) * 100
        fixed_share_value = f"{fixed_share:.1f}%"
        fixed_share_sub = (
            f"Fijo: {_format_money(fixed_total, currency)} · "
            f"Variable: {_format_money(period_expense - fixed_total, currency)}"
        )
        if fixed_share >= 60:
            fixed_share_tone = "negative"
        elif fixed_share <= 35:
            fixed_share_tone = "positive"

    def _render_insight(label: str) -> None:
        if label == "Balance del período":
            render_info_card(
                "Balance del período",
                _format_money(period_balance, currency),
                sub=balance_sub,
                tone=balance_tone,
            )
        elif label == "Movimientos":
            render_info_card(
                "Movimientos",
                f"{transaction_count:,}",
                sub="Transacciones registradas en el período filtrado.",
                tone="impact",
            )
        elif label == "Relación gastos/ingresos":
            render_info_card(
                "Relación gastos/ingresos",
                expense_ratio_value,
                sub=expense_ratio_sub,
                tone=expense_ratio_tone,
            )
        elif label == "Mayor impacto":
            render_info_card(
                "Mayor impacto",
                top_cat_value,
                sub=top_cat_sub,
                tone="impact",
            )
        elif label == "Mayor gasto individual":
            render_info_card(
                "Mayor gasto individual",
                biggest_expense_value,
                sub=biggest_expense_sub,
                tone="expense",
            )
        elif label == "Cobertura de efectivo":
            render_info_card(
                "Cobertura de efectivo",
                cash_coverage_value,
                sub=cash_coverage_sub,
                tone=cash_coverage_tone,
            )
        elif label == "Mes más costoso":
            render_info_card(
                "Mes más costoso",
                highest_spend_month_value,
                sub=highest_spend_month_sub,
                tone="impact",
            )
        elif label == "Variación del gasto":
            render_info_card(
                "Variación del gasto",
                expense_variation_value,
                sub=expense_variation_sub,
                tone=expense_variation_tone,
            )
        elif label == "Participación de gasto fijo":
            render_info_card(
                "Participación de gasto fijo",
                fixed_share_value,
                sub=fixed_share_sub,
                tone=fixed_share_tone,
            )

    visible_insights = [
        label for label in insight_card_options if label in st.session_state.get("db_visible_insights", [])
    ]
    if visible_insights:
        insight_rows = [
            ["Balance del período", "Movimientos", "Relación gastos/ingresos"],
            ["Mayor impacto", "Mayor gasto individual", "Cobertura de efectivo"],
            ["Mes más costoso", "Variación del gasto", "Participación de gasto fijo"],
        ]
        for row in insight_rows:
            row_visible = [label for label in row if label in visible_insights]
            if not row_visible:
                continue
            for column, label in zip(st.columns(len(row_visible)), row_visible):
                with column:
                    _render_insight(label)
    else:
        st.info("No hay tarjetas de insights visibles. Actívalas en 'Personalizar tarjetas'.")

    if invalid_range_swapped:
        _toast("Rango inválido: la fecha 'Desde' no puede ser mayor que 'Hasta'.", "⚠️")

    st.markdown("### Análisis")
    analysis_panel = st.container(border=True)
    with analysis_panel:
        chart_options = [
            "Ingresos vs gastos (barras)",
            "Flujo neto mensual (área)",
            "Top categorías (barras)",
            "Distribución de gasto (donut)",
            "Ahorro acumulado (línea)",
            "Gasto fijo vs variable (barras)",
            "Gasto por categoría por mes (apilado)",
        ]

        selected_chart = st.session_state.get("db_chart_type")
        if selected_chart not in chart_options:
            legacy_secondary = st.session_state.get("db_secondary_chart_type")
            if legacy_secondary in chart_options:
                st.session_state["db_chart_type"] = legacy_secondary
            else:
                st.session_state["db_chart_type"] = "Ingresos vs gastos (barras)"

        chart_type = select_field(
            "Gráfico",
            chart_options,
            key="db_chart_type",
            help="Elige la visualización que quieres ver en esta sección.",
        )
        prefs_by_user.setdefault(user_key, {})["chart_type"] = chart_type

        chart_description = {
            "Ingresos vs gastos (barras)": "Compara, mes a mes, cuánto dinero entró y cuánto salió. Te ayuda a ver rápidamente en qué meses gastaste más de lo que ingresaste.",
            "Flujo neto mensual (área)": "Muestra el resultado final por mes (ingresos menos gastos) para detectar meses en positivo y negativo.",
            "Top categorías (barras)": "Ordena las categorías donde más dinero gastaste. Sirve para identificar en qué temas se concentra la mayor parte de tus egresos.",
            "Distribución de gasto (donut)": "Visualiza el peso relativo de cada categoría de gasto dentro del total del período.",
            "Ahorro acumulado (línea)": "Muestra cómo evoluciona tu ahorro neto a lo largo del período, acumulando mes a mes ingresos menos gastos.",
            "Gasto fijo vs variable (barras)": "Separa el gasto total entre compromisos recurrentes y gasto más flexible para controlar presupuesto.",
            "Gasto por categoría por mes (apilado)": "Descompone el gasto mensual por categorías para entender qué rubros explican cada pico de egresos.",
        }

        info_box(chart_description[chart_type], variant="info")
        if chart_type == "Gasto por categoría por mes (apilado)":
            st.caption(_expense_category_trend_insight(exp_df, category_lookup))

        if chart_type == "Ingresos vs gastos (barras)":
            _render_plotly_chart(
                _chart_income_expense(monthly),
                slot_key="db_chart_income_expense",
            )
        elif chart_type == "Flujo neto mensual (área)":
            _render_plotly_chart(
                _chart_cashflow(monthly),
                slot_key="db_chart_cashflow",
            )
        elif chart_type == "Top categorías (barras)":
            if not exp_df.empty:
                _render_plotly_chart(
                    _chart_categories(exp_df, category_lookup),
                    slot_key="db_chart_categories",
                )
            else:
                st.info("Sin gastos registrados en el período.")
        elif chart_type == "Distribución de gasto (donut)":
            if not exp_df.empty:
                _render_plotly_chart(
                    _chart_donut(exp_df, category_lookup),
                    slot_key="db_chart_donut",
                )
            else:
                st.info("Sin gastos registrados en el período.")
        elif chart_type == "Ahorro acumulado (línea)":
            _render_plotly_chart(
                _chart_cumulative_savings(monthly),
                slot_key="db_chart_cumulative_savings",
            )
        elif chart_type == "Gasto fijo vs variable (barras)":
            if not exp_df.empty:
                _render_plotly_chart(
                    _chart_fixed_vs_variable(exp_df, category_lookup),
                    slot_key="db_chart_fixed_variable",
                )
            else:
                st.info("Sin gastos registrados en el período.")
        elif chart_type == "Gasto por categoría por mes (apilado)":
            if not exp_df.empty:
                _render_plotly_chart(
                    _chart_expense_category_trend(exp_df, category_lookup),
                    slot_key="db_chart_expense_category_trend",
                )
            else:
                st.info("Sin gastos registrados en el período.")


