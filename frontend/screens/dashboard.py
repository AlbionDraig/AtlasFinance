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


# ── Main screen ───────────────────────────────────────────────────────────────


def dashboard_screen() -> None:
    """Render private financial dashboard with KPI cards and Plotly charts."""
    st.markdown("## Panorama financiero")
    st.caption("Vista general de tus finanzas en el período elegido.")

    # ── Filter state (rendered later, before charts) ───────────────────────
    if "db_currency" not in st.session_state:
        st.session_state["db_currency"] = "COP"
    if "db_period" not in st.session_state:
        st.session_state["db_period"] = "Año actual"

    today = date.today()
    if "db_from" not in st.session_state:
        st.session_state["db_from"] = date(today.year, 1, 1)
    if "db_to" not in st.session_state:
        st.session_state["db_to"] = today

    currency = st.session_state["db_currency"]
    period_preset = st.session_state["db_period"]

    if period_preset == "Últimos 30 días":
        preset_from, preset_to = today - timedelta(days=29), today
    elif period_preset == "Últimos 90 días":
        preset_from, preset_to = today - timedelta(days=89), today
    elif period_preset == "Año actual":
        preset_from, preset_to = date(today.year, 1, 1), today
    else:
        preset_from, preset_to = date(today.year, 1, 1), today

    # For preset periods we ignore manual values and keep a deterministic window.
    if period_preset != "Personalizado":
        st.session_state["db_from"] = preset_from
        st.session_state["db_to"] = preset_to

    date_from = st.session_state["db_from"]
    date_to = st.session_state["db_to"]
    invalid_range_swapped = False
    if date_from > date_to:
        date_from, date_to = date_to, date_from
        invalid_range_swapped = True

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
            badge="↑ entrada",
            badge_type="up",
            badge_tooltip="Dinero que entra en el periodo que elegiste.",
        )
    with k3:
        render_kpi_card(
            "Gastos",
            f"{metrics.get('total_expenses', 0):,.2f}",
            currency,
            badge="↓ salida",
            badge_type="down",
            badge_tooltip="Dinero que sale en el periodo que elegiste.",
        )
    with k4:
        rate_type = "up" if savings >= 20 else ("flat" if savings >= 5 else "down")
        render_kpi_card(
            "Tasa de ahorro",
            f"{savings:.1f}%",
            "del ingreso",
            badge="buena" if savings >= 20 else ("ok" if savings >= 5 else "baja"),
            badge_type=rate_type,
            badge_tooltip="Calidad de ahorro en el periodo que elegiste.",
        )

    if not transactions:
        st.info("No hay transacciones en el periodo que elegiste.")
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
        top_label = _format_category_label(cat_rank.iloc[0][cat_col], category_lookup)
        top_value = float(cat_rank.iloc[0]["amount"])
        top_cat_text = f"{top_label} · {top_value:,.0f} {currency}"

    i1, i2, i3 = st.columns(3)
    with i1:
        render_info_card(
            "Balance neto",
            f"{period_balance:,.0f} {currency}",
            sub="Ingresos menos gastos del período elegido.",
            tone="balance",
        )
    with i2:
        render_info_card(
            "Gasto promedio",
            f"{avg_expense:,.0f} {currency}",
            sub="Promedio de gasto por transacción.",
            tone="expense",
        )
    with i3:
        render_info_card(
            "Mayor impacto",
            top_cat_text,
            sub="Categoría con mayor peso en el período.",
            tone="impact",
        )

    # ── Filters (UI position requested: after cards, before charts) ─────────
    st.markdown("### Filtros")

    f1, f2, f3, f4 = st.columns([1, 1, 1, 1])
    with f1:
        st.selectbox(
            "Moneda",
            ["COP", "USD"],
            key="db_currency",
            help="Selecciona la moneda en la que quieres ver montos, tarjetas y gráficos.",
        )
    with f2:
        st.selectbox(
            "Período",
            ["Año actual", "Últimos 90 días", "Últimos 30 días", "Personalizado"],
            key="db_period",
            help="Define el rango de tiempo para analizar tus finanzas.",
        )
    with f3:
        st.date_input(
            "Desde",
            key="db_from",
            disabled=st.session_state["db_period"] != "Personalizado",
            help="Fecha inicial del análisis. Solo se activa cuando eliges 'Personalizado'.",
        )
    with f4:
        st.date_input(
            "Hasta",
            key="db_to",
            disabled=st.session_state["db_period"] != "Personalizado",
            help="Fecha final del análisis. Solo se activa cuando eliges 'Personalizado'.",
        )

    if invalid_range_swapped:
        st.warning("Ajustamos el período automáticamente porque la fecha 'Desde' era mayor que 'Hasta'.")
    days_in_range = (date_to - date_from).days + 1
    st.caption(f"Período activo: {days_in_range} días · {date_from.isoformat()} a {date_to.isoformat()}")

    st.markdown("### Análisis")

    chart_type = st.selectbox(
        "Gráfico a mostrar",
        [
            "Ingresos vs gastos (barras)",
            "Flujo neto mensual (área)",
            "Top categorías (barras)",
            "Distribución de gasto (donut)",
        ],
        key="db_chart_type",
        help="Elige cómo quieres visualizar la información financiera en esta sección.",
    )

    chart_description = {
        "Ingresos vs gastos (barras)": "Compara, mes a mes, cuánto dinero entró y cuánto salió. Te ayuda a ver rápidamente en qué meses gastaste más de lo que ingresaste.",
        "Flujo neto mensual (área)": "Muestra el resultado final de cada mes (ingresos menos gastos). Si está por encima de cero, cerraste el mes en positivo; si está por debajo, gastaste más de lo que ingresó.",
        "Top categorías (barras)": "Ordena las categorías donde más dinero gastaste. Sirve para identificar en qué temas se concentra la mayor parte de tus egresos.",
        "Distribución de gasto (donut)": "Muestra qué porcentaje del gasto total representa cada categoría. Es útil para entender el peso relativo de cada tipo de gasto.",
    }

    if chart_type == "Ingresos vs gastos (barras)":
        st.plotly_chart(
            _chart_income_expense(monthly),
            width="stretch",
            config={"displayModeBar": False},
        )
    elif chart_type == "Flujo neto mensual (área)":
        st.plotly_chart(
            _chart_cashflow(monthly),
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
    elif chart_type == "Distribución de gasto (donut)":
        if not exp_df.empty:
            st.plotly_chart(
                _chart_donut(exp_df, category_lookup),
                width="stretch",
                config={"displayModeBar": False},
            )
        else:
            st.info("Sin gastos registrados en el período.")

    with st.expander("¿Qué muestra este gráfico?"):
        st.write(chart_description[chart_type])

