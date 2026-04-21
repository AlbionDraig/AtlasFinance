from __future__ import annotations

import requests
import streamlit as st

from modules.api_client import api_request
from modules.config import RERUN


def _extract_error_detail(response: requests.Response | None, default_detail: str) -> str:
    """Return API error detail when available, otherwise a safe fallback."""
    if response is None:
        return default_detail

    try:
        return response.json().get("detail", default_detail)
    except Exception:
        return default_detail


def _handle_login_submit(email: str, password: str) -> None:
    """Process login submit and persist the returned JWT in session state."""
    if not email or not password:
        st.error("Debes ingresar email y password.")
        return

    response: requests.Response | None = None
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
            return

        st.success("Sesion iniciada correctamente.")
        RERUN()
    except requests.HTTPError:
        detail = _extract_error_detail(response, "Credenciales invalidas.")
        st.error(f"Error de login: {detail}")
    except requests.RequestException as exc:
        st.error(f"No se pudo conectar a la API: {exc}")


def _handle_register_submit(full_name: str, email: str, password: str) -> None:
    """Process user registration submit and show API feedback."""
    if not full_name or not email or len(password) < 8:
        st.error("Completa todos los campos y usa una clave de minimo 8 caracteres.")
        return

    response: requests.Response | None = None
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
        detail = _extract_error_detail(response, "No se pudo crear la cuenta.")
        st.error(f"Error de registro: {detail}")
    except requests.RequestException as exc:
        st.error(f"No se pudo conectar a la API: {exc}")


def _render_login_tab() -> None:
    """Render login form and delegate submit handling."""
    with st.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        login_submit = st.form_submit_button("Iniciar sesion", use_container_width=True)

    if login_submit:
        _handle_login_submit(email, password)


def _render_register_tab() -> None:
    """Render register form and delegate submit handling."""
    with st.form("register_form"):
        full_name = st.text_input("Nombre completo")
        email = st.text_input("Email de registro")
        password = st.text_input("Password (minimo 8 caracteres)", type="password")
        register_submit = st.form_submit_button("Crear cuenta", use_container_width=True)

    if register_submit:
        _handle_register_submit(full_name, email, password)


def login_screen() -> None:
    """Render public authentication screen with login and registration tabs."""
    st.title("Atlas Finance")
    st.subheader("Inicia sesion para gestionar tus finanzas")

    tab_login, tab_register = st.tabs(["Login", "Registro"])

    with tab_login:
        _render_login_tab()

    with tab_register:
        _render_register_tab()
