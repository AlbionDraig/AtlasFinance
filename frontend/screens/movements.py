from __future__ import annotations

import html as _html
import re
from datetime import date, datetime, time, timedelta

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
from modules.notifications import show_error, show_info, show_success, show_warning
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


def _currency_from_account_label(account_label: str) -> str | None:
    """Extract currency code from account label like 'Ahorro (COP)'."""
    match = re.search(r"\((COP|USD)\)(?:\s*\(\d+\))?$", str(account_label or ""))
    return match.group(1) if match else None


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
        show_error(f"No pudimos cargar tus movimientos. Inténtalo nuevamente. ({exc})")
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


def _sync_amount_display_state() -> None:
    """Keep number_field display/session keys aligned for mov_form_amount."""
    amount_value = float(st.session_state.get("mov_form_amount", 0.0) or 0.0)
    us_formatted = f"{amount_value:,.2f}"
    st.session_state["mov_form_amount__display"] = (
        us_formatted.replace(",", "_").replace(".", ",").replace("_", ".")
    )
    st.session_state["mov_form_amount__display_locale"] = "es_CO"


def _reset_transaction_form(account_options: dict[str, int]) -> None:
    """Reset the shared transaction form to creation mode."""
    defaults = _form_default_values(account_options)
    for key, value in defaults.items():
        st.session_state[key] = value
    _sync_amount_display_state()
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
    _sync_amount_display_state()
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
    _sync_amount_display_state()
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
        show_error("Primero crea una cuenta para registrar movimientos.")
        return False, None

    if len(description.strip()) < 2:
        show_error("Escribe una descripción de al menos 2 caracteres.")
        return False, None

    if amount <= 0:
        show_error("El monto debe ser mayor que 0.")
        return False, None

    account_currency_match = re.search(r"\((COP|USD)\)(?:\s*\(\d+\))?$", selected_account_label)
    account_currency = account_currency_match.group(1) if account_currency_match else None
    if account_currency and account_currency != currency:
        show_error("La moneda del movimiento debe ser la misma que la de la cuenta.")
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
        show_success("Movimiento guardado con éxito.")
        return True, created_tx

    try:
        error_detail = response.json().get("detail", "No pudimos guardar el movimiento.")
    except Exception:
        error_detail = "No pudimos guardar el movimiento."
    show_error(error_detail)
    return False, None


def _undo_last_created_transaction() -> None:
    """Delete the most recently created transaction from UI quick-action."""
    last_created = st.session_state.get("mov_last_created_tx")
    if not last_created or not last_created.get("id"):
        show_warning("No hay un movimiento reciente para deshacer.")
        return

    response = api_request("DELETE", f"/transactions/{last_created['id']}")
    if response.status_code == 204:
        st.session_state.pop("mov_last_created_tx", None)
        show_success("Se deshizo el último movimiento guardado.")
        return

    try:
        detail = response.json().get("detail", "No pudimos deshacer el último movimiento.")
    except Exception:
        detail = "No pudimos deshacer el último movimiento."
    show_error(detail)


