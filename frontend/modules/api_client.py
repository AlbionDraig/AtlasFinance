from __future__ import annotations

from datetime import datetime

import requests
import streamlit as st

from modules.config import REQUEST_TIMEOUT, RERUN, clear_auth_session


def api_request(
    method: str,
    path: str,
    *,
    payload: dict | None = None,
    params: dict | None = None,
    auth: bool = True,
) -> requests.Response:
    """Execute an HTTP request to Atlas API with optional JWT auth header."""
    headers: dict[str, str] = {}
    if auth and st.session_state["jwt_token"]:
        headers["Authorization"] = f"Bearer {st.session_state['jwt_token']}"

    response = requests.request(
        method,
        f"{st.session_state['api_base_url']}{path}",
        json=payload,
        params=params,
        headers=headers,
        timeout=REQUEST_TIMEOUT,
    )

    if auth and response.status_code == 401:
        clear_auth_session("Tu sesión expiró. Inicia sesión de nuevo.")
        RERUN()

    return response


def parse_iso_datetime(value: str) -> datetime:
    """Parse API datetime strings, supporting trailing Z timezone format."""
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)
