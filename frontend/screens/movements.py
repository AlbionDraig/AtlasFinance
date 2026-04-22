from __future__ import annotations

from datetime import date, datetime, time, timedelta
import re

import pandas as pd
import requests
import streamlit as st

from modules.api_client import api_request, parse_iso_datetime
from modules.components import (
    btn,
    date_field,
    inject_component_styles,
    number_field,
    section_header,
    select_field,
    text_field,
    time_field,
)
from modules.config import RERUN
from modules.notifications import show_error, show_success
from modules.ui import render_empty_state


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


TYPE_OPTIONS_UI = ["Gasto", "Ingreso"]
TYPE_UI_TO_API = {"Gasto": "expense", "Ingreso": "income"}
TYPE_API_TO_UI = {"expense": "Gasto", "income": "Ingreso"}
INCOME_CATEGORY_HINTS = (
    "salario",
    "sueldo",
    "ingreso",
    "venta",
    "freelance",
    "interes",
    "interés",
    "dividendo",
    "bono",
    "comision",
    "comisión",
    "reembolso",
    "premio",
)


def _is_income_category(label: str) -> bool:
    """Infer if a category label is income-oriented using practical keyword matching."""
    normalized = label.strip().lower()
    return any(hint in normalized for hint in INCOME_CATEGORY_HINTS)


def _category_labels_for_type(
    category_options: dict[str, int | None],
    transaction_type_ui: str,
) -> list[str]:
    """Return category labels filtered by selected transaction type."""
    all_labels = [label for label in category_options.keys() if label != "Sin categoría"]

    if transaction_type_ui == "Ingreso":
        filtered = [label for label in all_labels if _is_income_category(label)]
    else:
        filtered = [label for label in all_labels if not _is_income_category(label)]

    # Fallback to all labels if heuristic filtering removes everything.
    if not filtered:
        filtered = all_labels

    return ["Sin categoría", *filtered]


def _account_labels_for_currency(account_options: dict[str, int], currency: str) -> list[str]:
    """Return account labels that match the selected currency."""
    labels: list[str] = []
    for label in account_options.keys():
        currency_match = re.search(r"\((COP|USD)\)(?:\s*\(\d+\))?$", label)
        if currency_match and currency_match.group(1) == currency:
            labels.append(label)

    # Fallback to all accounts if parsing fails or no label matches.
    if not labels:
        labels = list(account_options.keys())
    return labels


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


def _form_default_values(account_options: dict[str, int]) -> dict[str, object]:
    """Build default form values for a new transaction."""
    now = datetime.now().replace(second=0, microsecond=0)
    first_acc = next(iter(account_options.keys()), "No hay cuentas")
    last_acc = st.session_state.get("mov_last_account_label")
    last_type_ui = st.session_state.get("mov_last_type_ui", "Gasto")
    if last_type_ui not in TYPE_OPTIONS_UI:
        last_type_ui = "Gasto"

    last_category_label = st.session_state.get("mov_last_category_label", "Sin categoría")
    last_description = str(st.session_state.get("mov_last_description", "")).strip()

    return {
        "mov_form_description": last_description,
        "mov_form_amount": 0.0,
        "mov_form_currency": st.session_state.get("mov_last_currency", "COP"),
        "mov_form_account_label": last_acc if last_acc in account_options else first_acc,
        "mov_form_type_ui": last_type_ui,
        "mov_form_category_label": last_category_label,
        "mov_form_date": date.today(),
        "mov_form_time": time(now.hour, now.minute),
    }


def _reset_transaction_form(account_options: dict[str, int]) -> None:
    """Reset the shared transaction form to creation mode."""
    defaults = _form_default_values(account_options)
    for key, value in defaults.items():
        st.session_state[key] = value
    st.session_state["mov_form_loaded_tx_id"] = None


def _reset_transaction_form_clean(account_options: dict[str, int]) -> None:
    """Hard reset the form to neutral defaults (without last-used autofill values)."""
    now = datetime.now().replace(second=0, microsecond=0)
    first_acc = next(iter(account_options.keys()), "No hay cuentas")
    st.session_state["mov_form_description"] = ""
    st.session_state["mov_form_amount"] = 0.0
    st.session_state["mov_form_currency"] = "COP"
    st.session_state["mov_form_account_label"] = first_acc
    st.session_state["mov_form_type_ui"] = "Gasto"
    st.session_state["mov_form_category_label"] = "Sin categoría"
    st.session_state["mov_form_date"] = date.today()
    st.session_state["mov_form_time"] = time(now.hour, now.minute)
    st.session_state["mov_form_loaded_tx_id"] = None


