from __future__ import annotations

from datetime import datetime
import time

import requests
import streamlit as st

from modules.config import REQUEST_RETRIES, REQUEST_TIMEOUT, RERUN, clear_auth_session


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

    last_error: requests.RequestException | None = None
    for attempt in range(REQUEST_RETRIES + 1):
        try:
            response = requests.request(
                method,
                f"{st.session_state['api_base_url']}{path}",
                json=payload,
                params=params,
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
            break
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt >= REQUEST_RETRIES:
                raise
            # Short exponential backoff for transient container/network hiccups.
            time.sleep(0.35 * (attempt + 1))
    else:
        if last_error is not None:
            raise last_error
        raise requests.RequestException("Unknown request failure")

    if auth and response.status_code == 401:
        clear_auth_session("Tu sesión expiró. Inicia sesión de nuevo.")
        RERUN()

    return response


def parse_iso_datetime(value: str) -> datetime:
    """Parse API datetime strings, supporting trailing Z timezone format."""
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)
