from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st

from modules.api_client import api_request
from modules.ui import (
    render_info_card,
    render_kpi_card,
    render_section_header,
    render_tx_feed,
)

# ── Plotly base layout ────────────────────────────────────────────────────────

_FONT = "Inter, system-ui, sans-serif"
_MONO = "JetBrains Mono, monospace"


# Text colour optimized for the fixed light theme.
_LABEL_COLOR = "#4b5563"  # gray-600
_TITLE_COLOR = "#111827"  # gray-900
_GRID_COLOR = "rgba(107,114,128,0.12)"


def _format_category_label(raw: object) -> str:
    """Return readable category labels even when backend sends numeric IDs."""
    text = str(raw).strip()
    try:
        num = float(text)
        if num.is_integer():
            return f"Categoria {int(num)}"
    except ValueError:
        pass
    if text.isdigit():
        return f"Categoria {text}"
    return text


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


def _chart_categories(exp_df: pd.DataFrame) -> go.Figure:
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
    cat["label"] = cat[cat_col].map(_format_category_label)

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


def _chart_donut(exp_df: pd.DataFrame) -> go.Figure:
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
    cat["label"] = cat[cat_col].map(_format_category_label)
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


# ── Main screen ───────────────────────────────────────────────────────────────


def dashboard_screen() -> None:
    """Render private financial dashboard with KPI cards and Plotly charts."""
    render_section_header(
        "Dashboard",
        "Panorama financiero",
        "Resumen claro de salud financiera y actividad reciente.",
    )

    # ── Filters ──────────────────────────────────────────────────────────────
    f1, f2, f3, f4 = st.columns([1, 1, 1, 1])
    with f1:
        currency = st.selectbox("Moneda", ["COP", "USD"], index=0)
    with f2:
        period_preset = st.selectbox(
            "Periodo",
            ["Ano actual", "Ultimos 90 dias", "Ultimos 30 dias", "Personalizado"],
            index=0,
            key="db_period",
        )

    today = date.today()
    if period_preset == "Ultimos 30 dias":
        preset_from, preset_to = today - timedelta(days=29), today
    elif period_preset == "Ultimos 90 dias":
        preset_from, preset_to = today - timedelta(days=89), today
    elif period_preset == "Ano actual":
        preset_from, preset_to = date(today.year, 1, 1), today
    else:
        preset_from, preset_to = date(today.year, 1, 1), today

    with f3:
        date_from = st.date_input(
            "Desde",
            value=preset_from,
            key="db_from",
            disabled=period_preset != "Personalizado",
        )
    with f4:
        date_to = st.date_input(
            "Hasta",
            value=preset_to,
            key="db_to",
            disabled=period_preset != "Personalizado",
        )

    # For preset periods we ignore manual values and keep a deterministic window.
    if period_preset != "Personalizado":
        date_from, date_to = preset_from, preset_to

    if date_from > date_to:
        st.error("La fecha 'Desde' no puede ser mayor que 'Hasta'.")
        return

    days_in_range = (date_to - date_from).days + 1
    st.caption(f"Rango activo: {days_in_range} dias · {date_from.isoformat()} a {date_to.isoformat()}")

    # ── Data fetch ────────────────────────────────────────────────────────────
    try:
        metrics_resp = api_request("GET", "/metrics/dashboard", params={"currency": currency})
        tx_resp = api_request(
            "GET",
            "/transactions/",
            params={
                "start_date": f"{date_from.isoformat()}T00:00:00",
                "end_date": f"{date_to.isoformat()}T23:59:59",
            },
        )
        metrics_resp.raise_for_status()
        tx_resp.raise_for_status()
    except requests.RequestException as exc:
        st.error(f"Error consultando la API: {exc}")
        return

    metrics = metrics_resp.json()
    transactions = tx_resp.json()

    # ── KPI strip ─────────────────────────────────────────────────────────────
    k1, k2, k3, k4 = st.columns(4)
    savings = metrics.get("savings_rate", 0.0)
    with k1:
        render_kpi_card(
            "Patrimonio neto",
            f"{metrics.get('net_worth', 0):,.2f}",
            currency,
        )
    with k2:
        render_kpi_card(
            "Ingresos",
            f"{metrics.get('total_income', 0):,.2f}",
            currency,
            badge="↑ periodo",
            badge_type="up",
        )
    with k3:
        render_kpi_card(
            "Gastos",
            f"{metrics.get('total_expenses', 0):,.2f}",
            currency,
            badge="↓ periodo",
            badge_type="down",
        )
    with k4:
        rate_type = "up" if savings >= 20 else ("flat" if savings >= 5 else "down")
        render_kpi_card(
            "Tasa de ahorro",
            f"{savings:.1f}%",
            "del ingreso",
            badge="buena" if savings >= 20 else ("ok" if savings >= 5 else "baja"),
            badge_type=rate_type,
        )

    if not transactions:
        st.info("No hay transacciones para el rango seleccionado.")
        return

    # ── DataFrame prep ────────────────────────────────────────────────────────
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

    period_income = float(income_df["amount"].sum()) if not income_df.empty else 0.0
    period_expense = float(exp_df["amount"].sum()) if not exp_df.empty else 0.0
    period_balance = period_income - period_expense
    avg_expense = float(exp_df["amount"].mean()) if not exp_df.empty else 0.0

    top_cat_text = "Sin gastos"
    if not exp_df.empty:
        cat_col = "category_name" if "category_name" in exp_df.columns else "category_id"
        cat_rank = exp_df.groupby(cat_col, as_index=False)["amount"].sum().sort_values("amount", ascending=False)
        top_label = _format_category_label(cat_rank.iloc[0][cat_col])
        top_value = float(cat_rank.iloc[0]["amount"])
        top_cat_text = f"{top_label} · {top_value:,.0f} {currency}"

    i1, i2, i3 = st.columns(3)
    with i1:
        render_info_card(
            "Balance neto",
            f"{period_balance:,.0f} {currency}",
            sub="Ingresos menos gastos del rango actual.",
            tone="balance",
        )
    with i2:
        render_info_card(
            "Gasto promedio",
            f"{avg_expense:,.0f} {currency}",
            sub="Ticket promedio por transaccion de egreso.",
            tone="expense",
        )
    with i3:
        render_info_card(
            "Mayor impacto",
            top_cat_text,
            sub="Categoria con mayor peso en el periodo.",
            tone="impact",
        )

    tab_analysis, tab_activity = st.tabs(["Analisis", "Actividad reciente"])

    with tab_analysis:
        render_section_header(
            "Flujo mensual",
            "Ingresos y gastos por mes",
            "Comparación mensual de entradas, salidas y flujo neto.",
        )
        c_left, c_right = st.columns([3, 2])
        with c_left:
            st.plotly_chart(
                _chart_income_expense(monthly),
                width="stretch",
                config={"displayModeBar": False},
            )
        with c_right:
            st.plotly_chart(
                _chart_cashflow(monthly),
                width="stretch",
                config={"displayModeBar": False},
            )

        render_section_header(
            "Categorias",
            "Distribucion del gasto",
            "Top de categorias con mayor impacto en tus egresos.",
        )
        d_left, d_right = st.columns([3, 2])
        with d_left:
            if not exp_df.empty:
                st.plotly_chart(
                    _chart_categories(exp_df),
                    width="stretch",
                    config={"displayModeBar": False},
                )
            else:
                st.info("Sin gastos registrados en el período.")
        with d_right:
            if not exp_df.empty:
                st.plotly_chart(
                    _chart_donut(exp_df),
                    width="stretch",
                    config={"displayModeBar": False},
                )

    with tab_activity:
        render_section_header(
            "Actividad",
            "Ultimas transacciones",
            "Feed reciente de movimientos para validacion rapida.",
        )
        recent = sorted(transactions, key=lambda t: t.get("occurred_at", ""), reverse=True)
        a1, a2 = st.columns([2, 1])
        with a1:
            tx_type_filter = st.radio(
                "Tipo",
                ["Todo", "Ingresos", "Gastos"],
                horizontal=True,
                key="db_activity_type",
            )
        with a2:
            limit = st.selectbox("Mostrar", [8, 12, 20, 30], index=1, key="db_activity_limit")

        if tx_type_filter == "Ingresos":
            recent = [t for t in recent if t.get("transaction_type") == "income"]
        elif tx_type_filter == "Gastos":
            recent = [t for t in recent if t.get("transaction_type") == "expense"]

        render_tx_feed(recent, limit=limit)