def _load_selected_transaction_into_form(
    selected_tx: dict,
    account_options: dict[str, int],
    category_options: dict[str, int | None],
) -> None:
    """Seed shared form fields from the selected transaction before rendering widgets."""
    selected_dt = parse_iso_datetime(selected_tx["occurred_at"])
    account_label_lookup = {value: key for key, value in account_options.items()}
    category_label_lookup = {value: key for key, value in category_options.items()}

    st.session_state["mov_form_description"] = str(selected_tx.get("description") or "")
    st.session_state["mov_form_amount"] = float(selected_tx.get("amount") or 0.0)
    st.session_state["mov_form_currency"] = str(selected_tx.get("currency") or "COP")
    st.session_state["mov_form_account_label"] = account_label_lookup.get(
        selected_tx.get("account_id"),
        next(iter(account_options.keys()), "No hay cuentas"),
    )
    st.session_state["mov_form_type_ui"] = TYPE_API_TO_UI.get(selected_tx.get("transaction_type"), "Gasto")
    st.session_state["mov_form_category_label"] = category_label_lookup.get(
        selected_tx.get("category_id"),
        "Sin categoría",
    )
    st.session_state["mov_form_date"] = selected_dt.date()
    st.session_state["mov_form_time"] = selected_dt.time().replace(second=0, microsecond=0)
    st.session_state["mov_form_loaded_tx_id"] = selected_tx["id"]


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
) -> tuple[bool, dict | None]:
    """Validate and create a new transaction."""
    if not account_options:
        st.error("Debes crear una cuenta antes de registrar movimientos.")
        return False, None

    if len(description.strip()) < 2:
        st.error("La descripción debe tener al menos 2 caracteres.")
        return False, None

    if amount <= 0:
        st.error("El monto debe ser mayor a 0.")
        return False, None

    account_currency_match = re.search(r"\((COP|USD)\)(?:\s*\(\d+\))?$", selected_account_label)
    account_currency = account_currency_match.group(1) if account_currency_match else None
    if account_currency and account_currency != currency:
        st.error("La moneda del movimiento debe coincidir con la moneda de la cuenta seleccionada.")
        return False, None

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
        try:
            created_tx = response.json()
        except Exception:
            created_tx = None
        show_success("Movimiento creado correctamente.")
        return True, created_tx

    try:
        error_detail = response.json().get("detail", "No se pudo crear el movimiento.")
    except Exception:
        error_detail = "No se pudo crear el movimiento."
    show_error(error_detail)
    return False, None


def _undo_last_created_transaction() -> None:
    """Delete the most recently created transaction from UI quick-action."""
    last_created = st.session_state.get("mov_last_created_tx")
    if not last_created or not last_created.get("id"):
        st.warning("No hay un movimiento reciente para deshacer.")
        return

    response = api_request("DELETE", f"/transactions/{last_created['id']}")
    if response.status_code == 204:
        st.session_state.pop("mov_last_created_tx", None)
        show_success("Se deshizo el último movimiento guardado.")
        return

    try:
        detail = response.json().get("detail", "No se pudo deshacer el último movimiento.")
    except Exception:
        detail = "No se pudo deshacer el último movimiento."
    show_error(detail)


def _undo_last_deleted_transaction() -> None:
    """Recreate the most recently deleted transaction from session snapshot."""
    deleted_tx = st.session_state.get("mov_last_deleted_tx")
    if not deleted_tx:
        st.warning("No hay eliminación reciente para deshacer.")
        return

    payload = {
        "description": str(deleted_tx.get("description") or "").strip(),
        "amount": float(deleted_tx.get("amount") or 0.0),
        "currency": str(deleted_tx.get("currency") or "COP"),
        "transaction_type": str(deleted_tx.get("transaction_type") or "expense"),
        "occurred_at": str(deleted_tx.get("occurred_at") or ""),
        "account_id": deleted_tx.get("account_id"),
        "category_id": deleted_tx.get("category_id"),
    }

    if (
        len(payload["description"]) < 2
        or payload["amount"] <= 0
        or not payload["occurred_at"]
        or not payload["account_id"]
    ):
        st.error("No se pudo deshacer: faltan datos del movimiento eliminado.")
        return

    response = api_request("POST", "/transactions/", payload=payload)
    if response.ok:
        st.session_state.pop("mov_last_deleted_tx", None)
        st.session_state["mov_undo_deleted_notice"] = "Se deshizo la eliminación del movimiento."
        RERUN()
        return

    try:
        detail = response.json().get("detail", "No se pudo restaurar el movimiento eliminado.")
    except Exception:
        detail = "No se pudo restaurar el movimiento eliminado."
    show_error(detail)


