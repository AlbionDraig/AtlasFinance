"""Setup screen — manage banks, accounts and categories."""
from __future__ import annotations

from typing import Callable

import streamlit as st

from modules.api_client import api_request
from modules.components import (
    inject_component_styles,
    section_header,
    select_field,
    text_field,
)
from modules.config import RERUN
from modules.notifications import show_error, show_success
from modules.ui import (
    render_empty_state,
    render_field_with_tooltip,
    render_form_label,
    render_info_card,
    show_form_error,
    validate_text_field,
)


# ── helpers ──────────────────────────────────────────────────────────────────

def _show_api_result(
    response,
    success_message: str,
    error_message: str,
    on_success: Callable[[], None] | None = None,
) -> None:
    if response.ok:
        if on_success is not None:
            on_success()
        show_success(success_message)
        RERUN()
        return
    try:
        detail = response.json().get("detail", error_message)
    except Exception:
        detail = error_message
    show_error(detail)


def _build_friendly_bank_options(banks: list[dict]) -> dict[str, int]:
    """Build non-technical bank labels for selectboxes (no DB IDs)."""
    options: dict[str, int] = {}
    label_counts: dict[str, int] = {}
    for bank in banks:
        base_label = str(bank.get("name") or "Banco")
        count = label_counts.get(base_label, 0) + 1
        label_counts[base_label] = count
        label = base_label if count == 1 else f"{base_label} ({count})"
        options[label] = int(bank["id"])
    return options


# ── bank ─────────────────────────────────────────────────────────────────────

def _render_bank_form() -> None:
    with st.form("setup_create_bank_form"):
        render_field_with_tooltip(
            "Nombre del banco",
            "Nombre de tu institución financiera",
            required=True,
            hint="Ej: Bancolombia, BBVA, Scotiabank, Nequi",
        )
        bank_name = st.text_input(
            "Nombre del banco",
            key="setup_bank_name",
            placeholder="Ingresa el nombre del banco",
            label_visibility="collapsed",
        )
        render_field_with_tooltip(
            "País (código)",
            "Código de país en ISO 3166-1 alpha-2",
            required=True,
            hint="Código de 2 letras. Ej: CO (Colombia), US (USA), AR (Argentina)",
        )
        country_code = st.text_input(
            "País (código)",
            value="CO",
            max_chars=3,
            key="setup_country_code",
            label_visibility="collapsed",
        )
        submit = st.form_submit_button("✓ Guardar banco", use_container_width=True)

    if not submit:
        return

    is_valid, err = validate_text_field(bank_name, min_length=2, field_name="Nombre del banco")
    if not is_valid:
        show_form_error("Validación", err)
        return
    if len(country_code.strip()) < 2:
        show_form_error("Validación", "Código de país debe tener 2 letras (ej: CO, US).")
        return

    _show_api_result(
        api_request("POST", "/banks/", payload={
            "name": bank_name.strip(),
            "country_code": country_code.strip().upper() or "CO",
        }),
        "Banco creado exitosamente.",
        "No se pudo crear el banco.",
        on_success=lambda: st.session_state.__setitem__("setup_reset_bank_form_pending", True),
    )


# ── account ───────────────────────────────────────────────────────────────────

def _render_account_form(banks: list[dict]) -> None:
    with st.form("setup_create_account_form"):
        st.markdown("**Crear cuenta**")
        if not banks:
            st.info("Primero crea un banco.")
            bank_options: dict[str, int] = {}
            account_name = ""
            account_type = "savings"
            account_currency = "COP"
            balance = 0.0
            selected_bank = ""
        else:
            bank_options = _build_friendly_bank_options(banks)
            account_name = text_field("Nombre de la cuenta", key="setup_account_name", placeholder="Ej: Cuenta ahorros personal")
            account_type = select_field("Tipo", ["savings", "checking"], key="setup_account_type")
            account_currency = select_field("Moneda", ["COP", "USD"], key="setup_account_currency")
            balance = st.number_input(
                "Saldo inicial",
                min_value=0.0,
                step=10.0,
                key="setup_account_balance",
            )
            selected_bank = select_field("Banco", list(bank_options.keys()), key="setup_selected_bank")

        submit = st.form_submit_button("Guardar cuenta", use_container_width=True, disabled=not bool(banks))

    if not submit:
        return
    if len(account_name.strip()) < 2:
        show_error("El nombre de la cuenta debe tener al menos 2 caracteres.")
        return

    _show_api_result(
        api_request("POST", "/accounts/", payload={
            "name": account_name.strip(),
            "account_type": account_type,
            "currency": account_currency,
            "current_balance": balance,
            "bank_id": bank_options[selected_bank],
        }),
        "Cuenta creada.",
        "No se pudo crear la cuenta.",
        on_success=lambda: st.session_state.__setitem__("setup_reset_account_form_pending", True),
    )


