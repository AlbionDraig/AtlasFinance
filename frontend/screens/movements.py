from __future__ import annotations

from datetime import date, datetime, time

import requests
import streamlit as st

from modules.api_client import api_request, parse_iso_datetime
from modules.config import RERUN
from modules.notifications import show_error, show_success
from modules.ui import (
    render_empty_state,
    render_info_card,
    render_section_header,
    render_tx_feed,
)


def _show_api_result(response: requests.Response, success_message: str, error_message: str) -> None:
    """Show common success or error feedback for form submissions."""
    if response.ok:
        show_success(success_message)
        RERUN()
        return

    try:
        error_detail = response.json().get("detail", error_message)
    except Exception:
        error_detail = error_message
    show_error(error_detail)


def _load_movement_data() -> tuple[list[dict], list[dict], list[dict], list[dict]] | None:
    """Fetch base data required by the movements screen."""
    try:
        banks_response = api_request("GET", "/banks/")
        accounts_response = api_request("GET", "/accounts/")
        categories_response = api_request("GET", "/categories/")
        transactions_response = api_request("GET", "/transactions/")
        for response in [banks_response, accounts_response, categories_response, transactions_response]:
            response.raise_for_status()
    except requests.RequestException as exc:
        st.error(f"No se pudieron cargar los datos base: {exc}")
        return None

    return (
        banks_response.json(),
        accounts_response.json(),
        categories_response.json(),
        transactions_response.json(),
    )


def _build_options(accounts: list[dict], categories: list[dict]) -> tuple[dict[str, int], dict[str, int | None]]:
    """Build user-friendly selectbox labels (without exposing DB IDs)."""
    account_options: dict[str, int] = {}
    account_label_counts: dict[str, int] = {}
    for account in accounts:
        base_label = f"{account['name']} ({account['currency']})"
        count = account_label_counts.get(base_label, 0) + 1
        account_label_counts[base_label] = count
        label = base_label if count == 1 else f"{base_label} ({count})"
        account_options[label] = account["id"]

    category_options: dict[str, int | None] = {"Sin categoría": None}
    category_label_counts: dict[str, int] = {}
    for category in categories:
        base_label = str(category.get("name") or "Categoría")
        count = category_label_counts.get(base_label, 0) + 1
        category_label_counts[base_label] = count
        label = base_label if count == 1 else f"{base_label} ({count})"
        category_options[label] = category["id"]

    return account_options, category_options


def _handle_create_transaction(
    description: str,
    amount: float,
    currency: str,
    transaction_type: str,
    occurred_date: date,
    occurred_time: time,
    selected_account_label: str,
    selected_category_label: str,
    account_options: dict[str, int],
    category_options: dict[str, int | None],
) -> None:
    """Validate and create a new transaction."""
    if not account_options:
        st.error("Debes crear una cuenta antes de registrar movimientos.")
        return

    if len(description.strip()) < 2:
        st.error("La descripcion debe tener al menos 2 caracteres.")
        return

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
    _show_api_result(response, "Movimiento creado.", "No se pudo crear el movimiento.")


def _render_create_transaction_form(account_options: dict[str, int], category_options: dict[str, int | None]) -> None:
    """Render transaction creation form and handle submission."""
    render_section_header(
        "Publicar",
        "Registrar movimiento",
        "Registra gastos e ingresos con el minimo de campos necesarios.",
    )
    with st.form("create_transaction_form"):
        t_col_1, t_col_2 = st.columns(2)
        with t_col_1:
            description = st.text_input("Descripcion")
            amount = st.number_input("Monto", min_value=0.01, step=10.0)
            currency = st.selectbox("Moneda", ["COP", "USD"])
            selected_account_label = st.selectbox(
                "Cuenta",
                list(account_options.keys()) if account_options else ["No hay cuentas"],
                disabled=not bool(account_options),
            )
        with t_col_2:
            transaction_type = st.selectbox("Tipo", ["expense", "income"])
            selected_category_label = st.selectbox("Categoria", list(category_options.keys()))
            occurred_date = st.date_input("Fecha", value=date.today())
            occurred_time = st.time_input("Hora", value=time(12, 0))

        submit_transaction = st.form_submit_button("Guardar movimiento", use_container_width=True)

    if submit_transaction:
        _handle_create_transaction(
            description,
            amount,
            currency,
            transaction_type,
            occurred_date,
            occurred_time,
            selected_account_label,
            selected_category_label,
            account_options,
            category_options,
        )


