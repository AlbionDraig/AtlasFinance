from __future__ import annotations

from datetime import date

import pandas as pd
import requests
import streamlit as st

from modules.api_client import api_request


def dashboard_screen() -> None:
    """Render private financial dashboard with KPI cards and charts."""
    st.subheader("Dashboard")
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
    kpi_1.metric("Patrimonio Neto", f"{metrics['net_worth']:.2f} {currency}")
    kpi_2.metric("Ingresos", f"{metrics['total_income']:.2f} {currency}")
    kpi_3.metric("Gastos", f"{metrics['total_expenses']:.2f} {currency}")
    kpi_4.metric("% Ahorro", f"{metrics['savings_rate']:.2f}%")

    if not transactions:
        st.info("No hay transacciones para el rango seleccionado.")
        return

    df = pd.DataFrame(transactions)
    df["occurred_at"] = pd.to_datetime(df["occurred_at"], utc=True).dt.tz_convert(None)
    df["month"] = df["occurred_at"].dt.to_period("M").astype(str)

    st.subheader("Ingresos vs Gastos por Mes")
    monthly = (
        df.groupby(["month", "transaction_type"], as_index=False)["amount"]
        .sum()
        .pivot(index="month", columns="transaction_type", values="amount")
        .fillna(0)
    )
    st.bar_chart(monthly)

    st.subheader("Evolucion Mensual de Flujo")
    monthly["cashflow"] = monthly.get("income", 0) - monthly.get("expense", 0)
    st.line_chart(monthly[["cashflow"]])

    st.subheader("Gastos por Categoria")
    exp_df = df[df["transaction_type"] == "expense"].copy()
    if not exp_df.empty and "category_id" in exp_df.columns:
        category_breakdown = exp_df.groupby("category_id", as_index=False)["amount"].sum()
        st.dataframe(category_breakdown, width="stretch")

    st.subheader("Transacciones")
    st.dataframe(df.sort_values("occurred_at", ascending=False), width="stretch")
