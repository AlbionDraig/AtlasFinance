from __future__ import annotations

from datetime import date

import pandas as pd
import requests
import streamlit as st

from modules.api_client import api_request
from modules.ui import render_info_card, render_metric_card, render_section_header


def dashboard_screen() -> None:
    """Render private financial dashboard with KPI cards and charts."""
    render_section_header(
        "Dashboard",
        "Tu historia financiera en modo visual",
        "Lee patrimonio, flujo y tendencias con una composicion mas cercana a un panel de contenido que a un reporte contable clasico.",
    )

    intro_col, filter_col = st.columns([1.15, 1])
    with intro_col:
        render_info_card(
            "Resumen editorial",
            "Este panel condensa patrimonio, ingresos, gastos y comportamiento mensual para que detectes patrones rapidamente.",
        )
    with filter_col:
        render_info_card(
            "Filtro activo",
            "Ajusta moneda y rango temporal para comparar temporadas, picos de gasto y ritmo de ahorro.",
        )

    currency = st.selectbox("Moneda objetivo", ["COP", "USD"], index=0)
    d_col_1, d_col_2 = st.columns(2)
    with d_col_1:
        date_from = st.date_input("Desde", value=date(date.today().year, 1, 1), key="db_from")
    with d_col_2:
        date_to = st.date_input("Hasta", value=date.today(), key="db_to")

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

    kpi_1, kpi_2, kpi_3, kpi_4 = st.columns(4)
    with kpi_1:
        render_metric_card("Patrimonio neto", f"{metrics['net_worth']:.2f} {currency}", "Panorama actual de tus activos.")
    with kpi_2:
        render_metric_card("Ingresos", f"{metrics['total_income']:.2f} {currency}", "Entradas acumuladas para el periodo.")
    with kpi_3:
        render_metric_card("Gastos", f"{metrics['total_expenses']:.2f} {currency}", "Salida total de dinero en el rango.")
    with kpi_4:
        render_metric_card("Tasa de ahorro", f"{metrics['savings_rate']:.2f}%", "Margen disponible despues de gastar.")

    if not transactions:
        st.info("No hay transacciones para el rango seleccionado.")
        return

    df = pd.DataFrame(transactions)
    df["occurred_at"] = pd.to_datetime(df["occurred_at"], utc=True).dt.tz_convert(None)
    df["month"] = df["occurred_at"].dt.to_period("M").astype(str)

    render_section_header(
        "Tendencias",
        "Ingresos vs gastos por mes",
        "Una lectura rapida del pulso mensual para entender si tu ritmo financiero acelera o se frena.",
    )
    monthly = (
        df.groupby(["month", "transaction_type"], as_index=False)["amount"]
        .sum()
        .pivot(index="month", columns="transaction_type", values="amount")
        .fillna(0)
    )
    st.bar_chart(monthly)

    render_section_header(
        "Cashflow",
        "Evolucion mensual de flujo",
        "La linea muestra el empuje real de cada mes despues de cruzar entradas y salidas.",
    )
    monthly["cashflow"] = monthly.get("income", 0) - monthly.get("expense", 0)
    st.line_chart(monthly[["cashflow"]])

    render_section_header(
        "Categorias",
        "Gastos por categoria",
        "Encuentra donde se concentra la mayor presion de gasto y detecta habitos repetidos.",
    )
    exp_df = df[df["transaction_type"] == "expense"].copy()
    if not exp_df.empty and "category_id" in exp_df.columns:
        category_breakdown = exp_df.groupby("category_id", as_index=False)["amount"].sum()
        st.dataframe(category_breakdown, width="stretch")

    render_section_header(
        "Timeline",
        "Transacciones",
        "El feed completo de operaciones para revisar detalles y contexto en orden inverso.",
    )
    st.dataframe(df.sort_values("occurred_at", ascending=False), width="stretch")