def _build_transaction_selector(transactions: list[dict]) -> tuple[dict[str, dict], str, dict]:
    """Build transaction selector structures used by the edit form."""
    transaction_options: dict[str, dict] = {}
    tx_label_counts: dict[str, int] = {}

    for tx in transactions:
        description = str(tx.get("description") or "Movimiento")
        currency = str(tx.get("currency") or "")
        occurred_at = str(tx.get("occurred_at") or "")
        date_short = occurred_at[:10] if len(occurred_at) >= 10 else occurred_at
        amount = tx.get("amount", 0)
        try:
            amount_text = f"{float(amount):,.2f}"
        except (TypeError, ValueError):
            amount_text = str(amount)

        base_label = f"{description} · {amount_text} {currency} · {date_short}".strip()
        count = tx_label_counts.get(base_label, 0) + 1
        tx_label_counts[base_label] = count
        label = base_label if count == 1 else f"{base_label} ({count})"
        transaction_options[label] = tx

    selected_tx_label = st.selectbox("Selecciona un movimiento", list(transaction_options.keys()))
    return transaction_options, selected_tx_label, transaction_options[selected_tx_label]


def _handle_update_transaction(
    selected_tx: dict,
    edit_description: str,
    edit_amount: float,
    edit_currency: str,
    edit_type: str,
    edit_date: date,
    edit_time: time,
    edit_account_label: str,
    edit_category_label: str,
    account_options: dict[str, int],
    category_options: dict[str, int | None],
) -> None:
    """Validate and update the selected transaction."""
    if len(edit_description.strip()) < 2:
        st.error("La descripcion debe tener al menos 2 caracteres.")
        return

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
    _show_api_result(response, "Movimiento actualizado.", "No se pudo actualizar el movimiento.")


def _handle_delete_transaction(selected_tx: dict) -> None:
    """Delete the selected transaction and show feedback."""
    response = api_request("DELETE", f"/transactions/{selected_tx['id']}")
    if response.status_code == 204:
        st.success("Movimiento eliminado.")
        RERUN()
        return

    st.error(response.json().get("detail", "No se pudo eliminar el movimiento."))


