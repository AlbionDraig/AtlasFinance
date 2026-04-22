from __future__ import annotations

import re

import requests
import streamlit as st
import streamlit.components.v1 as components

from modules.api_client import api_request
from modules.config import RERUN, persist_jwt_token
from modules.ui import render_hero


def _extract_error_detail(response: requests.Response | None, default_detail: str) -> str:
    """Return API error detail when available, otherwise a safe fallback."""
    if response is None:
        return default_detail

    try:
        return response.json().get("detail", default_detail)
    except Exception:
        return default_detail


def _show_toast(message: str, icon: str = "ℹ️") -> None:
    """Display auth feedback consistently through toast notifications."""
    st.toast(message, icon=icon)


def _show_error_notice(message: str) -> None:
    """Display an error notification as toast."""
    _show_toast(message, icon="⚠️")


def _show_success_notice(message: str) -> None:
    """Display a success notification as toast."""
    _show_toast(message, icon="✅")


def _handle_login_submit(email: str, password: str) -> None:
    """Process login submit and persist the returned JWT in session state."""
    if not email.strip():
        _show_error_notice("Ingresa tu email para iniciar sesión.")
        return
    if not password:
        _show_error_notice("Ingresa tu contraseña para iniciar sesión.")
        return
    if "@" not in email:
        _show_error_notice("El email no tiene un formato válido.")
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
        jwt_token = response.json().get("access_token", "")
        st.session_state["jwt_token"] = jwt_token

        profile_response = api_request("GET", "/auth/me")
        if profile_response.ok:
            profile = profile_response.json()
            st.session_state["user_full_name"] = str(profile.get("full_name") or "").strip()
            st.session_state["user_email"] = str(profile.get("email") or "").strip()

        # Persist the token to local storage
        persist_jwt_token(jwt_token)

        if not st.session_state["jwt_token"]:
            _show_error_notice("No pudimos iniciar sesión. Inténtalo nuevamente.")
            return

        st.session_state["auth_login_toast"] = "Inicio de sesión exitoso. Bienvenido a Atlas Finance."
        RERUN()
    except requests.HTTPError:
        detail = _extract_error_detail(response, "No pudimos iniciar sesión con esos datos.")
        _show_error_notice(detail)
    except requests.RequestException:
        _show_error_notice("No pudimos conectarnos en este momento. Revisa tu conexión e inténtalo de nuevo.")


def _handle_register_submit(full_name: str, email: str, password: str) -> None:
    """Process user registration submit and show API feedback."""
    if not full_name.strip():
        _show_error_notice("Ingresa tu nombre completo.")
        return
    if not email.strip():
        _show_error_notice("Ingresa un email de registro.")
        return
    if "@" not in email:
        _show_error_notice("El email de registro no tiene un formato válido.")
        return
    if len(password) < 8:
        _show_error_notice("La contraseña debe tener al menos 8 caracteres.")
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
        st.session_state["auth_redirect_to_login"] = True
        st.session_state["auth_toast"] = "Cuenta creada con éxito. Ahora puedes iniciar sesión."
        RERUN()
    except requests.HTTPError:
        detail = _extract_error_detail(response, "No pudimos crear tu cuenta.")
        _show_error_notice(detail)
    except requests.RequestException:
        _show_error_notice("No pudimos conectarnos en este momento. Revisa tu conexión e inténtalo de nuevo.")


def _render_auth_form_shell(title: str, copy: str) -> None:
    """Render a shared auth intro header for login and registration."""
    st.markdown(
        (
            '<div class="af-auth-intro">'
            '<span class="af-auth-intro-tag">Info</span>'
            f'<div class="af-auth-card-title">{title}</div>'
            f'<p class="af-auth-card-copy">{copy}</p>'
            "</div>"
        ),
        unsafe_allow_html=True,
    )


def _render_login_tab() -> None:
    """Render login form and delegate submit handling."""
    _render_auth_form_shell(
        "Acceso a tu cuenta",
        "Accede con tu cuenta para continuar al dashboard.",
    )
    email = st.text_input("Email", placeholder="tu_correo@ejemplo.com", key="login_email")
    password = st.text_input(
        "Password",
        type="password",
        placeholder="Tu clave",
        key="login_password",
    )
    login_submit = st.button(
        "Iniciar sesion",
        key="login_submit_button",
        use_container_width=True,
        type="primary",
    )

    if login_submit:
        _handle_login_submit(email, password)


