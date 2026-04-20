from __future__ import annotations

import os
from datetime import date

import pandas as pd
import requests
import streamlit as st
from streamlit.errors import StreamlitSecretNotFoundError


def resolve_api_base() -> str:
    env_value = os.getenv("ATLAS_API_BASE_URL")
    if env_value:
        return env_value

    try:
        return st.secrets.get("api_base_url", "http://localhost:8000/api/v1")
    except StreamlitSecretNotFoundError:
        return "http://localhost:8000/api/v1"


API_BASE = resolve_api_base()

st.set_page_config(page_title="Atlas Finance Dashboard", layout="wide")
st.title("Atlas Finance - Dashboard Local")

if "jwt_token" not in st.session_state:
    st.session_state["jwt_token"] = ""

with st.sidebar:
    st.header("Conexion API")
    api_base_url = st.text_input("Base URL", value=API_BASE)
    st.caption("Puedes pegar tu JWT o iniciar sesion aqui para generarlo.")
    login_email = st.text_input("Email", value="")
    login_password = st.text_input("Password", value="", type="password")
    if st.button("Iniciar sesion y obtener token", use_container_width=True):
        if not login_email or not login_password:
            st.error("Debes ingresar email y password.")
        else:
            try:
                login_resp = requests.post(
                    f"{api_base_url}/auth/login",
                    json={"email": login_email, "password": login_password},
                    timeout=15,
                )
                login_resp.raise_for_status()
                st.session_state["jwt_token"] = login_resp.json().get("access_token", "")
                if st.session_state["jwt_token"]:
                    st.success("Token generado correctamente.")
                else:
                    st.error("No se pudo extraer access_token de la respuesta.")
            except requests.RequestException as exc:
                st.error(f"Error de login: {exc}")

    token = st.text_area("JWT Token", value=st.session_state["jwt_token"], height=120)
    st.session_state["jwt_token"] = token
    target_currency = st.selectbox("Moneda objetivo", ["COP", "USD"], index=0)

    date_from = st.date_input("Desde", value=date(date.today().year, 1, 1))
    date_to = st.date_input("Hasta", value=date.today())

headers = {"Authorization": f"Bearer {token}"} if token else {}

if not token.strip():
    st.warning("Debes iniciar sesion o pegar un JWT valido para consultar metricas.")
    st.stop()


def fetch_json(path: str, params: dict | None = None) -> dict | list:
    response = requests.get(f"{api_base_url}{path}", headers=headers, params=params, timeout=15)
    response.raise_for_status()
    return response.json()


try:
    metrics = fetch_json("/metrics/dashboard", params={"currency": target_currency})
    transactions = fetch_json(
        "/transactions/",
        params={
            "start_date": f"{date_from.isoformat()}T00:00:00",
            "end_date": f"{date_to.isoformat()}T23:59:59",
        },
    )
except Exception as exc:
    if "401" in str(exc):
        st.error("Token invalido o expirado. Vuelve a iniciar sesion en la barra lateral.")
    else:
        st.error(f"Error consultando API: {exc}")
    st.stop()

kpi_1, kpi_2, kpi_3, kpi_4 = st.columns(4)
kpi_1.metric("Patrimonio Neto", f"{metrics['net_worth']:.2f} {target_currency}")
kpi_2.metric("Ingresos", f"{metrics['total_income']:.2f} {target_currency}")
kpi_3.metric("Gastos", f"{metrics['total_expenses']:.2f} {target_currency}")
kpi_4.metric("% Ahorro", f"{metrics['savings_rate']:.2f}%")

if not transactions:
    st.warning("No hay transacciones para el rango seleccionado.")
    st.stop()

df = pd.DataFrame(transactions)
df["occurred_at"] = pd.to_datetime(df["occurred_at"])
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
if "category_id" in df.columns:
    exp_df = df[df["transaction_type"] == "expense"].copy()
    if not exp_df.empty:
        cat_values = exp_df.groupby("category_id", as_index=False)["amount"].sum()
        st.dataframe(cat_values, use_container_width=True)
        st.caption("Grafico de pastel: en fase inicial se muestra como tabla para evitar dependencias extras.")

st.subheader("Insights")
if len(monthly.index) >= 2:
    last_month = monthly.iloc[-1]
    prev_month = monthly.iloc[-2]
    if prev_month.get("expense", 0) > 0:
        variation = (last_month.get("expense", 0) - prev_month.get("expense", 0)) / prev_month.get("expense", 0) * 100
        if variation > 20:
            st.error(f"Alerta: tus gastos crecieron {variation:.1f}% frente al mes anterior")
        elif variation < -20:
            st.success(f"Buen trabajo: tus gastos bajaron {abs(variation):.1f}% frente al mes anterior")
        else:
            st.info(f"Gasto estable: variacion mensual de {variation:.1f}%")

st.subheader("Transacciones")
st.dataframe(df.sort_values("occurred_at", ascending=False), use_container_width=True)