def _render_create_transaction_form(
    account_options: dict[str, int],
    category_options: dict[str, int | None],
    transactions: list[dict],
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
    elif selected_tx is None and st.session_state.get("mov_form_loaded_tx_id") is not None:
        # When deselecting an edited row, clear the form to avoid stale values
        # keeping the submit button enabled in create mode.
        _reset_transaction_form_clean(account_options)

    section_header(
        "Registrar o ajustar movimiento",
        "Selecciona un movimiento en la tabla para editarlo. Si no hay selección, el formulario crea uno nuevo.",
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
        /* Keep only the movement type segmented control left-aligned in its column. */
        .af-create-actions {
            margin-top: 0.65rem;
            padding-top: 0.55rem;
            border-top: 1px solid #e2e8f0;
        }
        .af-create-actions .stButton > button {
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14) !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    active_mode = "edit" if selected_tx_id else "create"

    mode_label = "Editando movimiento" if active_mode == "edit" else "Creando movimiento"
    mode_class = "edit" if active_mode == "edit" else "create"
    st.markdown(
        f'<div class="af-mov-mode-badge {mode_class}">{mode_label}</div>',
        unsafe_allow_html=True,
    )

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
            st.caption("Estás editando este movimiento. Guarda tus cambios o vuelve a crear uno nuevo.")
        with reset_col:
            if btn("Crear nuevo", key="mov_form_start_new", variant="neutral", use_container_width=True):
                st.session_state["mov_selected_tx_id"] = None
                st.session_state["mov_form_loaded_tx_id"] = None
                st.session_state["mov_clear_table_selection_pending"] = True
                st.session_state["mov_form_force_clean_reset"] = True
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

    row1_col1, row1_col2 = st.columns(2)
    with row1_col1:
        description = text_field("Descripción", key="mov_form_description", placeholder="Ej: Supermercado, Gasolina")
    with row1_col2:
        transaction_type_ui = select_field("Tipo", TYPE_OPTIONS_UI, key="mov_form_type_ui")

    row2_col1, row2_col2 = st.columns(2)
    with row2_col1:
        min_amount = 0.01 if active_mode == "edit" else 0.0
        amount = number_field("Monto", min_value=min_amount, step=10.0, key="mov_form_amount")
    with row2_col2:
        filtered_category_labels = _category_labels_for_type(category_options, transaction_type_ui)
        if st.session_state.get("mov_form_category_label") not in filtered_category_labels:
            st.session_state["mov_form_category_label"] = "Sin categoría"
        selected_category_label = select_field(
            "Categoría",
            filtered_category_labels,
            key="mov_form_category_label",
        )

    account_label_options = list(account_options.keys()) if account_options else ["No hay cuentas"]
    has_available_accounts = bool(account_options)

    if has_available_accounts:
        if st.session_state.get("mov_form_account_label") not in account_label_options:
            st.session_state["mov_form_account_label"] = account_label_options[0]
    elif st.session_state.get("mov_form_account_label") != "No hay cuentas":
        st.session_state["mov_form_account_label"] = "No hay cuentas"

    row3_col1, row3_col2 = st.columns(2)
    with row3_col1:
        selected_account_label = select_field(
            "Cuenta",
            account_label_options,
            disabled=not has_available_accounts,
            key="mov_form_account_label",
        )
    with row3_col2:
        occurred_date = date_field("Fecha", key="mov_form_date")

    derived_currency = _currency_from_account_label(selected_account_label)
    currency = derived_currency or str(st.session_state.get("mov_form_currency") or "COP")
    st.session_state["mov_form_currency"] = currency

    occurred_time = time_field("Hora", key="mov_form_time")

    st.caption("La moneda se define automáticamente con la cuenta seleccionada.")

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

    # ── Delete confirmation dialog (modal) ────────────────────────────────
    if (
        active_mode == "edit"
        and selected_tx
        and st.session_state.get("mov_delete_dialog_tx_id") == selected_tx_id
        and hasattr(st, "dialog")
    ):
        dialog_tx = selected_tx
        dialog_tx_id = selected_tx_id

        @st.dialog("¿Eliminar este movimiento?")
        def _confirm_delete_dialog() -> None:
            tx_description = str(dialog_tx.get("description") or "Movimiento")
            tx_amount = float(dialog_tx.get("amount") or 0.0)
            tx_currency = str(dialog_tx.get("currency") or "")
            st.write(
                f"Vas a eliminar **{tx_description}** por **{tx_amount:,.2f} {tx_currency}**."
            )
            st.caption(
                "Podrás deshacer esta acción brevemente desde el aviso que aparecerá al final de la pantalla."
            )
            confirm_col, cancel_col = st.columns(2)
            with confirm_col:
                if btn(
                    "Sí, eliminar",
                    key="mov_dialog_delete_confirm",
                    variant="danger",
                    use_container_width=True,
                ):
                    st.session_state["mov_confirm_delete_trigger"] = dialog_tx_id
                    st.session_state["mov_delete_dialog_tx_id"] = None
                    RERUN()
            with cancel_col:
                if btn(
                    "Cancelar",
                    key="mov_dialog_delete_cancel",
                    variant="neutral",
                    use_container_width=True,
                ):
                    st.session_state["mov_delete_dialog_tx_id"] = None
                    RERUN()

        _confirm_delete_dialog()

    actions_col, _ = st.columns([2.15, 1.0])
    with actions_col:
        st.markdown('<div class="af-create-actions">', unsafe_allow_html=True)
        submit_cols = st.columns([1, 1, 1] if active_mode == "edit" else [1.2, 1])
        if active_mode == "edit":
            delete_dialog_key = "mov_delete_dialog_tx_id"

            with submit_cols[1]:
                arm_delete = btn(
                    "Eliminar",
                    key="mov_form_delete_arm",
                    variant="danger",
                    use_container_width=True,
                    disabled=st.session_state.get("mov_form_submitting", False),
                )
                if arm_delete:
                    st.session_state[delete_dialog_key] = selected_tx_id

            delete_transaction_clicked = (
                st.session_state.pop("mov_confirm_delete_trigger", None) == selected_tx_id
            )
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
        st.caption("Por ahora no tienes cambios pendientes por guardar.")

    if delete_transaction_clicked and selected_tx:
        _handle_delete_transaction(selected_tx)

    if submit_transaction_bottom:
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
                    st.session_state["mov_selected_tx_id"] = None
                    st.session_state["mov_form_loaded_tx_id"] = None
                    st.session_state["mov_clear_table_selection_pending"] = True
                    st.session_state["mov_form_force_clean_reset"] = True
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
            font-size: 1.12rem;
            font-weight: 700;
            color: #1e293b;
            margin-top: 0.08rem;
            margin-bottom: 0.35rem;
        }
        .af-mov-chips {
            font-size: 0.82rem;
            color: #334155;
            margin: 0.2rem 0 0.35rem 0;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.35rem;
        }
        .af-mov-chips strong {
            color: #0f172a;
            margin-right: 0.15rem;
        }
        .af-mov-chip {
            display: inline-flex;
            align-items: center;
            padding: 0.18rem 0.55rem;
            border-radius: 999px;
            background: rgba(31, 111, 178, 0.10);
            color: #16365f;
            border: 1px solid rgba(31, 111, 178, 0.20);
            font-weight: 600;
            font-size: 0.78rem;
            white-space: nowrap;
        }
        .af-mov-page-label {
            text-align: center;
            font-size: 0.88rem;
            color: #334155;
            padding: 0.45rem 0;
        }
        .af-mov-mode-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.22rem 0.6rem;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.01em;
            margin-left: 0.5rem;
            vertical-align: middle;
        }
        .af-mov-mode-badge.edit {
            background: rgba(234, 179, 8, 0.14);
            color: #854d0e;
            border: 1px solid rgba(234, 179, 8, 0.38);
        }
        .af-mov-mode-badge.create {
            background: rgba(16, 185, 129, 0.12);
            color: #065f46;
            border: 1px solid rgba(16, 185, 129, 0.34);
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
        "mov_table_page_size": 12,
        "mov_table_page": 1,
    }
    for key, value in filter_defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    if st.session_state.get("mov_table_account_filter") not in account_filter_options:
        st.session_state["mov_table_account_filter"] = "Todas"

    def _reset_movement_filters() -> None:
        for key, value in filter_defaults.items():
            st.session_state[key] = value

    st.markdown(
        '<div class="af-mov-filters-title">Filtros</div>',
        unsafe_allow_html=True,
    )
    row1_c1, row1_c2, row1_c3, row1_c4 = st.columns([1.6, 0.9, 0.9, 1.2])
    with row1_c1:
        search_query = text_field(
            "Buscar descripción",
            key="mov_table_search",
            placeholder="Ej: Café, Gasolina",
        )
    with row1_c2:
        tx_type_filter = select_field("Tipo", ["Todo", "Ingresos", "Gastos"], key="mov_table_type_filter")
    with row1_c3:
        currency_filter = select_field("Moneda", ["Todas", "COP", "USD"], key="mov_table_currency_filter")
    with row1_c4:
        account_filter = select_field("Cuenta", account_filter_options, key="mov_table_account_filter")

    row2_c1, row2_c2, row2_c3, row2_c4 = st.columns([1.2, 0.9, 0.9, 0.9])
    with row2_c1:
        period_filter = select_field(
            "Periodo",
            ["Todo", "Hoy", "Últimos 7 días", "Últimos 30 días", "Mes actual", "Personalizado"],
            key="mov_table_period_filter",
        )

    today = date.today()
    if period_filter != "Personalizado":
        if period_filter == "Hoy":
            st.session_state["mov_table_from_date"] = today
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Últimos 7 días":
            st.session_state["mov_table_from_date"] = today - timedelta(days=6)
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Últimos 30 días":
            st.session_state["mov_table_from_date"] = today - timedelta(days=29)
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Mes actual":
            st.session_state["mov_table_from_date"] = today.replace(day=1)
            st.session_state["mov_table_to_date"] = today
        elif period_filter == "Todo":
            st.session_state["mov_table_from_date"] = default_from
            st.session_state["mov_table_to_date"] = default_to

    with row2_c2:
        from_date = date_field("Desde", key="mov_table_from_date")
    with row2_c3:
        to_date = date_field("Hasta", key="mov_table_to_date")
    with row2_c4:
        page_size = select_field("Por página", [8, 12, 20, 30], key="mov_table_page_size")

    if from_date > to_date:
        show_warning("El rango de fechas no es válido. Revisa 'Desde' y 'Hasta'.")
        return None

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
        active_filters.append(f"Búsqueda: {search_query.strip()}")
    if from_date != default_from or to_date != default_to:
        active_filters.append(f"Fechas: {from_date} a {to_date}")

    aux_col_1, aux_col_2 = st.columns([5, 1])
    with aux_col_1:
        if active_filters:
            chips = "".join(f'<span class="af-mov-chip">{_html.escape(f)}</span>' for f in active_filters)
            st.markdown(
                f'<div class="af-mov-chips"><strong>Filtros activos:</strong> {chips}</div>',
                unsafe_allow_html=True,
            )
        else:
            st.caption("Sin filtros activos. Estás viendo todos los movimientos.")
    with aux_col_2:
        btn(
            "Limpiar filtros",
            key="mov_table_clear_filters",
            variant="danger-outline",
            use_container_width=True,
            on_click=_reset_movement_filters,
            disabled=not active_filters,
        )

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

    # Reset to first page whenever filters or page size change.
    filter_signature = (
        tx_type_filter,
        currency_filter,
        account_filter,
        period_filter,
        from_date.isoformat(),
        to_date.isoformat(),
        search_query.strip(),
        page_size,
    )
    if st.session_state.get("mov_table_filter_signature") != filter_signature:
        st.session_state["mov_table_filter_signature"] = filter_signature
        st.session_state["mov_table_page"] = 1

    total_items = len(filtered_txs)
    total_pages = max(1, (total_items + page_size - 1) // page_size) if total_items else 1
    current_page = int(st.session_state.get("mov_table_page") or 1)
    if current_page < 1:
        current_page = 1
    if current_page > total_pages:
        current_page = total_pages
    st.session_state["mov_table_page"] = current_page

    start_index = (current_page - 1) * page_size
    end_index = start_index + page_size
    visible_txs = filtered_txs[start_index:end_index]

    if not visible_txs:
        show_info("No hay movimientos que coincidan con los filtros. Ajusta o limpia los filtros para ver más resultados.")
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
        tipo_label = "▼ Gasto" if tx_type == "expense" else "▲ Ingreso"
        table_rows.append(
            {
                "Fecha": parse_iso_datetime(str(tx.get("occurred_at") or "")).strftime("%d/%m/%Y"),
                "Descripción": str(tx.get("description") or "Movimiento"),
                "Tipo": tipo_label,
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
        tipo_value = str(row.get("Tipo", ""))
        is_expense = "Gasto" in tipo_value
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
            st.session_state["mov_form_force_clean_reset"] = True
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

    # ── Pagination bar ──────────────────────────────────────────────
    st.divider()
    page_info_col, prev_col, page_label_col, next_col = st.columns([4, 0.9, 1.2, 0.9])
    with page_info_col:
        from_item = start_index + 1
        to_item = min(end_index, total_items)
        st.caption(f"Mostrando {from_item}–{to_item} de {total_items} movimientos")
    with prev_col:
        if btn(
            "← Anterior",
            key="mov_table_prev_page",
            variant="neutral",
            use_container_width=True,
            disabled=current_page <= 1,
        ):
            st.session_state["mov_table_page"] = max(1, current_page - 1)
            RERUN()
    with page_label_col:
        st.markdown(
            f'<div class="af-mov-page-label">Página <strong>{current_page}</strong> de {total_pages}</div>',
            unsafe_allow_html=True,
        )
    with next_col:
        if btn(
            "Siguiente →",
            key="mov_table_next_page",
            variant="neutral",
            use_container_width=True,
            disabled=current_page >= total_pages,
        ):
            st.session_state["mov_table_page"] = min(total_pages, current_page + 1)
            RERUN()

    return selected_tx


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
        show_error("Escribe una descripción de al menos 2 caracteres.")
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
    if response.ok:
        st.session_state["mov_selected_tx_id"] = None
        st.session_state["mov_form_loaded_tx_id"] = None
        st.session_state["mov_clear_table_selection_pending"] = True
        st.session_state["mov_form_force_clean_reset"] = True
        show_success("Cambios guardados correctamente.")
        RERUN()
        return

    try:
        error_detail = response.json().get("detail", "No pudimos actualizar el movimiento.")
    except Exception:
        error_detail = "No pudimos actualizar el movimiento."
    show_error(error_detail)


def _handle_delete_transaction(selected_tx: dict) -> None:
    """Delete the selected transaction and show feedback."""
    response = api_request("DELETE", f"/transactions/{selected_tx['id']}")
    if response.status_code == 204:
        st.session_state["mov_selected_tx_id"] = None
        st.session_state["mov_form_loaded_tx_id"] = None
        st.session_state["mov_clear_table_selection_pending"] = True
        st.session_state["mov_form_force_clean_reset"] = True
        st.session_state["mov_delete_dialog_tx_id"] = None
        show_success("Movimiento eliminado con éxito.")
        RERUN()
        return

    try:
        detail = response.json().get("detail", "No pudimos eliminar el movimiento.")
    except Exception:
        detail = "No pudimos eliminar el movimiento."
    show_error(detail)


def movements_screen() -> None:
    """Render CRUD UI for user movements (create, edit, delete)."""
    inject_component_styles()

    movement_data = _load_movement_data()
    if movement_data is None:
        return

    _, accounts, categories, transactions = movement_data
    account_options, category_options = _build_options(accounts, categories)

    if not transactions:
        render_empty_state(
            "Aún no tienes movimientos",
            "Empieza registrando tu primer ingreso o gasto con el formulario de abajo.",
            icon="📊",
        )
        selected_tx = None
    else:
        selected_tx = _render_transactions_table(transactions, account_options)
    st.divider()
    _render_create_transaction_form(account_options, category_options, transactions, selected_tx=selected_tx)
