from __future__ import annotations

import streamlit as st

from modules.config import RERUN, init_session, persist_jwt_token, sync_auth_cookie
from modules.notifications import inject_notification_styles
from modules.ui import inject_theme, render_hero
from screens.auth import login_screen
from screens.dashboard import dashboard_screen
from screens.movements import movements_screen
from screens.setup import setup_screen


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

    _, top_right = st.columns([7, 2])
    with top_right:
        if st.button("Cerrar sesión", type="primary", use_container_width=True):
            st.session_state["jwt_token"] = ""
            persist_jwt_token("")
            RERUN()

    render_hero(
        "Atlas Finance",
        "Tu panel de finanzas personales.",
        kicker="Atlas Finance",
    )

    tab_dashboard, tab_movements, tab_setup = st.tabs(["Dashboard", "Movimientos", "Configuración"])

    with tab_dashboard:
        dashboard_screen()

    with tab_movements:
        movements_screen()

    with tab_setup:
        setup_screen()


app()
