from __future__ import annotations

import re

import requests
import streamlit as st

from modules.api_client import api_request
from modules.config import RERUN, init_session, persist_jwt_token, sync_auth_cookie
from modules.notifications import inject_notification_styles
from modules.ui import inject_theme
from screens.auth import login_screen
from screens.dashboard import dashboard_screen
from screens.movements import movements_screen
from screens.setup import setup_screen


def _derive_initials(full_name: str, email: str) -> str:
    """Build avatar initials from full name, with email fallback."""
    normalized = re.sub(r"\s+", " ", (full_name or "").strip())
    if normalized:
        parts = [p for p in normalized.split(" ") if p]
        alpha_parts = [p for p in parts if any(ch.isalpha() for ch in p)]
        target_parts = alpha_parts if alpha_parts else parts

        if len(target_parts) >= 2:
            return (target_parts[0][0] + target_parts[-1][0]).upper()
        return target_parts[0][:2].upper()

    email_local = (email or "").split("@", maxsplit=1)[0].strip()
    if email_local:
        return email_local[:2].upper()
    return "AF"


def _ensure_user_profile_loaded() -> None:
    """Load profile in-session when authenticated via persisted cookie token."""
    if st.session_state.get("user_full_name") or st.session_state.get("user_email"):
        return
    try:
        profile_response = api_request("GET", "/auth/me")
        if profile_response.ok:
            profile = profile_response.json()
            st.session_state["user_full_name"] = str(profile.get("full_name") or "").strip()
            st.session_state["user_email"] = str(profile.get("email") or "").strip()
    except requests.RequestException:
        # Keep the app usable even if profile endpoint is temporarily unavailable.
        return


def _render_profile_menu(initials: str, full_name: str, email: str) -> None:
    """Render top-right user menu with account actions."""
    if hasattr(st, "popover"):
        with st.popover(initials, use_container_width=True):
            if full_name:
                st.markdown(f"**{full_name}**")
            if email:
                st.caption(email)
            st.button(
                "Configurar cuenta (próximamente)",
                key="profile_settings_soon",
                disabled=True,
                use_container_width=True,
            )
            if st.button("Cerrar sesión", key="profile_logout", use_container_width=True):
                st.session_state["jwt_token"] = ""
                persist_jwt_token("")
                RERUN()
        return

    if st.button(f"{initials} · Cerrar sesión", type="secondary", use_container_width=True):
        st.session_state["jwt_token"] = ""
        persist_jwt_token("")
        RERUN()


def app() -> None:
    """Main entry point enforcing auth-first flow and private tabs."""
    st.set_page_config(
        page_title="Atlas Finance",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    init_session()
    inject_theme()
    inject_notification_styles()
    sync_auth_cookie()

    if not st.session_state["jwt_token"]:
        login_screen()
        st.stop()

    _ensure_user_profile_loaded()

    # Add future main sections in this single config list.
    sections = [
        ("📊 Dashboard", "dashboard", dashboard_screen),
        ("💸 Movimientos", "movements", movements_screen),
        ("⚙️ Configuración", "setup", setup_screen),
    ]
    section_options = {label: key for label, key, _ in sections}
    section_renderers = {key: renderer for _, key, renderer in sections}
    options = [label for label, _, _ in sections]
    default_label = options[0]

    # Migrate previously stored values to current labels.
    legacy_to_label = {
        "Dashboard": "📊 Dashboard",
        "Movimientos": "💸 Movimientos",
        "Configuración": "⚙️ Configuración",
        "dashboard": "📊 Dashboard",
        "movements": "💸 Movimientos",
        "setup": "⚙️ Configuración",
    }
    if "main_section" in st.session_state:
        previous = st.session_state["main_section"]
        migrated = legacy_to_label.get(previous, previous)
        st.session_state["main_section"] = migrated if migrated in section_options else default_label

    full_name = st.session_state.get("user_full_name", "")
    email = st.session_state.get("user_email", "")
    initials = _derive_initials(full_name, email)

    topbar_left, topbar_right = st.columns([11, 1], gap="small")
    with topbar_left:
        st.markdown(
            (
                '<div class="af-topbar-copy">'
                '<div class="kicker">ATLAS FINANCE</div>'
                '<p>Control total de tus finanzas en tiempo real.</p>'
                "</div>"
            ),
            unsafe_allow_html=True,
        )

    with topbar_right:
        _render_profile_menu(initials, full_name, email)

    current_section = st.session_state.get("main_section", default_label)
    if current_section not in section_options:
        current_section = default_label

    max_visible_tabs = 4
    if len(options) <= max_visible_tabs:
        primary_options = options
        overflow_options: list[str] = []
    else:
        fixed_primary = options[: max_visible_tabs - 1]
        overflow = options[max_visible_tabs - 1 :]
        if current_section in overflow:
            primary_options = fixed_primary + [current_section]
            overflow_options = [label for label in overflow if label != current_section]
        else:
            primary_options = fixed_primary + [overflow[0]]
            overflow_options = [label for label in overflow if label != overflow[0]]

    nav_main, nav_more = st.columns([11, 1], gap="small")
    with nav_main:
        if hasattr(st, "segmented_control"):
            selected_primary = st.segmented_control(
                "",
                options=primary_options,
                default=current_section if current_section in primary_options else primary_options[0],
                label_visibility="collapsed",
            )
        else:
            primary_index = (
                primary_options.index(current_section)
                if current_section in primary_options
                else 0
            )
            selected_primary = st.radio(
                "",
                primary_options,
                index=primary_index,
                horizontal=True,
                label_visibility="collapsed",
            )
        if selected_primary:
            current_section = selected_primary

    with nav_more:
        if overflow_options and hasattr(st, "popover"):
            with st.popover("Más", use_container_width=False):
                st.caption("Secciones adicionales")
                for label in overflow_options:
                    if st.button(label, key=f"main_overflow_{section_options[label]}", use_container_width=True):
                        st.session_state["main_section"] = label
                        RERUN()
        elif overflow_options:
            selected_extra = st.selectbox(
                "Más",
                options=overflow_options,
                index=0,
                label_visibility="collapsed",
            )
            if selected_extra:
                current_section = selected_extra
        else:
            st.markdown(
                '<div class="af-nav-more-disabled"><span>Más</span></div>',
                unsafe_allow_html=True,
            )

    st.session_state["main_section"] = current_section

    current_key = section_options.get(current_section, section_options[default_label])
    section_renderers[current_key]()


app()
