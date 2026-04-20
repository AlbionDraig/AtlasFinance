from __future__ import annotations

import os
from datetime import date, datetime, time

import pandas as pd
import requests
import streamlit as st
from streamlit.errors import StreamlitSecretNotFoundError

REQUEST_TIMEOUT = 15
if hasattr(st, "rerun"):
    RERUN = st.rerun
else:
    RERUN = st.experimental_rerun


def resolve_api_base() -> str:
    env_value = os.getenv("ATLAS_API_BASE_URL")
    if env_value:
        return env_value

    try:
        return st.secrets.get("api_base_url", "http://localhost:8000/api/v1")
    except StreamlitSecretNotFoundError:
        return "http://localhost:8000/api/v1"


def init_session() -> None:
    st.session_state.setdefault("jwt_token", "")
    st.session_state.setdefault("api_base_url", resolve_api_base())


def api_request(
    method: str,
    path: str,
    *,
    payload: dict | None = None,
    params: dict | None = None,
    auth: bool = True,
) -> requests.Response:
    headers: dict[str, str] = {}
    if auth and st.session_state["jwt_token"]:
        headers["Authorization"] = f"Bearer {st.session_state['jwt_token']}"

    response = requests.request(
        method,
        f"{st.session_state['api_base_url']}{path}",
        json=payload,
        params=params,
        headers=headers,
        timeout=REQUEST_TIMEOUT,
    )
    return response


def parse_iso_datetime(value: str) -> datetime:
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def login_view() -> None:
    st.title("Atlas Finance")
    st.subheader("Inicia sesion para gestionar tus finanzas")

    tab_login, tab_register = st.tabs(["Login", "Registro"])

    with tab_login:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            login_submit = st.form_submit_button("Iniciar sesion", use_container_width=True)

        if login_submit:
            if not email or not password:
                st.error("Debes ingresar email y password.")
            else:
                try:
                    response = api_request(
                        "POST",
                        "/auth/login",
                        payload={"email": email, "password": password},
                        auth=False,
                    )
                    response.raise_for_status()
                    st.session_state["jwt_token"] = response.json().get("access_token", "")
                    if not st.session_state["jwt_token"]:
                        st.error("La API no devolvio access_token.")
                    else:
                        st.success("Sesion iniciada correctamente.")
                        RERUN()
                except requests.HTTPError as exc:
                    detail = "Credenciales invalidas."
                    try:
                        detail = response.json().get("detail", detail)
                    except Exception:
                        pass
                    st.error(f"Error de login: {detail}")
                except requests.RequestException as exc:
                    st.error(f"No se pudo conectar a la API: {exc}")

    with tab_register:
        with st.form("register_form"):
            full_name = st.text_input("Nombre completo")
            email = st.text_input("Email de registro")
            password = st.text_input("Password (minimo 8 caracteres)", type="password")
            register_submit = st.form_submit_button("Crear cuenta", use_container_width=True)

        if register_submit:
            if not full_name or not email or len(password) < 8:
                st.error("Completa todos los campos y usa una clave de minimo 8 caracteres.")
            else:
                try:
                    response = api_request(
                        "POST",
                        "/auth/register",
                        payload={
                            "email": email,
                            "full_name": full_name,
                            "password": password,
                        },
                        auth=False,
                    )
                    response.raise_for_status()
                    st.success("Cuenta creada. Ahora inicia sesion en la pestana Login.")
                except requests.HTTPError:
                    detail = "No se pudo crear la cuenta."
                    try:
                        detail = response.json().get("detail", detail)
                    except Exception:
                        pass
                    st.error(f"Error de registro: {detail}")
                except requests.RequestException as exc:
                    st.error(f"No se pudo conectar a la API: {exc}")


