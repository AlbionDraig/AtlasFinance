from __future__ import annotations

import os
from collections.abc import Callable

import streamlit as st

from streamlit.errors import StreamlitSecretNotFoundError

REQUEST_TIMEOUT = 20
REQUEST_RETRIES = 2


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
    st.session_state.setdefault("auth_notice", None)
    st.session_state.setdefault("user_full_name", "")
    st.session_state.setdefault("user_email", "")

    st.session_state.setdefault("api_base_url", resolve_api_base())

    # Rehydrate auth state from URL when Streamlit creates a fresh session on refresh.
    if not st.session_state.get("jwt_token"):
        jwt_param = str(st.query_params.get("jwt", "") or "").strip()
        if jwt_param:
            st.session_state["jwt_token"] = jwt_param


def persist_jwt_token(token: str) -> None:
    """Persist JWT in session state and URL query params for refresh survival."""
    token = str(token or "").strip()
    st.session_state["jwt_token"] = token
    if token:
        st.query_params["jwt"] = token
    else:
        try:
            del st.query_params["jwt"]
        except Exception:
            pass


def clear_auth_session(message: str | None = None) -> None:
    """Clear auth state and optionally set a user-facing notice."""
    persist_jwt_token("")
    st.session_state["user_full_name"] = ""
    st.session_state["user_email"] = ""
    if message is not None:
        st.session_state["auth_notice"] = message


def sync_auth_cookie() -> None:
    """Backward-compatible no-op: auth persistence now uses st.query_params."""
    return
