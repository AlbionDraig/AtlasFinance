from __future__ import annotations

import os

import streamlit as st
from streamlit.errors import StreamlitSecretNotFoundError

REQUEST_TIMEOUT = 15
if hasattr(st, "rerun"):
    RERUN = st.rerun
else:
    RERUN = st.experimental_rerun


def resolve_api_base() -> str:
    """Resolve backend API base URL from env/secrets with localhost fallback."""
    env_value = os.getenv("ATLAS_API_BASE_URL")
    if env_value:
        return env_value

    try:
        return st.secrets.get("api_base_url", "http://localhost:8000/api/v1")
    except StreamlitSecretNotFoundError:
        return "http://localhost:8000/api/v1"


def init_session() -> None:
    """Initialize Streamlit session state keys used across the app."""
    st.session_state.setdefault("jwt_token", "")
    st.session_state.setdefault("api_base_url", resolve_api_base())