def create_base_data_section(banks: list[dict], accounts: list[dict]) -> None:
    st.subheader("Configuracion inicial")
    col_bank, col_account, col_category = st.columns(3)

    with col_bank:
        with st.form("create_bank_form"):
            st.markdown("**Crear banco**")
            bank_name = st.text_input("Nombre del banco", key="bank_name")
            country_code = st.text_input("Pais (codigo)", value="CO", max_chars=3, key="country_code")
            submit_bank = st.form_submit_button("Guardar banco", use_container_width=True)
        if submit_bank:
            if len(bank_name.strip()) < 2:
                st.error("El nombre del banco debe tener al menos 2 caracteres.")
            else:
                resp = api_request(
                    "POST",
                    "/banks/",
                    payload={"name": bank_name.strip(), "country_code": country_code.strip().upper() or "CO"},
                )
                if resp.ok:
                    st.success("Banco creado.")
                    RERUN()
                else:
                    st.error(resp.json().get("detail", "No se pudo crear el banco."))

    with col_account:
        with st.form("create_account_form"):
            st.markdown("**Crear cuenta**")
            if not banks:
                st.info("Primero crea un banco.")
                submit_account = False
            else:
                bank_options = {f"{b['name']} (ID {b['id']})": b["id"] for b in banks}
                account_name = st.text_input("Nombre de la cuenta", key="account_name")
                account_type = st.selectbox("Tipo", ["savings", "checking"], key="account_type")
                account_currency = st.selectbox("Moneda", ["COP", "USD"], key="account_currency")
                balance = st.number_input("Saldo inicial", min_value=0.0, step=10.0, key="account_balance")
                selected_bank = st.selectbox("Banco", list(bank_options.keys()), key="selected_bank")
                submit_account = st.form_submit_button("Guardar cuenta", use_container_width=True)
        if submit_account:
            if len(account_name.strip()) < 2:
                st.error("El nombre de la cuenta debe tener al menos 2 caracteres.")
            else:
                resp = api_request(
                    "POST",
                    "/accounts/",
                    payload={
                        "name": account_name.strip(),
                        "account_type": account_type,
                        "currency": account_currency,
                        "current_balance": balance,
                        "bank_id": bank_options[selected_bank],
                    },
                )
                if resp.ok:
                    st.success("Cuenta creada.")
                    RERUN()
                else:
                    st.error(resp.json().get("detail", "No se pudo crear la cuenta."))

    with col_category:
        with st.form("create_category_form"):
            st.markdown("**Crear categoria**")
            category_name = st.text_input("Nombre de categoria", key="category_name")
            submit_category = st.form_submit_button("Guardar categoria", use_container_width=True)
        if submit_category:
            if len(category_name.strip()) < 2:
                st.error("La categoria debe tener al menos 2 caracteres.")
            else:
                resp = api_request("POST", "/categories/", payload={"name": category_name.strip()})
                if resp.ok:
                    st.success("Categoria creada.")
                    RERUN()
                else:
                    st.error(resp.json().get("detail", "No se pudo crear la categoria."))

    if not accounts:
        st.warning("Necesitas al menos una cuenta para registrar gastos o ingresos.")


