from __future__ import annotations

import os
from collections.abc import Callable

import streamlit as st
import streamlit.components.v1 as components

from streamlit.errors import StreamlitSecretNotFoundError

REQUEST_TIMEOUT = 20
REQUEST_RETRIES = 2
AUTH_COOKIE_NAME = "atlas_jwt_token"


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
    # Restore JWT only from the current browser's cookie on first session init.
    st.session_state.setdefault("jwt_token", st.context.cookies.get(AUTH_COOKIE_NAME, ""))
    st.session_state.setdefault("auth_cookie_sync", None)
    st.session_state.setdefault("auth_notice", None)
    st.session_state.setdefault("user_full_name", "")
    st.session_state.setdefault("user_email", "")

    st.session_state.setdefault("api_base_url", resolve_api_base())


def persist_jwt_token(token: str) -> None:
    """Queue a browser-cookie sync for the auth token."""
    st.session_state["auth_cookie_sync"] = token


def clear_auth_session(message: str | None = None) -> None:
    """Clear auth state and optionally set a user-facing notice."""
    st.session_state["jwt_token"] = ""
    st.session_state["user_full_name"] = ""
    st.session_state["user_email"] = ""
    st.session_state["auth_cookie_sync"] = ""
    if message is not None:
        st.session_state["auth_notice"] = message


def sync_auth_cookie() -> None:
    """Apply pending auth cookie updates in the browser for refresh persistence."""
    token = st.session_state.get("auth_cookie_sync")
    if token is None:
        return

    if token:
        script = f"""
        <script>
        window.parent.document.cookie = "{AUTH_COOKIE_NAME}=" + encodeURIComponent({token!r}) + "; path=/; max-age=86400; SameSite=Lax";
        </script>
        """
    else:
        script = f"""
        <script>
        window.parent.document.cookie = "{AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        </script>
        """

    components.html(script, height=0)
    st.session_state["auth_cookie_sync"] = None
