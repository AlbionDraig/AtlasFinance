"""Notification system with improved UI/UX for success, error, warning messages."""

from __future__ import annotations

import time

from streamlit.delta_generator import DeltaGenerator

import streamlit as st


def inject_notification_styles() -> None:
    """Inject CSS for improved toast notifications."""
    st.markdown(
        """
        <style>
        /* ── Toast/Notification styles ──────────────────────────────────── */
        .stAlert {
            border-radius: 12px !important;
            padding: 14px 16px !important;
            border: none !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
            animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Success toast */
        .stAlert > [data-testid="stAlertContainer"] {
            background-color: #ECFDF5 !important;
            border-left: 4px solid #10B981 !important;
        }

        .stAlert > [data-testid="stAlertContainer"] > div {
            color: #065F46 !important;
            font-weight: 500 !important;
        }

        /* Error toast */
        .stAlert.error > [data-testid="stAlertContainer"] {
            background-color: #FEF2F2 !important;
            border-left: 4px solid #EF4444 !important;
        }

        .stAlert.error > [data-testid="stAlertContainer"] > div {
            color: #7F1D1D !important;
            font-weight: 500 !important;
        }

        /* Warning toast */
        .stAlert.warning > [data-testid="stAlertContainer"] {
            background-color: #FFFBEB !important;
            border-left: 4px solid #F59E0B !important;
        }

        .stAlert.warning > [data-testid="stAlertContainer"] > div {
            color: #78350F !important;
            font-weight: 500 !important;
        }

        /* Info toast */
        .stAlert.info > [data-testid="stAlertContainer"] {
            background-color: #EFF6FF !important;
            border-left: 4px solid #3B82F6 !important;
        }

        .stAlert.info > [data-testid="stAlertContainer"] > div {
            color: #1E40AF !important;
            font-weight: 500 !important;
        }

        /* ── Loading indicator ──────────────────────────────────── */
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .spinner-icon {
            display: inline-block;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def show_success(message: str, icon: str = "✓") -> None:
    """Show success notification with icon."""
    st.success(f"{icon} {message}")


def show_error(message: str, icon: str = "✗") -> None:
    """Show error notification with icon."""
    st.error(f"{icon} {message}")


def show_warning(message: str, icon: str = "⚠") -> None:
    """Show warning notification with icon."""
    st.warning(f"{icon} {message}")


def show_info(message: str, icon: str = "ℹ") -> None:
    """Show info notification with icon."""
    st.info(f"{icon} {message}")


def show_loading(message: str = "Cargando...") -> None:
    """Show loading indicator with message."""
    col1, col2 = st.columns([0.1, 0.9])
    with col1:
        st.markdown(
            """
            <div class="spinner-icon" style="display: inline-block; animation: spin 1s linear infinite;">
            ⏳
            </div>
            """,
            unsafe_allow_html=True,
        )
    with col2:
        st.write(message)


class NotificationContainer:
    """Context manager for handling notifications with auto-clear."""

    def __init__(self, duration_seconds: int = 3):
        """Initialize notification container.
        
        Args:
            duration_seconds: How long to show the notification (0 = permanent)
        """
        self.duration = duration_seconds
        self.placeholder: DeltaGenerator | None = None

    def _placeholder_or_raise(self) -> DeltaGenerator:
        """Return placeholder if initialized via context manager."""
        if self.placeholder is None:
            raise RuntimeError(
                "NotificationContainer must be used inside a context manager."
            )
        return self.placeholder

    def __enter__(self):
        """Enter context - create placeholder."""
        self.placeholder = st.empty()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context - optionally clear notification."""
        if self.duration > 0:
            time.sleep(self.duration)
            self._placeholder_or_raise().empty()

    def success(self, message: str) -> None:
        """Show success message in placeholder."""
        with self._placeholder_or_raise().container():
            show_success(message)

    def error(self, message: str) -> None:
        """Show error message in placeholder."""
        with self._placeholder_or_raise().container():
            show_error(message)

    def warning(self, message: str) -> None:
        """Show warning message in placeholder."""
        with self._placeholder_or_raise().container():
            show_warning(message)

    def info(self, message: str) -> None:
        """Show info message in placeholder."""
        with self._placeholder_or_raise().container():
            show_info(message)