def render_transactions_tab() -> None:
    try:
        banks_response = api_request("GET", "/banks/")
        accounts_response = api_request("GET", "/accounts/")
        categories_response = api_request("GET", "/categories/")
        transactions_response = api_request("GET", "/transactions/")
        for resp in [banks_response, accounts_response, categories_response, transactions_response]:
            resp.raise_for_status()
    except requests.RequestException as exc:
        st.error(f"No se pudieron cargar los datos base: {exc}")
        return

    banks = banks_response.json()
    accounts = accounts_response.json()
    categories = categories_response.json()
    transactions = transactions_response.json()

    create_base_data_section(banks, accounts)

    st.subheader("Registrar movimiento")
    account_options = {f"{a['name']} ({a['currency']}) - ID {a['id']}": a["id"] for a in accounts}
    category_options = {"(Sin categoria)": None}
    category_options.update({f"{c['name']} - ID {c['id']}": c["id"] for c in categories})

    with st.form("create_transaction_form"):
        t_col_1, t_col_2, t_col_3 = st.columns(3)
        with t_col_1:
            description = st.text_input("Descripcion")
            amount = st.number_input("Monto", min_value=0.01, step=10.0)
            currency = st.selectbox("Moneda", ["COP", "USD"])
        with t_col_2:
            transaction_type = st.selectbox("Tipo", ["expense", "income"])
            occurred_date = st.date_input("Fecha", value=date.today())
            occurred_time = st.time_input("Hora", value=time(12, 0))
        with t_col_3:
            selected_account_label = st.selectbox(
                "Cuenta",
                list(account_options.keys()) if account_options else ["No hay cuentas"],
                disabled=not bool(account_options),
            )
            selected_category_label = st.selectbox("Categoria", list(category_options.keys()))

        submit_transaction = st.form_submit_button("Guardar movimiento", use_container_width=True)

    if submit_transaction:
        if not account_options:
            st.error("Debes crear una cuenta antes de registrar movimientos.")
        elif len(description.strip()) < 2:
            st.error("La descripcion debe tener al menos 2 caracteres.")
        else:
            occurred_at = datetime.combine(occurred_date, occurred_time)
            payload = {
                "description": description.strip(),
                "amount": amount,
                "currency": currency,
                "transaction_type": transaction_type,
                "occurred_at": occurred_at.isoformat(),
                "account_id": account_options[selected_account_label],
                "category_id": category_options[selected_category_label],
            }
            response = api_request("POST", "/transactions/", payload=payload)
            if response.ok:
                st.success("Movimiento creado.")
                RERUN()
            else:
                st.error(response.json().get("detail", "No se pudo crear el movimiento."))

    st.subheader("Editar o eliminar movimientos")
    if not transactions:
        st.info("Aun no tienes movimientos registrados.")
        return

    tx_df = pd.DataFrame(transactions)
    tx_df["occurred_at"] = pd.to_datetime(tx_df["occurred_at"])
    st.dataframe(
        tx_df[["id", "description", "amount", "currency", "transaction_type", "occurred_at", "account_id", "category_id"]],
        width="stretch",
    )

    transaction_options = {
        f"#{t['id']} - {t['description']} ({t['amount']} {t['currency']})": t for t in transactions
    }
    selected_tx_label = st.selectbox("Selecciona un movimiento", list(transaction_options.keys()))
    selected_tx = transaction_options[selected_tx_label]

    selected_dt = parse_iso_datetime(selected_tx["occurred_at"])
    category_label_lookup = {v: k for k, v in category_options.items()}
    selected_category_label = category_label_lookup.get(selected_tx.get("category_id"), "(Sin categoria)")

    with st.form("edit_transaction_form"):
        e_col_1, e_col_2, e_col_3 = st.columns(3)
        with e_col_1:
            edit_description = st.text_input("Descripcion", value=selected_tx["description"], key="edit_description")
            edit_amount = st.number_input(
                "Monto",
                min_value=0.01,
                value=float(selected_tx["amount"]),
                step=10.0,
                key="edit_amount",
            )
            edit_currency = st.selectbox("Moneda", ["COP", "USD"], index=["COP", "USD"].index(selected_tx["currency"]))
        with e_col_2:
            edit_type = st.selectbox(
                "Tipo",
                ["expense", "income"],
                index=["expense", "income"].index(selected_tx["transaction_type"]),
            )
            edit_date = st.date_input("Fecha", value=selected_dt.date(), key="edit_date")
            edit_time = st.time_input("Hora", value=selected_dt.time(), key="edit_time")
        with e_col_3:
            account_label_lookup = {v: k for k, v in account_options.items()}
            current_account_label = account_label_lookup[selected_tx["account_id"]]
            edit_account_label = st.selectbox(
                "Cuenta",
                list(account_options.keys()),
                index=list(account_options.keys()).index(current_account_label),
            )
            edit_category_label = st.selectbox(
                "Categoria",
                list(category_options.keys()),
                index=list(category_options.keys()).index(selected_category_label),
            )

        save_changes = st.form_submit_button("Guardar cambios", use_container_width=True)

    delete_transaction_clicked = st.button("Eliminar movimiento seleccionado", type="secondary", use_container_width=True)

    if save_changes:
        if len(edit_description.strip()) < 2:
            st.error("La descripcion debe tener al menos 2 caracteres.")
        else:
            edit_payload = {
                "description": edit_description.strip(),
                "amount": edit_amount,
                "currency": edit_currency,
                "transaction_type": edit_type,
                "occurred_at": datetime.combine(edit_date, edit_time).isoformat(),
                "account_id": account_options[edit_account_label],
                "category_id": category_options[edit_category_label],
            }
            response = api_request("PUT", f"/transactions/{selected_tx['id']}", payload=edit_payload)
            if response.ok:
                st.success("Movimiento actualizado.")
                RERUN()
            else:
                st.error(response.json().get("detail", "No se pudo actualizar el movimiento."))

    if delete_transaction_clicked:
        response = api_request("DELETE", f"/transactions/{selected_tx['id']}")
        if response.status_code == 204:
            st.success("Movimiento eliminado.")
            RERUN()
        else:
            st.error(response.json().get("detail", "No se pudo eliminar el movimiento."))


def render_dashboard_tab() -> None:
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


def app() -> None:
    st.set_page_config(page_title="Atlas Finance", layout="wide")
    init_session()

    if not st.session_state["jwt_token"]:
        login_view()
        st.stop()

    with st.sidebar:
        st.success("Sesion activa")
        if st.button("Cerrar sesion", use_container_width=True):
            st.session_state["jwt_token"] = ""
            RERUN()

    st.title("Atlas Finance")
    tab_transactions, tab_dashboard = st.tabs(["Movimientos", "Dashboard"])

    with tab_transactions:
        render_transactions_tab()

    with tab_dashboard:
        render_dashboard_tab()


app()