# ── category ──────────────────────────────────────────────────────────────────

def _render_category_form() -> None:
    with st.form("setup_create_category_form"):
        render_form_label(
            "Nombre de categoría",
            required=True,
            hint="Ej: Alimentación, Transporte, Entretenimiento",
        )
        category_name = st.text_input(
            "Nombre de categoría",
            key="setup_category_name",
            placeholder="Ingresa el nombre de la categoría",
            label_visibility="collapsed",
        )
        submit = st.form_submit_button("✓ Guardar categoría", use_container_width=True)

    if not submit:
        return

    is_valid, err = validate_text_field(category_name, min_length=2, field_name="Nombre de categoría")
    if not is_valid:
        show_form_error("Validación", err)
        return

    _show_api_result(
        api_request("POST", "/categories/", payload={"name": category_name.strip()}),
        "Categoría creada exitosamente.",
        "No se pudo crear la categoría.",
        on_success=lambda: st.session_state.__setitem__("setup_reset_category_form_pending", True),
    )


# ── main screen ───────────────────────────────────────────────────────────────

def setup_screen() -> None:
    """Render the setup screen for banks, accounts and categories."""
    inject_component_styles()
    import requests

    try:
        banks_r = api_request("GET", "/banks/")
        accounts_r = api_request("GET", "/accounts/")
        categories_r = api_request("GET", "/categories/")
        for r in [banks_r, accounts_r, categories_r]:
            r.raise_for_status()
    except requests.RequestException as exc:
        st.error(f"No se pudieron cargar los datos: {exc}")
        return

    banks: list[dict] = banks_r.json()
    accounts: list[dict] = accounts_r.json()
    categories: list[dict] = categories_r.json()

    # Apply deferred resets before widgets are instantiated.
    if st.session_state.pop("setup_reset_bank_form_pending", False):
        st.session_state["setup_bank_name"] = ""
        st.session_state["setup_country_code"] = "CO"

    if st.session_state.pop("setup_reset_account_form_pending", False):
        st.session_state["setup_account_name"] = ""
        st.session_state["setup_account_type"] = "savings"
        st.session_state["setup_account_currency"] = "COP"
        st.session_state["setup_account_balance"] = 0.0
        bank_options = _build_friendly_bank_options(banks)
        st.session_state["setup_selected_bank"] = next(iter(bank_options.keys()), "")

    if st.session_state.pop("setup_reset_category_form_pending", False):
        st.session_state["setup_category_name"] = ""

    # ── summary cards ────────────────────────────────────────────────────────
    col1, col2, col3 = st.columns(3)
    with col1:
        render_info_card("Bancos", str(len(banks)), sub="registrados")
    with col2:
        render_info_card("Cuentas", str(len(accounts)), sub="registradas")
    with col3:
        render_info_card("Categorías", str(len(categories)), sub="registradas")

    # ── contextual guidance ──────────────────────────────────────────────────
    if not banks:
        st.info("👉 **Paso 1:** Crea un banco para comenzar.")
    elif not accounts:
        st.warning("⚠️ **Paso 2:** Crea una cuenta bancaria para poder registrar movimientos.")

    st.divider()

    # ── sub-tabs ─────────────────────────────────────────────────────────────
    section_header("Configuración", "Gestiona bancos, cuentas bancarias y categorías de gasto.")

    tab_bank, tab_account, tab_category = st.tabs(["🏦 Banco", "💳 Cuenta", "🏷️ Categoría"])

    with tab_bank:
        if banks:
            st.caption(f"Bancos existentes: {', '.join(b['name'] for b in banks)}")
        else:
            render_empty_state(
                "Sin bancos",
                "Crea tu primer banco para comenzar.",
                icon="🏦",
            )
        _render_bank_form()

    with tab_account:
        if not banks:
            render_empty_state(
                "No hay bancos disponibles",
                "Necesitas crear un banco primero antes de poder crear cuentas.",
                icon="🏦",
            )
        else:
            if accounts:
                st.caption(f"Cuentas existentes: {', '.join(a['name'] for a in accounts)}")
            _render_account_form(banks)

    with tab_category:
        if categories:
            st.caption(f"Categorías existentes: {', '.join(c['name'] for c in categories)}")
        _render_category_form()