def _password_strength(password: str) -> tuple[str, int, str]:
    """Return user-friendly password strength label, score (0-100) and tone."""
    if not password:
        return ("Sin definir", 0, "neutral")

    checks = [
        len(password) >= 8,
        bool(re.search(r"[A-Z]", password)),
        bool(re.search(r"[a-z]", password)),
        bool(re.search(r"\d", password)),
        bool(re.search(r"[^A-Za-z0-9]", password)),
    ]
    passed = sum(checks)
    score = int((passed / len(checks)) * 100)

    if score >= 80:
        return ("Fuerte", score, "strong")
    if score >= 60:
        return ("Media", score, "medium")
    return ("Débil", score, "weak")


def _render_password_live_bridge() -> None:
        """Update password strength/checklist on each keystroke from client-side input events."""
        components.html(
                """
                <script>
                (function () {
                    function calc(pwd) {
                        const checks = {
                            len: pwd.length >= 8,
                            upper: /[A-Z]/.test(pwd),
                            digit: /\\d/.test(pwd),
                            symbol: /[^A-Za-z0-9]/.test(pwd),
                            lower: /[a-z]/.test(pwd),
                        };
                        const passed = Object.values(checks).filter(Boolean).length;
                        const score = Math.round((passed / 5) * 100);
                        let label = "Débil";
                        let tone = "weak";
                        if (!pwd) {
                            label = "Sin definir";
                            tone = "neutral";
                        } else if (score >= 80) {
                            label = "Fuerte";
                            tone = "strong";
                        } else if (score >= 60) {
                            label = "Media";
                            tone = "medium";
                        }
                        return { checks, score, label, tone };
                    }

                    function apply(result) {
                        const doc = window.parent.document;
                        const label = doc.getElementById("af-pw-strength-label");
                        const fill = doc.getElementById("af-pw-strength-fill");
                        if (label) {
                            label.textContent = result.label;
                            label.className = result.tone;
                        }
                        if (fill) {
                            fill.style.width = result.score + "%";
                            fill.className = "af-pw-strength-fill " + result.tone;
                        }

                        const map = [
                            ["af-rule-len", result.checks.len, "Mínimo 8 caracteres"],
                            ["af-rule-upper", result.checks.upper, "Al menos una mayúscula"],
                            ["af-rule-digit", result.checks.digit, "Al menos un número"],
                            ["af-rule-symbol", result.checks.symbol, "Al menos un símbolo"],
                        ];
                        map.forEach(([id, ok, text]) => {
                            const el = doc.getElementById(id);
                            if (!el) return;
                            el.className = ok ? "ok" : "pending";
                            el.textContent = (ok ? "✓ " : "• ") + text;
                        });
                    }

                    function bind() {
                        const doc = window.parent.document;
                        const input = doc.querySelector('input[aria-label="Password (minimo 8 caracteres)"]');
                        if (!input) return;

                        const handler = () => apply(calc(input.value || ""));
                        if (!input.dataset.afPwBound) {
                            input.dataset.afPwBound = "1";
                            input.addEventListener("input", handler);
                            input.addEventListener("keyup", handler);
                        }
                        handler();
                    }

                    const timer = setInterval(bind, 250);
                    setTimeout(() => clearInterval(timer), 10000);
                })();
                </script>
                """,
                height=0,
        )


