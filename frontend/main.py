from __future__ import annotations

import streamlit as st

from modules.config import RERUN, init_session
from modules.ui import inject_theme, render_hero, render_info_card
from screens.auth import login_screen
from screens.dashboard import dashboard_screen
from screens.movements import movements_screen


def app() -> None:
    """Main entry point enforcing auth-first flow and private tabs."""
    st.set_page_config(page_title="Atlas Finance", layout="wide")
    init_session()
    inject_theme()

    if not st.session_state["jwt_token"]:
        login_screen()
        st.stop()

    with st.sidebar:
        st.markdown("### Atlas Feed")
        st.caption("Control diario con energia de creator app.")
        st.success("Sesion activa")
        if st.button("Cerrar sesion", use_container_width=True):
            st.session_state["jwt_token"] = ""
            RERUN()

    render_hero(
        "Tu dinero, con ritmo de feed.",
        "Gestiona movimientos, mide resultados y sigue tu historia financiera con una interfaz mas editorial y visual.",
        kicker="Atlas Finance",
        pills=["Movimientos en tiempo real", "Dashboard visual", "Control diario"],
    )

    info_col_1, info_col_2 = st.columns([1.3, 1])
    with info_col_1:
        render_info_card(
            "Centro de control",
            "Movimientos y dashboard viven en el mismo flujo para que registres y analices sin salir del contexto.",
        )
    with info_col_2:
        render_info_card(
            "Modo creador",
            "La UI prioriza lectura rapida, impacto visual y acciones frecuentes, como una mezcla entre Instagram y YouTube Studio.",
        )

    tab_movements, tab_dashboard = st.tabs(["Movimientos", "Dashboard"])

    with tab_movements:
        movements_screen()

    with tab_dashboard:
        dashboard_screen()


app()
