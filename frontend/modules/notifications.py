"""
Notification helpers — re-exported from modules.components.

All implementations live in modules/components.py.
This module is kept for backward compatibility with existing imports:

    from modules.notifications import show_success, show_error

New code should import directly from modules.components.
"""
from __future__ import annotations

from modules.components import (
    inject_component_styles as inject_notification_styles,  # CSS is now part of inject_component_styles
    show_error,
    show_info,
    show_success,
    show_warning,
)

__all__ = [
    "inject_notification_styles",
    "show_success",
    "show_error",
    "show_warning",
    "show_info",
]

# ── Legacy stubs kept for backward compat ─────────────────────────────

import streamlit as st