def _render_create_transaction_form(
    account_options: dict[str, int],
    category_options: dict[str, int | None],
    selected_tx: dict | None = None,
) -> None:
    """Render a unified form that edits the selected transaction or creates a new one."""
    if "mov_form_submitting" not in st.session_state:
        st.session_state["mov_form_submitting"] = False
    if "mov_form_loaded_tx_id" not in st.session_state:
        st.session_state["mov_form_loaded_tx_id"] = None

    default_values = _form_default_values(account_options)
    for key, value in default_values.items():
        if key not in st.session_state:
            st.session_state[key] = value

    if "mov_form_force_clean_reset" not in st.session_state:
        st.session_state["mov_form_force_clean_reset"] = False

    selected_tx_id = selected_tx.get("id") if selected_tx else None
    if st.session_state.get("mov_form_force_clean_reset", False):
        _reset_transaction_form_clean(account_options)
        st.session_state["mov_form_force_clean_reset"] = False
    elif selected_tx_id and st.session_state.get("mov_form_loaded_tx_id") != selected_tx_id:
        _load_selected_transaction_into_form(selected_tx, account_options, category_options)
    elif selected_tx is None and st.session_state.get("mov_form_loaded_tx_id") is None:
        _reset_transaction_form(account_options)

    section_header(
        "Registrar o ajustar movimiento",
        "Cuando eliges un movimiento en la tabla, este formulario se precarga para editarlo. Si no hay selección, crea uno nuevo.",
    )

    st.markdown(
        """
        <style>
        [data-testid="stDataFrame"] {
            border: 1px solid rgba(15, 23, 42, 0.10) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06) !important;
            background: #ffffff !important;
        }
        [data-testid="stDataFrame"] [role="row"]:hover {
            background: rgba(31, 111, 178, 0.06) !important;
        }
        [data-testid="stDataFrame"] [role="row"][aria-selected="true"] {
            background: rgba(31, 111, 178, 0.12) !important;
            box-shadow: inset 3px 0 0 #1f6fb2 !important;
        }
        [data-testid="stDataFrame"] [role="columnheader"] {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.02)) !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            border-bottom: 1px solid rgba(15, 23, 42, 0.10) !important;
        }
        [data-testid="stDataFrame"] [role="row"] [role="gridcell"] {
            border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
        }
        [data-testid="stDataFrame"] [role="row"]:nth-child(even) {
            background: rgba(148, 163, 184, 0.05) !important;
        }
        .af-selected-summary {
            border: 1px solid rgba(31, 111, 178, 0.20);
            background: linear-gradient(135deg, rgba(31, 111, 178, 0.10), rgba(22, 163, 184, 0.10));
            border-radius: 12px;
            padding: 0.6rem 0.8rem;
            margin-bottom: 0.35rem;
        }
        .af-selected-summary strong {
            color: #16365f;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <style>
        .stTextInput, .stNumberInput, .stSelectbox, .stDateInput, .stTimeInput {
            margin-bottom: 0.25rem !important;
        }
        .stTextInput label, .stNumberInput label, .stSelectbox label, .stDateInput label, .stTimeInput label {
            margin-bottom: 0.1rem !important;
        }
        .af-create-actions {
            position: sticky;
            bottom: 0.35rem;
            z-index: 10;
            padding-top: 0.35rem;
            padding-bottom: 0.15rem;
            background: linear-gradient(to top, rgba(244,246,250,0.96), rgba(244,246,250,0));
        }
        .af-create-actions .stButton > button {
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14) !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    active_mode = "edit" if selected_tx_id else "create"

    if active_mode == "edit":
        try:
            selected_amount = f"{float(selected_tx.get('amount', 0)):,.2f}"
        except (TypeError, ValueError):
            selected_amount = str(selected_tx.get("amount", "0"))

        st.markdown(
            (
                '<div class="af-selected-summary">'
                f"<strong>Seleccionado:</strong> {selected_tx.get('description', 'Movimiento')}"
                f" · {selected_amount} {selected_tx.get('currency', '')}"
                "</div>"
            ),
            unsafe_allow_html=True,
        )

        action_col, reset_col = st.columns([5, 1])
        with action_col:
            st.caption("Modo edición activo. Puedes guardar cambios o salir para crear un movimiento nuevo.")
        with reset_col:
            if btn("Crear nuevo", key="mov_form_start_new", variant="neutral", use_container_width=True):
                st.session_state["mov_selected_tx_id"] = None
                st.session_state["mov_form_loaded_tx_id"] = None
                st.session_state["mov_clear_table_selection_pending"] = True
                _reset_transaction_form(account_options)
                RERUN()
    else:
        last_created = st.session_state.get("mov_last_created_tx")
        if last_created:
            try:
                amount_text = f"{float(last_created.get('amount', 0)):,.2f}"
            except (TypeError, ValueError):
                amount_text = str(last_created.get("amount", "0"))
            last_col, undo_col = st.columns([5, 1])
            with last_col:
                st.caption(
                    f"Último guardado: {last_created.get('description', 'Movimiento')} · "
                    f"{amount_text} {last_created.get('currency', '')}"
                )
            with undo_col:
                btn(
                    "Deshacer",
                    key="mov_undo_last_created",
                    variant="warning",
                    on_click=_undo_last_created_transaction,
                    use_container_width=True,
                )

    t_col_1, t_col_2 = st.columns(2)
    with t_col_1:
        description = text_field("Descripción", key="mov_form_description", placeholder="Ej: Supermercado, Gasolina")
        min_amount = 0.01 if active_mode == "edit" else 0.0
        amount = number_field("Monto", min_value=min_amount, step=10.0, key="mov_form_amount")
        currency = select_field("Moneda", ["COP", "USD"], key="mov_form_currency")
        filtered_account_labels = _account_labels_for_currency(account_options, currency)
        if st.session_state.get("mov_form_account_label") not in filtered_account_labels:
            st.session_state["mov_form_account_label"] = filtered_account_labels[0]
        selected_account_label = select_field(
            "Cuenta",
            filtered_account_labels if account_options else ["No hay cuentas"],
            disabled=not bool(account_options),
            key="mov_form_account_label",
        )

    with t_col_2:
        transaction_type_ui = select_field("Tipo", TYPE_OPTIONS_UI, key="mov_form_type_ui")
        filtered_category_labels = _category_labels_for_type(category_options, transaction_type_ui)
        if st.session_state.get("mov_form_category_label") not in filtered_category_labels:
            st.session_state["mov_form_category_label"] = "Sin categoría"
        selected_category_label = select_field(
            "Categoría",
            filtered_category_labels,
            key="mov_form_category_label",
        )
        occurred_date = date_field("Fecha", key="mov_form_date")
        occurred_time = time_field("Hora", key="mov_form_time")

    st.caption("Consejo: la cuenta y la moneda deben coincidir para evitar errores de registro.")

    create_has_pending_changes = bool(description.strip()) or float(amount) > 0.0
    edit_has_pending_changes = False
    if active_mode == "edit" and selected_tx:
        current_type_api = TYPE_UI_TO_API[transaction_type_ui]
        current_account_id = account_options.get(selected_account_label)
        current_category_id = category_options.get(selected_category_label)
        selected_date = parse_iso_datetime(selected_tx["occurred_at"]).date()
        selected_time = parse_iso_datetime(selected_tx["occurred_at"]).time().replace(second=0, microsecond=0)
        edit_has_pending_changes = any(
            [
                description.strip() != str(selected_tx.get("description") or ""),
                float(amount) != float(selected_tx.get("amount") or 0.0),
                currency != str(selected_tx.get("currency") or ""),
                current_type_api != str(selected_tx.get("transaction_type") or ""),
                occurred_date != selected_date,
                occurred_time.replace(second=0, microsecond=0) != selected_time,
                current_account_id != selected_tx.get("account_id"),
                current_category_id != selected_tx.get("category_id"),
            ]
        )

    has_pending_changes = edit_has_pending_changes if active_mode == "edit" else create_has_pending_changes

    submit_transaction_top = False
    if active_mode == "create" and create_has_pending_changes:
        quick_action_cols = st.columns([3, 1])
        with quick_action_cols[1]:
            submit_transaction_top = btn(
                "Guardar ahora",
                key="mov_form_submit_top",
                variant="success",
                use_container_width=True,
                disabled=st.session_state.get("mov_form_submitting", False),
            )

    st.markdown('<div class="af-create-actions">', unsafe_allow_html=True)
    submit_cols = st.columns([1, 1, 1] if active_mode == "edit" else [2, 1])
    if active_mode == "edit":
        delete_armed_key = "mov_delete_armed_tx_id"
        if st.session_state.get(delete_armed_key) != selected_tx_id:
            st.session_state[delete_armed_key] = None

        with submit_cols[1]:
            arm_delete = btn(
                "Eliminar",
                key="mov_form_delete_arm",
                variant="danger-outline",
                use_container_width=True,
                disabled=st.session_state.get("mov_form_submitting", False),
            )
            if arm_delete:
                st.session_state[delete_armed_key] = selected_tx_id

            delete_transaction_clicked = False
            if st.session_state.get(delete_armed_key) == selected_tx_id:
                st.warning("Confirma eliminación. Esta acción no se puede deshacer.")
                confirm_col_a, confirm_col_b = st.columns(2)
                with confirm_col_a:
                    delete_transaction_clicked = btn(
                        "Confirmar",
                        key="mov_form_delete_confirm",
                        variant="danger",
                        use_container_width=True,
                    )
                with confirm_col_b:
                    if btn("Cancelar", key="mov_form_delete_cancel", variant="neutral", use_container_width=True):
                        st.session_state[delete_armed_key] = None
                        RERUN()

        submit_button_col = submit_cols[2]
    else:
        delete_transaction_clicked = False
        submit_button_col = submit_cols[1]

    with submit_button_col:
        submit_transaction_bottom = btn(
            "Guardar cambios" if active_mode == "edit" else "Guardar movimiento",
            key="mov_form_submit",
            variant="success",
            use_container_width=True,
            disabled=(not has_pending_changes) or st.session_state.get("mov_form_submitting", False),
        )
    st.markdown("</div>", unsafe_allow_html=True)

    if active_mode == "edit" and not edit_has_pending_changes:
        st.caption("No hay cambios pendientes para guardar.")

    if delete_transaction_clicked and selected_tx:
        _handle_delete_transaction(selected_tx)

    if submit_transaction_top or submit_transaction_bottom:
        st.session_state["mov_form_submitting"] = True
        try:
            if active_mode == "edit" and selected_tx:
                _handle_update_transaction(
                    selected_tx,
                    description,
                    amount,
                    currency,
                    TYPE_UI_TO_API[transaction_type_ui],
                    occurred_date,
                    occurred_time,
                    selected_account_label,
                    selected_category_label,
                    account_options,
                    category_options,
                )
            else:
                success, created_tx = _handle_create_transaction(
                    description,
                    amount,
                    currency,
                    TYPE_UI_TO_API[transaction_type_ui],
                    occurred_date,
                    occurred_time,
                    selected_account_label,
                    selected_category_label,
                    account_options,
                    category_options,
                )

                if success:
                    st.session_state["mov_last_currency"] = currency
                    st.session_state["mov_last_account_label"] = selected_account_label
                    st.session_state["mov_last_type_ui"] = transaction_type_ui
                    st.session_state["mov_last_category_label"] = selected_category_label
                    st.session_state["mov_last_description"] = description.strip()
                    st.session_state["mov_last_created_tx"] = created_tx or {
                        "description": description.strip(),
                        "amount": amount,
                        "currency": currency,
                    }
                    _reset_transaction_form(account_options)
                    RERUN()
        finally:
            st.session_state["mov_form_submitting"] = False


def _render_transactions_table(transactions: list[dict], account_options: dict[str, int]) -> dict | None:
    """Render the movements table with filters and return the selected row transaction."""
    st.markdown(
        """
        <style>
        .af-mov-title {
            font-size: 2rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 0.25rem;
            margin-bottom: 0.9rem;
            letter-spacing: -0.01em;
        }
        .af-mov-filters-title {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1e293b;
            margin-top: 0.2rem;
            margin-bottom: 0.45rem;
        }
        .af-mov-table-gap {
            height: 0.35rem;
        }
        .st-key-mov_transactions_table [data-testid="stDataFrame"] {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
        }
        .st-key-mov_transactions_table [data-testid="stDataFrame"] thead tr th {
            background: #f8fafc !important;
            color: #334155 !important;
            font-weight: 700 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            letter-spacing: 0.008em;
            font-size: 0.8rem !important;
            padding-top: 0.68rem !important;
            padding-bottom: 0.68rem !important;
        }
        .st-key-mov_transactions_table [data-testid="stDataFrame"] tbody tr td {
            border-bottom: 1px solid #edf2f7 !important;
            padding-top: 0.62rem !important;
            padding-bottom: 0.62rem !important;
        }
        .st-key-mov_transactions_table [data-testid="stDataFrame"] tbody tr:last-child td {
            border-bottom: none !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    section_header("Movimientos")

    tx_dates = [parse_iso_datetime(str(tx.get("occurred_at") or "")).date() for tx in transactions]
    default_from = min(tx_dates) if tx_dates else date.today()
    default_to = max(tx_dates) if tx_dates else date.today()
    account_label_lookup = {value: key for key, value in account_options.items()}
    account_filter_options = ["Todas", *sorted(account_options.keys())]

    filter_defaults = {
        "mov_table_type_filter": "Todo",
        "mov_table_search": "",
        "mov_table_currency_filter": "Todas",
        "mov_table_account_filter": "Todas",
        "mov_table_period_filter": "Todo",
        "mov_table_from_date": default_from,
        "mov_table_to_date": default_to,
        "mov_table_limit": 12,
    }
    for key, value in filter_defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    if st.session_state.get("mov_table_account_filter") not in account_filter_options:
        st.session_state["mov_table_account_filter"] = "Todas"

    def _reset_movement_filters() -> None:
        for key, value in filter_defaults.items():
            st.session_state[key] = value

    st.markdown("**Filtros**")
    top_col_1, top_col_2, top_col_3, top_col_4 = st.columns([1.2, 1.0, 1.1, 0.9])
    with top_col_1:
        tx_type_filter = select_field("Tipo", ["Todo", "Ingresos", "Gastos"], key="mov_table_type_filter")
    with top_col_2:
        currency_filter = select_field("Moneda", ["Todas", "COP", "USD"], key="mov_table_currency_filter")
    with top_col_3:
        account_filter = select_field("Cuenta", account_filter_options, key="mov_table_account_filter")
    with top_col_4:
        period_filter = select_field(
            "Periodo",
            ["Todo", "Hoy", "Ultimos 7 dias", "Ultimos 30 dias", "Mes actual", "Personalizado"],
            key="mov_table_period_filter",
        )

    today = date.today()
    if period_filter != "Personalizado":
        if period_filter == "Hoy":
            st.session_state["mov_table_from_date"] = today
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Ultimos 7 dias":
            st.session_state["mov_table_from_date"] = today - timedelta(days=6)
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Ultimos 30 dias":
            st.session_state["mov_table_from_date"] = today - timedelta(days=29)
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Mes actual":
            st.session_state["mov_table_from_date"] = today.replace(day=1)
            st.session_state["mov_table_to_date"] = today
        else:
            st.session_state["mov_table_from_date"] = default_from
            st.session_state["mov_table_to_date"] = default_to

    bottom_col_1, bottom_col_2, bottom_col_3, bottom_col_4 = st.columns([1.2, 0.8, 0.8, 0.7])
    with bottom_col_1:
        search_query = text_field("Buscar descripción", key="mov_table_search", placeholder="Ej: Cafe, Gasolina")
    with bottom_col_2:
        from_date = date_field("Desde", key="mov_table_from_date")
    with bottom_col_3:
        to_date = date_field("Hasta", key="mov_table_to_date")
    with bottom_col_4:
        limit = select_field("Mostrar", [8, 12, 20, 30], key="mov_table_limit")

    if from_date > to_date:
        st.warning("El rango de fechas es invalido. Ajusta Desde/Hasta.")
        return None

    aux_col_1, aux_col_2 = st.columns([5, 1])

    with aux_col_1:
        active_filters: list[str] = []
        if tx_type_filter != "Todo":
            active_filters.append(f"Tipo: {tx_type_filter}")
        if currency_filter != "Todas":
            active_filters.append(f"Moneda: {currency_filter}")
        if account_filter != "Todas":
            active_filters.append(f"Cuenta: {account_filter}")
        if period_filter != "Todo":
            active_filters.append(f"Periodo: {period_filter}")
        if search_query.strip():
            active_filters.append(f"Busqueda: {search_query.strip()}")
        if from_date != default_from or to_date != default_to:
            active_filters.append(f"Fechas: {from_date} a {to_date}")
        if active_filters:
            st.caption("Filtros activos: " + " | ".join(active_filters))
    with aux_col_2:
        btn("Limpiar", key="mov_table_clear_filters", variant="neutral", use_container_width=True, on_click=_reset_movement_filters)

    filtered_txs = transactions
    if tx_type_filter == "Ingresos":
        filtered_txs = [t for t in filtered_txs if t.get("transaction_type") == "income"]
    elif tx_type_filter == "Gastos":
        filtered_txs = [t for t in filtered_txs if t.get("transaction_type") == "expense"]

    if currency_filter != "Todas":
        filtered_txs = [t for t in filtered_txs if str(t.get("currency") or "") == currency_filter]

    if account_filter != "Todas":
        filtered_txs = [
            t for t in filtered_txs if account_label_lookup.get(t.get("account_id"), "") == account_filter
        ]

    filtered_txs = [
        t
        for t in filtered_txs
        if from_date <= parse_iso_datetime(str(t.get("occurred_at") or "")).date() <= to_date
    ]

    if search_query.strip():
        query = search_query.strip().lower()
        filtered_txs = [
            t for t in filtered_txs if query in str(t.get("description") or "").lower()
        ]

    filtered_txs = sorted(filtered_txs, key=lambda t: t.get("occurred_at", ""), reverse=True)
    visible_txs = filtered_txs[:limit]

    st.markdown('<div class="af-mov-table-gap"></div>', unsafe_allow_html=True)
    st.caption(f"Mostrando {len(visible_txs)} de {len(filtered_txs)} movimientos filtrados.")

    if not visible_txs:
        st.warning("No hay movimientos que coincidan con los filtros.")
        if st.session_state.get("mov_selected_tx_id") is not None:
            st.session_state["mov_selected_tx_id"] = None
            st.session_state["mov_form_loaded_tx_id"] = None
        return None

    table_rows: list[dict[str, object]] = []

    def _compact_account_label(raw_label: str) -> str:
        # Avoid repeating currency in account when currency is already shown in its own column.
        return re.sub(r"\s+\((COP|USD)\)", "", raw_label).strip()

    for tx in visible_txs:
        tx_type = tx.get("transaction_type", "expense")
        amount_value = float(tx.get("amount") or 0.0)
        account_label_raw = account_label_lookup.get(tx.get("account_id"), "Cuenta")
        table_rows.append(
            {
                "Fecha": parse_iso_datetime(str(tx.get("occurred_at") or "")).strftime("%d/%m/%Y"),
                "Descripción": str(tx.get("description") or "Movimiento"),
                "Tipo": "Gasto" if tx_type == "expense" else "Ingreso",
                "Monto": f"{amount_value:,.2f}",
                "Moneda": str(tx.get("currency") or ""),
                "Cuenta": _compact_account_label(account_label_raw),
            }
        )

    def _auto_text_width(values: list[str]) -> str:
        max_len = max((len(v) for v in values), default=0)
        if max_len <= 10:
            return "small"
        if max_len <= 24:
            return "medium"
        return "large"

    table_df = pd.DataFrame(table_rows)

    desc_width = _auto_text_width([str(v) for v in table_df.get("Descripción", [])])
    tipo_width = _auto_text_width([str(v) for v in table_df.get("Tipo", [])])
    monto_width = _auto_text_width([str(v) for v in table_df.get("Monto", [])])
    moneda_width = _auto_text_width([str(v) for v in table_df.get("Moneda", [])])
    cuenta_width = _auto_text_width([str(v) for v in table_df.get("Cuenta", [])])

    force_empty_selection = False
    if st.session_state.get("mov_clear_table_selection_pending", False):
        widget_state = st.session_state.get("mov_transactions_table")
        if isinstance(widget_state, dict):
            # Streamlit widget state is read-only for nested mutation: assign a full new dict.
            selection_dict = widget_state.get("selection")
            if not isinstance(selection_dict, dict):
                selection_dict = {}
            new_widget_state = dict(widget_state)
            new_selection = dict(selection_dict)
            new_selection["rows"] = []
            new_widget_state["selection"] = new_selection
            st.session_state["mov_transactions_table"] = new_widget_state
        st.session_state["mov_clear_table_selection_pending"] = False
        force_empty_selection = True

    def _style_row_by_type(row: pd.Series) -> list[str]:
        is_odd = int(row.name) % 2 == 1
        is_expense = row.get("Tipo") == "Gasto"
        row_bg = "#ffffff" if not is_odd else "#fafcff"
        base_text_color = "#1f2937"

        cell_styles: list[str] = []
        for col_name in row.index:
            style = f"color: {base_text_color}; background-color: {row_bg};"

            if col_name == "Tipo":
                if is_expense:
                    style += " color: #be123c; font-weight: 700;"
                else:
                    style += " color: #047857; font-weight: 700;"

            if col_name == "Monto":
                monto_color = "#be123c" if is_expense else "#0f766e"
                style += (
                    f" font-weight: 700; text-align: right; font-variant-numeric: tabular-nums;"
                    f" color: {monto_color};"
                )
            elif col_name == "Moneda":
                style += " color: #475569; font-weight: 600; text-align: center;"
            elif col_name == "Fecha":
                style += " color: #334155; font-weight: 600;"
            elif col_name == "Cuenta":
                style += " color: #475569;"
            elif col_name == "Descripción":
                style += " font-weight: 600;"

            cell_styles.append(style)
        return cell_styles

    styled_df = (
        table_df.style.apply(_style_row_by_type, axis=1)
        .set_properties(subset=["Tipo", "Moneda"], **{"text-align": "center"})
    )

    selection_event = st.dataframe(
        styled_df,
        hide_index=True,
        use_container_width=True,
        on_select="rerun",
        selection_mode="single-row",
        key="mov_transactions_table",
        column_config={
            "Fecha": st.column_config.TextColumn("Fecha", width="small"),
            "Descripción": st.column_config.TextColumn("Descripción", width=desc_width),
            "Tipo": st.column_config.TextColumn("Tipo", width=tipo_width),
            "Monto": st.column_config.TextColumn("Monto", width=monto_width),
            "Moneda": st.column_config.TextColumn("Moneda", width=moneda_width),
            "Cuenta": st.column_config.TextColumn("Cuenta", width=cuenta_width),
        },
    )

    selected_id = st.session_state.get("mov_selected_tx_id")
    selected_rows: list[int] = []
    explicit_empty_selection = False
    if selection_event is not None:
        selection_data = getattr(selection_event, "selection", None)
        selected_rows = list(getattr(selection_data, "rows", []) or [])
        explicit_empty_selection = selection_data is not None and len(selected_rows) == 0

    if force_empty_selection:
        selected_rows = []
        explicit_empty_selection = True

    if not selected_rows:
        # Fallback to widget state in case the event object does not carry rows on this rerun.
        widget_state = st.session_state.get("mov_transactions_table")
        selection_dict: dict = {}
        if isinstance(widget_state, dict):
            selection_dict = widget_state.get("selection", {}) or {}
        widget_rows = selection_dict.get("rows", []) if isinstance(selection_dict, dict) else []
        if widget_rows:
            selected_rows = list(widget_rows)
        elif isinstance(widget_state, dict) and "selection" in widget_state:
            explicit_empty_selection = True

    selected_tx = None
    if selected_rows:
        selected_index = selected_rows[0]
        if 0 <= selected_index < len(visible_txs):
            selected_tx = visible_txs[selected_index]
            st.session_state["mov_selected_tx_id"] = selected_tx["id"]
    else:
        # If the user explicitly deseleced the current row, clear edit mode and return to create mode.
        if explicit_empty_selection and selected_id is not None:
            st.session_state["mov_selected_tx_id"] = None
            st.session_state["mov_form_loaded_tx_id"] = None
            selected_tx = None
        else:
            selected_tx = next((tx for tx in visible_txs if tx.get("id") == selected_id), None)
            if selected_tx is None and selected_id is not None and selected_id not in {tx.get("id") for tx in filtered_txs}:
                st.session_state["mov_selected_tx_id"] = None

    if selected_tx:
        amount_value = float(selected_tx.get("amount") or 0.0)
        st.caption(
            f"Seleccionado: {selected_tx.get('description', 'Movimiento')} · {amount_value:,.2f} {selected_tx.get('currency', '')}"
        )

    return selected_tx


def _render_undo_deleted_footer() -> None:
    """Render undo action for last deleted movement at the bottom of the screen."""
    last_deleted = st.session_state.get("mov_last_deleted_tx")
    if not last_deleted:
        return

    try:
        deleted_amount = f"{float(last_deleted.get('amount', 0)):,.2f}"
    except (TypeError, ValueError):
        deleted_amount = str(last_deleted.get("amount", "0"))

    st.markdown(
        """
        <style>
        .af-undo-footer {
            border: 1px solid rgba(245, 158, 11, 0.35);
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.08));
            border-radius: 12px;
            padding: 0.55rem 0.75rem;
            margin-top: 0.15rem;
            margin-bottom: 0.25rem;
        }
        .af-undo-footer strong {
            color: #854d0e;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.divider()
    st.markdown(
        (
            '<div class="af-undo-footer">'
            "<strong>Acción reciente:</strong> Movimiento eliminado. Puedes deshacer esta acción ahora."
            "</div>"
        ),
        unsafe_allow_html=True,
    )
    undo_info_col, undo_action_col = st.columns([5, 1])
    with undo_info_col:
        st.caption(
            f"Último eliminado: {last_deleted.get('description', 'Movimiento')} · "
            f"{deleted_amount} {last_deleted.get('currency', '')}"
        )
    with undo_action_col:
        if btn("Deshacer eliminación", key="mov_undo_last_deleted", variant="warning", use_container_width=True):
            _undo_last_deleted_transaction()


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
        st.error("La descripción debe tener al menos 2 caracteres.")
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
        st.session_state["mov_last_deleted_tx"] = {
            "description": selected_tx.get("description"),
            "amount": selected_tx.get("amount"),
            "currency": selected_tx.get("currency"),
            "transaction_type": selected_tx.get("transaction_type"),
            "occurred_at": selected_tx.get("occurred_at"),
            "account_id": selected_tx.get("account_id"),
            "category_id": selected_tx.get("category_id"),
        }
        st.session_state["mov_selected_tx_id"] = None
        st.session_state["mov_form_loaded_tx_id"] = None
        st.session_state["mov_clear_table_selection_pending"] = True
        st.session_state["mov_form_force_clean_reset"] = True
        st.session_state["mov_delete_armed_tx_id"] = None
        st.success("Movimiento eliminado. Puedes usar 'Deshacer eliminación'.")
        RERUN()
        return

    st.error(response.json().get("detail", "No se pudo eliminar el movimiento."))


def movements_screen() -> None:
    """Render CRUD UI for user movements (create, edit, delete)."""
    inject_component_styles()

    movement_data = _load_movement_data()
    if movement_data is None:
        return

    _, accounts, categories, transactions = movement_data
    account_options, category_options = _build_options(accounts, categories)

    undo_notice = st.session_state.pop("mov_undo_deleted_notice", None)
    if undo_notice:
        if hasattr(st, "toast"):
            st.toast(undo_notice, icon="✅")
        else:
            show_success(undo_notice)

    if not transactions:
        render_empty_state(
            "Sin movimientos registrados",
            "Todavía no hay transacciones. Usa el formulario inferior para crear la primera.",
            icon="📊",
        )
        selected_tx = None
    else:
        selected_tx = _render_transactions_table(transactions, account_options)
    st.divider()
    _render_create_transaction_form(account_options, category_options, selected_tx=selected_tx)
    _render_undo_deleted_footer()