def _render_edit_transaction_section(
    transactions: list[dict],
    account_options: dict[str, int],
    category_options: dict[str, int | None],
) -> None:
    """Render edit/delete controls for existing transactions."""
    render_section_header("Edicion", "Editar o eliminar movimientos", "Selecciona un registro y actualiza sus datos.")
    if not transactions:
        render_empty_state(
            "Sin movimientos registrados",
            "No hay transacciones todavía. Regresa a la pestaña 'Registrar' para crear tu primer movimiento.",
            icon="📊",
        )
        return

    # Show filterable transaction feed
    st.markdown("### 📋 Transacciones recientes")
    
    f_col_1, f_col_2 = st.columns([2, 1])
    with f_col_1:
        tx_type_filter = st.radio(
            "Tipo",
            ["Todo", "Ingresos", "Gastos"],
            horizontal=True,
            key="mov_edit_type_filter",
        )
    with f_col_2:
        limit = st.selectbox("Mostrar", [8, 12, 20, 30], index=1, key="mov_edit_limit")

    filtered_txs = transactions
    if tx_type_filter == "Ingresos":
        filtered_txs = [t for t in filtered_txs if t.get("transaction_type") == "income"]
    elif tx_type_filter == "Gastos":
        filtered_txs = [t for t in filtered_txs if t.get("transaction_type") == "expense"]

    # Sort by date descending
    filtered_txs = sorted(filtered_txs, key=lambda t: t.get("occurred_at", ""), reverse=True)

    render_tx_feed(filtered_txs, limit=limit)

    st.divider()
    st.markdown("### ✏️ Editar o eliminar")

    # Apply same filters to edit form for consistency
    edit_filter_col1, edit_filter_col2 = st.columns([2, 1])
    with edit_filter_col1:
        edit_type_filter = st.radio(
            "Filtrar por tipo",
            ["Todo", "Ingresos", "Gastos"],
            horizontal=True,
            key="mov_edit_form_type_filter",
        )
    with edit_filter_col2:
        search_query = st.text_input("Buscar descripción", key="mov_edit_search", placeholder="Ej: Café, Gasolina")

    # Filter transactions for selector
    filtered_for_selector = transactions
    if edit_type_filter == "Ingresos":
        filtered_for_selector = [t for t in filtered_for_selector if t.get("transaction_type") == "income"]
    elif edit_type_filter == "Gastos":
        filtered_for_selector = [t for t in filtered_for_selector if t.get("transaction_type") == "expense"]
    
    if search_query.strip():
        filtered_for_selector = [
            t for t in filtered_for_selector 
            if search_query.lower() in (t.get("description") or "").lower()
        ]

    # Sort by date descending for selector too
    filtered_for_selector = sorted(filtered_for_selector, key=lambda t: t.get("occurred_at", ""), reverse=True)

    if not filtered_for_selector:
        st.warning("No hay transacciones que coincidan con los filtros.")
        return

    _, _, selected_tx = _build_transaction_selector(filtered_for_selector)

    selected_dt = parse_iso_datetime(selected_tx["occurred_at"])
    category_label_lookup = {value: key for key, value in category_options.items()}
    selected_category_label = category_label_lookup.get(selected_tx.get("category_id"), "(Sin categoria)")
    account_label_lookup = {value: key for key, value in account_options.items()}
    current_account_label = account_label_lookup[selected_tx["account_id"]]
    current_description = str(selected_tx.get("description") or "")

    with st.form("edit_transaction_form"):
        e_col_1, e_col_2, e_col_3 = st.columns(3)
        with e_col_1:
            edit_description = st.text_input("Descripcion", value=current_description, key="edit_description") or ""
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

    st.caption("Tip: usa editar para ajustes menores y eliminar solo para movimientos incorrectos.")
    delete_transaction_clicked = st.button("Eliminar movimiento seleccionado", type="secondary", use_container_width=True)

    if save_changes:
        _handle_update_transaction(
            selected_tx,
            edit_description,
            edit_amount,
            edit_currency,
            edit_type,
            edit_date,
            edit_time,
            edit_account_label,
            edit_category_label,
            account_options,
            category_options,
        )

    if delete_transaction_clicked:
        _handle_delete_transaction(selected_tx)


def movements_screen() -> None:
    """Render CRUD UI for user movements (create, edit, delete)."""
    movement_data = _load_movement_data()
    if movement_data is None:
        return

    banks, accounts, categories, transactions = movement_data

    summary_col_1, summary_col_2 = st.columns(2)
    with summary_col_1:
        render_info_card(
            "Movimientos",
            f"{len(transactions)} registrados",
            sub=f"en {len(accounts)} cuenta(s)",
        )
    with summary_col_2:
        render_info_card(
            "Categorías",
            str(len(categories)),
            sub="disponibles",
        )

    tab_new, tab_manage = st.tabs(["Registrar", "Gestionar"])

    account_options, category_options = _build_options(accounts, categories)

    with tab_new:
        _render_create_transaction_form(account_options, category_options)

    with tab_manage:
        _render_edit_transaction_section(transactions, account_options, category_options)
