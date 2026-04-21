from __future__ import annotations

import os
from collections.abc import Callable

import streamlit as st
from streamlit.errors import StreamlitSecretNotFoundError

REQUEST_TIMEOUT = 15


def _resolve_rerun() -> Callable[[], object]:
    """Return the supported Streamlit rerun function for the active version."""
    rerun = getattr(st, "rerun", None)
    if callable(rerun):
        return rerun

    experimental_rerun = getattr(st, "experimental_rerun", None)
    if callable(experimental_rerun):
        return experimental_rerun

    raise RuntimeError("No compatible Streamlit rerun function is available")


RERUN = _resolve_rerun()


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
