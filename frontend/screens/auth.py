from __future__ import annotations

import re

import requests
import streamlit as st
import streamlit.components.v1 as components

from modules.api_client import api_request
from modules.config import RERUN
from modules.ui import render_hero


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
    if not email.strip():
        st.error("Ingresa tu email para iniciar sesión.")
        return
    if not password:
        st.error("Ingresa tu password para iniciar sesión.")
        return
    if "@" not in email:
        st.error("El email no tiene un formato válido.")
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
    if not full_name.strip():
        st.error("Ingresa tu nombre completo.")
        return
    if not email.strip():
        st.error("Ingresa un email de registro.")
        return
    if "@" not in email:
        st.error("El email de registro no tiene un formato válido.")
        return
    if len(password) < 8:
        st.error("La password debe tener mínimo 8 caracteres.")
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
    if confirm_password and not passwords_match:
        st.caption("Las passwords no coinciden.")

    can_submit = (
        bool(full_name.strip())
        and bool(email.strip())
        and all(ok for ok, _ in checks)
        and passwords_match
    )
    register_submit = st.button(
        "Crear cuenta",
        key="register_submit_button",
        use_container_width=True,
        type="primary",
        disabled=not can_submit,
    )

    if register_submit:
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
    render_hero(
        "Atlas Finance",
        "Inicia sesión para ver tu panel financiero.",
        kicker="Bienvenido",
        compact=True,
        narrow=True,
    )

    tab_login, tab_register = st.tabs(["Iniciar sesión", "Registro"])

    with tab_login:
        form_col, info_col = st.columns([2, 1], gap="large")
        with form_col:
            _render_login_tab()
        with info_col:
            _render_auth_side_panel("Iniciar sesión")

    with tab_register:
        form_col, info_col = st.columns([2, 1], gap="large")
        with form_col:
            _render_register_tab()
        with info_col:
            _render_auth_side_panel("Registro")