def _render_register_tab() -> None:
    """Render register form with live password feedback and submit handling."""
    _render_auth_form_shell(
        "Crea tu cuenta",
        "Empieza a registrar movimientos y sigue tu panorama financiero desde el primer acceso.",
    )
    full_name = st.text_input("Nombre completo", placeholder="Tu nombre", key="register_full_name")
    email = st.text_input("Email de registro", placeholder="tu_correo@ejemplo.com", key="register_email")
    password = st.text_input(
        "Password (minimo 8 caracteres)",
        type="password",
        key="register_password",
        placeholder="Minimo 8 caracteres",
    )

    strength_label, strength_score, strength_tone = _password_strength(password)
    st.markdown(
        (
            '<div class="af-pw-strength">'
            f'<div class="af-pw-strength-row"><span>Fortaleza</span><span id="af-pw-strength-label" class="{strength_tone}">{strength_label}</span></div>'
            f'<div class="af-pw-strength-track"><div id="af-pw-strength-fill" class="af-pw-strength-fill {strength_tone}" style="width: {strength_score}%;"></div></div>'
            "</div>"
        ),
        unsafe_allow_html=True,
    )

    checks = [
        (len(password) >= 8, "Mínimo 8 caracteres"),
        (bool(re.search(r"[A-Z]", password)), "Al menos una mayúscula"),
        (bool(re.search(r"\d", password)), "Al menos un número"),
        (bool(re.search(r"[^A-Za-z0-9]", password)), "Al menos un símbolo"),
    ]
    checklist_html = (
        f'<li id="af-rule-len" class="{"ok" if checks[0][0] else "pending"}">{"✓" if checks[0][0] else "•"} {checks[0][1]}</li>'
        f'<li id="af-rule-upper" class="{"ok" if checks[1][0] else "pending"}">{"✓" if checks[1][0] else "•"} {checks[1][1]}</li>'
        f'<li id="af-rule-digit" class="{"ok" if checks[2][0] else "pending"}">{"✓" if checks[2][0] else "•"} {checks[2][1]}</li>'
        f'<li id="af-rule-symbol" class="{"ok" if checks[3][0] else "pending"}">{"✓" if checks[3][0] else "•"} {checks[3][1]}</li>'
    )
    st.markdown(f'<ul class="af-pw-checklist">{checklist_html}</ul>', unsafe_allow_html=True)
    _render_password_live_bridge()

    confirm_password = st.text_input(
        "Confirmar password",
        type="password",
        placeholder="Repite tu password",
        key="register_confirm_password",
    )
    passwords_match = bool(confirm_password) and confirm_password == password

    register_submit = st.button(
        "Crear cuenta",
        key="register_submit_button",
        use_container_width=True,
        type="primary",
    )

    if register_submit:
        if not full_name.strip() or not email.strip():
            _show_error_notice("Completa tu nombre y tu email para crear la cuenta.")
            return
        if not all(ok for ok, _ in checks):
            _show_error_notice("Tu contraseña aún no cumple todos los requisitos.")
            return
        if not passwords_match:
            _show_error_notice("Las contraseñas no coinciden. Escríbelas igual en ambos campos.")
            return
        _handle_register_submit(full_name, email, password)


def _render_auth_side_panel(active_view: str) -> None:
    """Render contextual side content for login and registration."""
    if active_view == "Registro":
        st.markdown(
            """
            <div class="af-auth-side">
                <h3>Empieza en minutos</h3>
                <p>Crea tu cuenta y deja listo tu espacio para registrar ingresos y gastos desde el primer acceso.</p>
                <div class="af-auth-note">Configura tu cuenta en menos de un minuto.</div>
                <div class="af-auth-note">Comienza a registrar movimientos apenas termines el alta.</div>
                <div class="af-auth-note">Sigue tu ahorro y el peso de cada categoría desde el dashboard.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    st.markdown(
        """
        <div class="af-auth-side">
            <h3>Vuelve a tu resumen</h3>
            <p>Entra a tu panel para revisar tus movimientos recientes y detectar cambios en tus finanzas de un vistazo.</p>
            <div class="af-auth-note">Consulta ingresos, gastos y balance en un mismo lugar.</div>
            <div class="af-auth-note">Revisa rápidamente qué categorías están impactando más tu mes.</div>
            <div class="af-auth-note">Retoma tu seguimiento sin repetir configuración ni pasos extra.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def login_screen() -> None:
    """Render public authentication screen with login and registration tabs."""
    if st.session_state.pop("auth_redirect_to_login", False):
        st.session_state["auth_active_view"] = "Iniciar sesión"

    auth_notice = st.session_state.pop("auth_notice", None)
    if auth_notice:
        _show_toast(str(auth_notice), icon="⚠️")

    auth_toast = st.session_state.pop("auth_toast", None)
    if auth_toast:
        _show_success_notice(str(auth_toast))

    render_hero(
        "Atlas Finance",
        "Inicia sesión para ver tu panel financiero.",
        kicker="Bienvenido",
        compact=True,
        narrow=True,
    )

    auth_views = ["Iniciar sesión", "Registro"]
    if st.session_state.get("auth_active_view") not in auth_views:
        st.session_state["auth_active_view"] = "Iniciar sesión"

    nav_label = ""

    if hasattr(st, "segmented_control"):
        selected_view = st.segmented_control(
            nav_label,
            auth_views,
            key="auth_active_view",
            label_visibility="collapsed",
        )
    else:
        selected_view = st.radio(
            nav_label,
            auth_views,
            key="auth_active_view",
            horizontal=True,
            label_visibility="collapsed",
        )

    active_view = selected_view or st.session_state.get("auth_active_view", "Iniciar sesión")

    form_col, info_col = st.columns([2, 1], gap="large")
    with form_col:
        if active_view == "Registro":
            _render_register_tab()
        else:
            _render_login_tab()
    with info_col:
        _render_auth_side_panel(active_view)
