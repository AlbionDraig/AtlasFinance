from __future__ import annotations

import streamlit as st

from modules.config import RERUN, init_session
from screens.auth import login_screen
from screens.dashboard import dashboard_screen
from screens.movements import movements_screen


def app() -> None:
    """Main entry point enforcing auth-first flow and private tabs."""
    st.set_page_config(page_title="Atlas Finance", layout="wide")
    init_session()

    if not st.session_state["jwt_token"]:
        login_screen()
        st.stop()

    with st.sidebar:
        st.success("Sesion activa")
        if st.button("Cerrar sesion", use_container_width=True):
            st.session_state["jwt_token"] = ""
            RERUN()

    st.title("Atlas Finance")
    tab_movements, tab_dashboard = st.tabs(["Movimientos", "Dashboard"])

    with tab_movements:
        movements_screen()

    with tab_dashboard:
        dashboard_screen()


app()
