"""
Atlas Finance – UI component primitives.

Usage
-----
Import the helpers you need and call them instead of raw Streamlit widgets:

    from modules.components import btn, text_field, select_field, section_header
    from modules.components import inject_component_styles   # call once per screen

Design system
-------------
All components consume the CSS variables defined in modules/ui.py::inject_theme().
Color variants map to semantic actions:

    "primary"        – main call-to-action (navigation, submit)
    "success"        – save / create / confirm positive
    "danger"         – delete / irreversible action
    "danger-outline" – pre-confirmation of a destructive action
    "warning"        – undo / reversible caution
    "neutral"        – cancel / reset / secondary navigation
"""

from __future__ import annotations

import html as _html
import re
from datetime import date, time, timedelta
from typing import Any, Callable

import streamlit as st
import streamlit.components.v1 as st_components


# ── Internal: design-token map ────────────────────────────────────────
_VARIANTS: dict[str, dict[str, str]] = {
    "primary": {
        "bg":     "#1f6fb2",
        "hover":  "#1a5c96",
        "text":   "#ffffff",
        "border": "#1f6fb2",
        "shadow": "rgba(31, 111, 178, 0.30)",
    },
    "success": {
        "bg":     "#15803d",
        "hover":  "#166534",
        "text":   "#ffffff",
        "border": "#15803d",
        "shadow": "rgba(21, 128, 61, 0.28)",
    },
    "danger": {
        "bg":     "#dc2626",
        "hover":  "#b91c1c",
        "text":   "#ffffff",
        "border": "#dc2626",
        "shadow": "rgba(220, 38, 38, 0.28)",
    },
    "danger-outline": {
        "bg":     "#fef2f2",
        "hover":  "#fee2e2",
        "text":   "#b91c1c",
        "border": "#fca5a5",
        "shadow": "rgba(220, 38, 38, 0.14)",
    },
    "warning": {
        "bg":     "#f59e0b",
        "hover":  "#d97706",
        "text":   "#111827",
        "border": "#b45309",
        "shadow": "rgba(245, 158, 11, 0.28)",
    },
    "neutral": {
        "bg":     "#475569",
        "hover":  "#334155",
        "text":   "#ffffff",
        "border": "#475569",
        "shadow": "rgba(71, 85, 105, 0.22)",
    },
}

_BADGE_VARIANTS: dict[str, dict[str, str]] = {
    "success":  {"bg": "#f0fdf4", "text": "#166534", "border": "#bbf7d0"},
    "danger":   {"bg": "#fef2f2", "text": "#b91c1c", "border": "#fecaca"},
    "warning":  {"bg": "#fffbeb", "text": "#92400e", "border": "#fde68a"},
    "info":     {"bg": "#eff6ff", "text": "#1d4ed8", "border": "#bfdbfe"},
    "neutral":  {"bg": "#f1f5f9", "text": "#475569", "border": "#e2e8f0"},
}


# ── Global style injection ─────────────────────────────────────────────

def inject_component_styles() -> None:
    """
    Inject global CSS that refines all standard Streamlit input widgets
    to match the Atlas Finance design system.

    Call this once at the top of each screen's render function, or once
    in main.py after inject_theme().
    """
    st.markdown(
        """
        <style>
        /* ── Text / Number / Date / Time inputs ──────────────────────── */
        [data-testid="stTextInput"] input,
        [data-testid="stNumberInput"] input {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 0.9rem !important;
            padding: 0.44rem 0.75rem !important;
            transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
        }
        [data-testid="stTextInput"] input:focus,
        [data-testid="stNumberInput"] input:focus {
            border-color: #1f6fb2 !important;
            box-shadow: 0 0 0 3px rgba(31, 111, 178, 0.15) !important;
            outline: none !important;
        }
        [data-testid="stTextInput"] input::placeholder,
        [data-testid="stNumberInput"] input::placeholder {
            color: #94a3b8 !important;
        }

        /* ── Textarea ─────────────────────────────────────────────────── */
        [data-testid="stTextArea"] textarea {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 0.9rem !important;
            padding: 0.5rem 0.75rem !important;
            transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
        }
        [data-testid="stTextArea"] textarea:focus {
            border-color: #1f6fb2 !important;
            box-shadow: 0 0 0 3px rgba(31, 111, 178, 0.15) !important;
        }

        /* ── Selectbox / Dropdown ─────────────────────────────────────── */
        [data-testid="stSelectbox"] [data-baseweb="select"] > div:first-child {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
            min-height: 2.4rem !important;
            transition: border-color 0.18s ease !important;
        }
        [data-testid="stSelectbox"] [data-baseweb="select"]:focus-within > div:first-child {
            border-color: #1f6fb2 !important;
            box-shadow: 0 0 0 3px rgba(31, 111, 178, 0.15) !important;
        }
        [data-testid="stSelectbox"] [data-baseweb="select"] span {
            color: #0f172a !important;
            font-size: 0.9rem !important;
        }

        /* ── Multiselect ──────────────────────────────────────────────── */
        [data-testid="stMultiSelect"] [data-baseweb="select"] > div:first-child {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
        }

        /* ── Date input ───────────────────────────────────────────────── */
        [data-testid="stDateInput"] [data-baseweb="input"] {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
            overflow: hidden !important;
            transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
        }
        [data-testid="stDateInput"] [data-baseweb="input"] input {
            border: none !important;
            background: transparent !important;
            color: #0f172a !important;
            font-size: 0.9rem !important;
            padding: 0.44rem 0.75rem !important;
            box-shadow: none !important;
        }
        [data-testid="stDateInput"] [data-baseweb="input"]:focus-within {
            border-color: #1f6fb2 !important;
            box-shadow: 0 0 0 3px rgba(31, 111, 178, 0.15) !important;
        }
        [data-testid="stDateInput"] [data-baseweb="input"] button {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: #64748b !important;
        }

        /* ── Time input (renders as select in Streamlit) ──────────────── */
        [data-testid="stTimeInput"] [data-baseweb="select"] > div:first-child {
            border-radius: 8px !important;
            border: 1px solid #dde3ec !important;
            background: #ffffff !important;
            min-height: 2.4rem !important;
            transition: border-color 0.18s ease !important;
        }
        [data-testid="stTimeInput"] [data-baseweb="select"]:focus-within > div:first-child {
            border-color: #1f6fb2 !important;
            box-shadow: 0 0 0 3px rgba(31, 111, 178, 0.15) !important;
        }
        [data-testid="stTimeInput"] [data-baseweb="select"] span {
            color: #0f172a !important;
            font-size: 0.9rem !important;
        }
        [data-testid="stTimeInput"] [data-baseweb="select"] [data-baseweb="input"],
        [data-testid="stTimeInput"] [data-baseweb="select"] input {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }

        /* ── Input labels ─────────────────────────────────────────────── */
        [data-testid="stTextInput"] label,
        [data-testid="stNumberInput"] label,
        [data-testid="stTextArea"] label,
        [data-testid="stSelectbox"] label,
        [data-testid="stMultiSelect"] label,
        [data-testid="stDateInput"] label,
        [data-testid="stTimeInput"] label {
            font-size: 0.82rem !important;
            font-weight: 600 !important;
            color: #1e293b !important;
            letter-spacing: 0.01em !important;
            margin-bottom: 0.18rem !important;
        }

        /* ── Checkbox ─────────────────────────────────────────────────── */
        [data-testid="stCheckbox"] label {
            font-size: 0.875rem !important;
            color: #1e293b !important;
            font-weight: 500 !important;
        }
        [data-testid="stCheckbox"] [data-testid="stWidgetLabel"] {
            gap: 0.5rem !important;
        }

        /* ── Radio buttons ────────────────────────────────────────────── */
        [data-testid="stRadio"] label {
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            color: #1e293b !important;
        }

        /* ── Divider ──────────────────────────────────────────────────── */
        .af-divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 1rem 0;
        }

        /* ── Section header ───────────────────────────────────────────── */
        .af-section-header {
            margin-top: 0.15rem;
            margin-bottom: 0.8rem;
        }
        .af-section-header .af-section-title {
            font-size: 1.9rem;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.01em;
            line-height: 1.2;
            margin: 0 0 0.15rem 0;
        }
        .af-section-header .af-section-sub {
            font-size: 0.9rem;
            color: #64748b;
            margin: 0;
        }

        /* ── Form section card ────────────────────────────────────────── */
        .af-form-section {
            background: #ffffff;
            border: 1px solid #e8edf5;
            border-radius: 14px;
            padding: 1.25rem 1.35rem;
            margin-bottom: 0.85rem;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .af-form-section .af-form-section-title {
            font-size: 1rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 0.9rem 0;
            padding-bottom: 0.6rem;
            border-bottom: 1px solid #f1f5f9;
        }

        /* ── Stat card ────────────────────────────────────────────────── */
        .af-stat-card {
            background: #ffffff;
            border: 1px solid #e8edf5;
            border-radius: 14px;
            padding: 1rem 1.2rem;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
        }
        .af-stat-card .af-stat-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .af-stat-card .af-stat-value {
            font-size: 1.65rem;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.15;
            font-variant-numeric: tabular-nums;
        }
        .af-stat-card .af-stat-delta {
            font-size: 0.8rem;
            font-weight: 600;
            margin-top: 0.1rem;
        }
        .af-stat-card .af-stat-delta.up   { color: #15803d; }
        .af-stat-card .af-stat-delta.down { color: #be123c; }
        .af-stat-card .af-stat-delta.neutral { color: #64748b; }

        /* ── Badge / tag ──────────────────────────────────────────────── */
        .af-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.18rem 0.6rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            border: 1px solid transparent;
            line-height: 1.4;
            white-space: nowrap;
        }

        /* ── Info box ─────────────────────────────────────────────────── */
        .af-info-box {
            border-radius: 10px;
            padding: 0.7rem 1rem;
            border: 1px solid;
            font-size: 0.88rem;
            margin: 0.5rem 0;
        }
        .af-info-box.info    { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .af-info-box.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .af-info-box.warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .af-info-box.danger  { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }

        /* ── Alert / Toast refinements ─────────────────────────────── */
        [data-testid="stAlert"] {
            border-radius: 10px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07) !important;
            animation: af-slide-in 0.25s ease !important;
        }
        @keyframes af-slide-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Empty state ────────────────────────────────────────── */
        .af-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 3rem 1rem;
            gap: 0.35rem;
        }
        .af-empty-state .af-es-icon {
            font-size: 2.5rem;
            margin-bottom: 0.4rem;
            opacity: 0.75;
        }
        .af-empty-state .af-es-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #1e293b;
        }
        .af-empty-state .af-es-msg {
            font-size: 0.875rem;
            color: #64748b;
            max-width: 36ch;
            line-height: 1.5;
        }

        /* ── KPI metric card ────────────────────────────────────── */
        .af-kpi-card {
            background: #ffffff;
            border: 1px solid #e8edf5;
            border-radius: 14px;
            padding: 1rem 1.2rem;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .af-kpi-card .af-kpi-label {
            font-size: 0.72rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.2rem;
        }
        .af-kpi-card .af-kpi-value {
            font-size: 1.7rem;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.1;
            font-variant-numeric: tabular-nums;
        }
        .af-kpi-card .af-kpi-sub {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 0.25rem;
        }
        .af-kpi-card .af-kpi-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.1rem 0.5rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            margin-left: 0.35rem;
        }
        .af-kpi-card .af-kpi-badge.up   { background: #f0fdf4; color: #15803d; }
        .af-kpi-card .af-kpi-badge.down { background: #fef2f2; color: #be123c; }
        .af-kpi-card .af-kpi-badge.flat { background: #f1f5f9; color: #475569; }

        /* ── Insight / info card ─────────────────────────────────── */
        .af-insight-card {
            background: #ffffff;
            border: 1px solid #e8edf5;
            border-left: 4px solid #1f6fb2;
            border-radius: 12px;
            padding: 0.9rem 1.1rem;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
        }
        .af-insight-card.tone-expense { border-left-color: #be123c; }
        .af-insight-card.tone-impact  { border-left-color: #047857; }
        .af-insight-card .af-ic-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 0.15rem;
        }
        .af-insight-card .af-ic-value {
            font-size: 1.35rem;
            font-weight: 800;
            color: #0f172a;
            font-variant-numeric: tabular-nums;
        }
        .af-insight-card .af-ic-sub {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 0.2rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


# ── Button ─────────────────────────────────────────────────────────────

def _inject_btn_style(key: str, variant: str) -> None:
    """Inject scoped CSS for a single button instance."""
    c = _VARIANTS.get(variant, _VARIANTS["neutral"])
    st.markdown(
        f"""
        <style>
        .st-key-{key} button {{
            background: {c['bg']} !important;
            border-color: {c['border']} !important;
            color: {c['text']} !important;
            font-weight: 700 !important;
            box-shadow: 0 1px 3px {c['shadow']} !important;
            transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease !important;
        }}
        .st-key-{key} button:hover {{
            background: {c['hover']} !important;
            border-color: {c['hover']} !important;
            color: {c['text']} !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 10px {c['shadow']} !important;
        }}
        .st-key-{key} button:active {{
            transform: translateY(0) !important;
            box-shadow: none !important;
        }}
        .st-key-{key} button:focus-visible {{
            outline: 2px solid #0ea5e9 !important;
            outline-offset: 2px !important;
        }}
        .st-key-{key} button:disabled {{
            background: #cbd5e1 !important;
            border-color: #cbd5e1 !important;
            color: #64748b !important;
            box-shadow: none !important;
            cursor: not-allowed !important;
            opacity: 1 !important;
            transform: none !important;
        }}
        .st-key-{key} button:disabled:hover {{
            background: #cbd5e1 !important;
            border-color: #cbd5e1 !important;
            color: #64748b !important;
            box-shadow: none !important;
            transform: none !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def btn(
    label: str,
    *,
    key: str,
    variant: str = "neutral",
    use_container_width: bool = False,
    disabled: bool = False,
    help: str | None = None,
    on_click: Callable[..., Any] | None = None,
    args: tuple[Any, ...] | None = None,
    kwargs: dict[str, Any] | None = None,
) -> bool:
    """
    Render a semantically styled button.

    Parameters
    ----------
    variant : "primary" | "success" | "danger" | "danger-outline" | "warning" | "neutral"
    """
    _inject_btn_style(key, variant)
    btn_type = "primary" if variant in {"primary", "success", "danger"} else "secondary"
    call_kw: dict[str, Any] = dict(
        label=label,
        key=key,
        type=btn_type,
        use_container_width=use_container_width,
        disabled=disabled,
    )
    if help is not None:
        call_kw["help"] = help
    if on_click is not None:
        call_kw["on_click"] = on_click
    if args is not None:
        call_kw["args"] = args
    if kwargs is not None:
        call_kw["kwargs"] = kwargs
    return st.button(**call_kw)


# ── Text input ─────────────────────────────────────────────────────────

def text_field(
    label: str,
    *,
    key: str,
    placeholder: str = "",
    help: str | None = None,
    disabled: bool = False,
    max_chars: int | None = None,
    autocomplete: str | None = None,
) -> str:
    """Render a styled single-line text input."""
    call_kw: dict[str, Any] = dict(
        label=label,
        key=key,
        placeholder=placeholder,
        disabled=disabled,
    )
    if help is not None:
        call_kw["help"] = help
    if max_chars is not None:
        call_kw["max_chars"] = max_chars
    if autocomplete is not None:
        call_kw["autocomplete"] = autocomplete
    return st.text_input(**call_kw)


def textarea_field(
    label: str,
    *,
    key: str,
    placeholder: str = "",
    height: int = 100,
    help: str | None = None,
    disabled: bool = False,
    max_chars: int | None = None,
) -> str:
    """Render a styled multi-line text area."""
    call_kw: dict[str, Any] = dict(
        label=label,
        key=key,
        placeholder=placeholder,
        height=height,
        disabled=disabled,
    )
    if help is not None:
        call_kw["help"] = help
    if max_chars is not None:
        call_kw["max_chars"] = max_chars
    return st.text_area(**call_kw)


# ── Number input ───────────────────────────────────────────────────────

_NUMERIC_LOCALE_SEPARATORS: dict[str, tuple[str, str]] = {
    "es_CO": (".", ","),
    "en_US": (",", "."),
}


def _normalize_numeric_locale(locale: str) -> str:
    """Normalize locale code for number formatting rules."""
    raw = (locale or "es_CO").strip()
    if not raw:
        return "es_CO"
    normalized = raw.replace("-", "_")
    if normalized in _NUMERIC_LOCALE_SEPARATORS:
        return normalized
    lower_map = {k.lower(): k for k in _NUMERIC_LOCALE_SEPARATORS}
    return lower_map.get(normalized.lower(), "es_CO")


def _locale_number_separators(locale: str) -> tuple[str, str]:
    """Return thousand and decimal separators for the locale."""
    key = _normalize_numeric_locale(locale)
    return _NUMERIC_LOCALE_SEPARATORS[key]

def _decimals_from_format(fmt: str) -> int:
    """Extract decimal precision from printf-style formats like %.2f."""
    match = re.search(r"%\.(\d+)f", fmt or "")
    if match:
        return int(match.group(1))
    return 2


def _parse_number_text(raw: str, *, decimal_sep: str, thousand_sep: str) -> float | None:
    """Parse user numeric text following locale separators."""
    text = (raw or "").strip().replace(" ", "")
    if not text:
        return 0.0

    decimal_re = re.escape(decimal_sep)
    thousand_re = re.escape(thousand_sep)
    text = re.sub(rf"[^0-9\-{decimal_re}{thousand_re}]", "", text)

    if not text or text in {"-", decimal_sep, f"-{decimal_sep}"}:
        return None

    if text.count("-") > 1:
        return None
    if "-" in text and not text.startswith("-"):
        return None

    normalized = text.replace(thousand_sep, "")
    if normalized.count(decimal_sep) > 1:
        return None
    normalized = normalized.replace(decimal_sep, ".")

    try:
        return float(normalized)
    except ValueError:
        return None


def _format_number_text(value: float, *, decimals: int, decimal_sep: str, thousand_sep: str) -> str:
    """Format using locale-specific grouping and decimal separators."""
    us = f"{value:,.{decimals}f}"
    return us.replace(",", "_").replace(".", decimal_sep).replace("_", thousand_sep)


def _bind_number_input_behavior(
    widget_key: str,
    decimals: int,
    *,
    decimal_sep: str,
    thousand_sep: str,
    select_zero_on_focus: bool,
    preserve_caret_position: bool,
) -> None:
    """Bind numeric-only typing, dynamic grouping, and select-all-on-focus behavior."""
    st_components.html(
        f"""
        <script>
        (function() {{
          const query = '.st-key-{widget_key} input';
          const decimals = {decimals};
          const decimalSep = {decimal_sep!r};
                    const altDecimalSep = decimalSep === ',' ? '.' : ',';
          const thousandSep = {thousand_sep!r};
          const selectZeroOnFocus = {str(select_zero_on_focus).lower()};
          const preserveCaretPosition = {str(preserve_caret_position).lower()};

                    function groupThousands(intPart) {{
                        if (!intPart) return '';
            return intPart.replace(/\B(?=(\d{{3}})+(?!\d))/g, thousandSep);
                    }}

                    function sanitizeAndFormat(raw) {{
                        let value = String(raw || '');
                        value = value.replace(/\s+/g, '');

                        const negative = value.startsWith('-');
                        let cleaned = '';
                        for (const ch of value) {{
                            if ((ch >= '0' && ch <= '9') || ch === decimalSep || ch === '-') {{
                                cleaned += ch;
                            }}
                        }}
                        value = cleaned;
                        value = value.replace(/-/g, '');

            let parts = value.split(decimalSep);
                        let intPart = (parts[0] || '').replace(/\D/g, '');
                        let decPart = parts.length > 1 ? parts.slice(1).join('').replace(/\D/g, '') : '';
            const hasTrailingDecimal = decimals > 0 && value.endsWith(decimalSep);

                        if (decimals <= 0) {{
                            decPart = '';
                        }} else if (decPart.length > decimals) {{
                            decPart = decPart.slice(0, decimals);
                        }}

                        const groupedInt = groupThousands(intPart);
                        const sign = negative && groupedInt ? '-' : '';
                        if (hasTrailingDecimal && decPart.length === 0) {{
                            return sign + groupedInt + decimalSep;
                        }}
                        if (decPart.length > 0) {{
                            return sign + groupedInt + decimalSep + decPart;
                        }}
                        return sign + groupedInt;
                    }}

          let attempts = 0;
          const timer = setInterval(() => {{
            attempts += 1;
            const input = window.parent.document.querySelector(query);
            if (!input) {{
              if (attempts > 20) clearInterval(timer);
              return;
            }}
            if (input.dataset.afSelectBound === '1') {{
              clearInterval(timer);
              return;
            }}
            input.dataset.afSelectBound = '1';

                        input.addEventListener('focus', () => {{
                            if (!selectZeroOnFocus) return;
                            const zeroFormatted = decimals > 0
                                ? '0' + decimalSep + '0'.repeat(decimals)
                                : '0';
                            const value = String(input.value || '').trim();
                            if (value === zeroFormatted || value === '0') {{
                                setTimeout(() => input.select(), 0);
                            }}
                        }});

                        input.addEventListener('keydown', (e) => {{
                            const allowedKeys = new Set([
                                'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                'Home', 'End', 'Tab', 'Enter', 'Escape'
                            ]);
                            if (e.ctrlKey || e.metaKey) return;
                            if (allowedKeys.has(e.key)) return;
                            if (/^\d$/.test(e.key)) return;

                            const isNumpadDecimal = e.code === 'NumpadDecimal' || e.key === 'Decimal';
                            const pressedDecimal = e.key === decimalSep || e.key === altDecimalSep || isNumpadDecimal;

                            if (pressedDecimal) {{
                                if (decimals <= 0) {{
                                    e.preventDefault();
                                    return;
                                }}

                                const start = input.selectionStart ?? 0;
                                const end = input.selectionEnd ?? 0;
                                const selected = input.value.slice(start, end);
                                const hasDecimalOutsideSelection =
                                    input.value.includes(decimalSep) && !selected.includes(decimalSep);

                                if (hasDecimalOutsideSelection) {{
                                    e.preventDefault();
                                    return;
                                }}

                                e.preventDefault();
                                input.setRangeText(decimalSep, start, end, 'end');
                                input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                return;
                            }}

                            if (e.key === '-') {{
                                if (input.selectionStart === 0 && !input.value.includes('-')) return;
                            }}

                            e.preventDefault();
                        }});

                        input.addEventListener('input', () => {{
                            if (!preserveCaretPosition) {{
                                const formatted = sanitizeAndFormat(input.value);
                                if (input.value !== formatted) {{
                                    input.value = formatted;
                                }}
                                return;
                            }}

                            const rawValue = String(input.value || '');
                            const cursorStart = input.selectionStart ?? rawValue.length;
                            const leftPart = rawValue.slice(0, cursorStart);
                            const digitsBeforeCursor = (leftPart.match(/\d/g) || []).length;

                            const formatted = sanitizeAndFormat(rawValue);
                            if (rawValue !== formatted) {{
                                input.value = formatted;

                                let newCursor = formatted.length;
                                if (digitsBeforeCursor <= 0) {{
                                    newCursor = 0;
                                }} else {{
                                    let seenDigits = 0;
                                    for (let i = 0; i < formatted.length; i += 1) {{
                                        if (/\d/.test(formatted[i])) {{
                                            seenDigits += 1;
                                        }}
                                        if (seenDigits >= digitsBeforeCursor) {{
                                            newCursor = i + 1;
                                            break;
                                        }}
                                    }}
                                }}

                                input.setSelectionRange(newCursor, newCursor);
                            }}
                        }});
            clearInterval(timer);
          }}, 120);
        }})();
        </script>
        """,
        height=0,
        width=0,
    )


def _sync_number_display(
    display_key: str,
    value_key: str,
    decimals: int,
    min_value: float | None,
    max_value: float | None,
    locale: str,
) -> None:
    """Normalize display text and sync parsed numeric value into session state."""
    thousand_sep, decimal_sep = _locale_number_separators(locale)
    parsed = _parse_number_text(
        str(st.session_state.get(display_key, "")),
        decimal_sep=decimal_sep,
        thousand_sep=thousand_sep,
    )
    if parsed is None:
        parsed = float(st.session_state.get(value_key, 0.0) or 0.0)
    if min_value is not None:
        parsed = max(parsed, min_value)
    if max_value is not None:
        parsed = min(parsed, max_value)

    st.session_state[value_key] = float(parsed)
    st.session_state[display_key] = _format_number_text(
        float(parsed),
        decimals=decimals,
        decimal_sep=decimal_sep,
        thousand_sep=thousand_sep,
    )

def number_field(
    label: str,
    *,
    key: str,
    min_value: float | None = None,
    max_value: float | None = None,
    step: float = 1.0,
    value: float | None = None,
    format: str = "%.2f",
    locale: str = "es_CO",
    help: str | None = None,
    disabled: bool = False,
    live_formatting: bool = True,
    select_zero_on_focus: bool = True,
    preserve_caret_position: bool = True,
) -> float:
    """Render a styled numeric input with locale-aware separators and clean editing UX."""
    locale_key = _normalize_numeric_locale(locale)
    thousand_sep, decimal_sep = _locale_number_separators(locale_key)
    decimals = _decimals_from_format(format)
    display_key = f"{key}__display"
    display_locale_key = f"{key}__display_locale"

    if key not in st.session_state:
        if value is not None:
            initial = float(value)
        elif min_value is not None and min_value > 0:
            initial = float(min_value)
        else:
            initial = 0.0
        st.session_state[key] = initial

    if display_key not in st.session_state:
        st.session_state[display_key] = _format_number_text(
            float(st.session_state[key]),
            decimals=decimals,
            decimal_sep=decimal_sep,
            thousand_sep=thousand_sep,
        )

    if st.session_state.get(display_locale_key) != locale_key:
        st.session_state[display_key] = _format_number_text(
            float(st.session_state.get(key, 0.0) or 0.0),
            decimals=decimals,
            decimal_sep=decimal_sep,
            thousand_sep=thousand_sep,
        )
        st.session_state[display_locale_key] = locale_key

    call_kw: dict[str, Any] = dict(
        label=label,
        key=display_key,
        disabled=disabled,
    )
    if help is not None:
        call_kw["help"] = help
    st.text_input(**call_kw)
    if live_formatting:
        _bind_number_input_behavior(
            display_key,
            decimals,
            decimal_sep=decimal_sep,
            thousand_sep=thousand_sep,
            select_zero_on_focus=select_zero_on_focus,
            preserve_caret_position=preserve_caret_position,
        )

    parsed_live = _parse_number_text(
        str(st.session_state.get(display_key, "")),
        decimal_sep=decimal_sep,
        thousand_sep=thousand_sep,
    )
    current = float(st.session_state.get(key, 0.0) or 0.0)
    if parsed_live is not None:
        current = parsed_live
    if min_value is not None:
        current = max(current, min_value)
    if max_value is not None:
        current = min(current, max_value)
    if step > 0:
        # Keep precision stable for callers expecting decimal step behavior.
        current = round(current, decimals)

    st.session_state[key] = float(current)
    return float(current)


# ── Date & time inputs ─────────────────────────────────────────────────

def date_field(
    label: str,
    *,
    key: str,
    min_value: date | None = None,
    max_value: date | None = None,
    help: str | None = None,
    disabled: bool = False,
) -> date:
    """Render a styled date picker."""
    call_kw: dict[str, Any] = dict(label=label, key=key, disabled=disabled)
    if min_value is not None:
        call_kw["min_value"] = min_value
    if max_value is not None:
        call_kw["max_value"] = max_value
    if help is not None:
        call_kw["help"] = help
    return st.date_input(**call_kw)


def time_field(
    label: str,
    *,
    key: str,
    step: int = 60,
    help: str | None = None,
    disabled: bool = False,
) -> time:
    """Render a styled time picker (step in seconds, default = 1 min)."""
    call_kw: dict[str, Any] = dict(label=label, key=key, step=step, disabled=disabled)
    if help is not None:
        call_kw["help"] = help
    return st.time_input(**call_kw)


# ── Select & multi-select ──────────────────────────────────────────────

def select_field(
    label: str,
    options: list[Any],
    *,
    key: str,
    help: str | None = None,
    disabled: bool = False,
) -> Any:
    """Render a styled single-select dropdown."""
    call_kw: dict[str, Any] = dict(label=label, options=options, key=key, disabled=disabled)
    if help is not None:
        call_kw["help"] = help
    return st.selectbox(**call_kw)


def multiselect_field(
    label: str,
    options: list[Any],
    *,
    key: str,
    default: list[Any] | None = None,
    help: str | None = None,
    disabled: bool = False,
) -> list[Any]:
    """Render a styled multi-select dropdown."""
    call_kw: dict[str, Any] = dict(label=label, options=options, key=key, disabled=disabled)
    if default is not None:
        call_kw["default"] = default
    if help is not None:
        call_kw["help"] = help
    return st.multiselect(**call_kw)


# ── Layout helpers ─────────────────────────────────────────────────────

def section_header(title: str, subtitle: str = "") -> None:
    """
    Render a prominent section title with optional subtitle.

    Example
    -------
    section_header("Movimientos", "Registra y consulta tus transacciones")
    """
    sub_html = (
        f'<p class="af-section-sub">{_html.escape(subtitle)}</p>'
        if subtitle
        else ""
    )
    st.markdown(
        f"""
        <div class="af-section-header">
          <p class="af-section-title">{_html.escape(title)}</p>
          {sub_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def form_section(title: str = "") -> None:
    """
    Render a card-style section opener for grouping form fields.
    Must be followed by a matching `st.markdown('</div>', unsafe_allow_html=True)` closer,
    or use it purely as a visual block opener in your screen layout.

    Example
    -------
    form_section("Datos del movimiento")
    ...fields...
    st.markdown('</div>', unsafe_allow_html=True)
    """
    title_html = (
        f'<p class="af-form-section-title">{_html.escape(title)}</p>'
        if title
        else ""
    )
    st.markdown(
        f'<div class="af-form-section">{title_html}',
        unsafe_allow_html=True,
    )


def divider() -> None:
    """Render a subtle horizontal rule consistent with the design system."""
    st.markdown('<hr class="af-divider" />', unsafe_allow_html=True)


# ── Data display helpers ───────────────────────────────────────────────

def stat_card(
    label: str,
    value: str,
    delta: str | None = None,
    *,
    delta_direction: str = "neutral",
) -> None:
    """
    Render a KPI stat card.

    Parameters
    ----------
    label           : small uppercase label above the value
    value           : main metric string (pre-formatted, e.g. "$1,200.00")
    delta           : optional trend line below the value
    delta_direction : "up" | "down" | "neutral"  (controls delta color)

    Example
    -------
    stat_card("Gastos del mes", "$245,000", delta="↑ 12 % vs mes anterior", delta_direction="down")
    """
    delta_html = ""
    if delta:
        direction_class = delta_direction if delta_direction in {"up", "down"} else "neutral"
        delta_html = (
            f'<p class="af-stat-delta {direction_class}">'
            f"{_html.escape(delta)}</p>"
        )
    st.markdown(
        f"""
        <div class="af-stat-card">
          <span class="af-stat-label">{_html.escape(label)}</span>
          <span class="af-stat-value">{_html.escape(value)}</span>
          {delta_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def badge(text: str, variant: str = "neutral") -> str:
    """
    Return an inline HTML badge/tag string.
    Useful inside `st.markdown(..., unsafe_allow_html=True)` calls.

    Parameters
    ----------
    variant : "success" | "danger" | "warning" | "info" | "neutral"

    Example
    -------
    st.markdown(f"Estado: {badge('Activo', 'success')}", unsafe_allow_html=True)
    """
    c = _BADGE_VARIANTS.get(variant, _BADGE_VARIANTS["neutral"])
    return (
        f'<span class="af-badge" style="'
        f"background:{c['bg']};"
        f"color:{c['text']};"
        f"border-color:{c['border']};"
        f'">{_html.escape(text)}</span>'
    )


def info_box(message: str, variant: str = "info") -> None:
    """
    Render a styled inline info/alert box (lighter than st.warning/st.error).

    Parameters
    ----------
    variant : "info" | "success" | "warning" | "danger"
    """
    allowed = {"info", "success", "warning", "danger"}
    css_class = variant if variant in allowed else "info"
    st.markdown(
        f'<div class="af-info-box {css_class}">{_html.escape(message)}</div>',
        unsafe_allow_html=True,
    )


# ── Notifications / Toasts ──────────────────────────────────────────

def _emit_toast(message: str, icon: str, fallback) -> None:
    """Emit a toast when available, falling back to inline alert otherwise."""
    toast_fn = getattr(st, "toast", None)
    if callable(toast_fn):
        toast_fn(message, icon=icon)
        return
    fallback(f"{icon} {message}")


def show_success(message: str, icon: str = "✅") -> None:
    """Show a success toast notification (inline fallback)."""
    _emit_toast(message, icon, st.success)


def show_error(message: str, icon: str = "⚠️") -> None:
    """Show an error toast notification (inline fallback)."""
    _emit_toast(message, icon, st.error)


# ── Sticky Period & Currency Filter Bar ────────────────────────────────

def _inject_sticky_filter_style() -> None:
    """Inject CSS for sticky filter bar (called once per app rerun)."""
    st.markdown(
        """
        <style>
        /* Parent wrapper is made sticky via :has() selector */
        div:has(> .st-key-sticky-period-filter) {
            position: sticky !important;
            top: 0 !important;
            z-index: 999 !important;
            background-color: var(--c-bg) !important;
            padding: 8px 0 8px !important;
            border-bottom: none !important;
            box-shadow: none !important;
        }

        /* Reset the inner container — parent is now sticky */
        .st-key-sticky-period-filter {
            position: static !important;
            top: auto !important;
            z-index: auto !important;
            background: transparent !important;
            border-bottom: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin-bottom: 0 !important;
        }

        /* Align all columns to bottom so button sits level with inputs */
        .st-key-sticky-period-filter > [data-testid="stHorizontalBlock"] {
            align-items: flex-end !important;
            gap: 10px !important;
        }

        /* Remove extra gap inside each column's vertical block */
        .st-key-sticky-period-filter [data-testid="stColumn"] > [data-testid="stVerticalBlock"] {
            gap: 2px !important;
        }

        .st-key-sticky-period-filter label,
        .st-key-sticky-period-filter [data-testid="stWidgetLabel"] p {
            font-size: 0.75rem !important;
            color: var(--c-muted) !important;
            margin-bottom: 1px !important;
            font-weight: 600 !important;
        }

        .st-key-sticky-period-filter [data-testid="stSelectbox"],
        .st-key-sticky-period-filter [data-testid="stDateInput"] {
            margin-bottom: 0 !important;
        }

        /* === HEIGHT NORMALIZATION ===
           Force all controls to the same 38px height so the 4 columns
           always line up regardless of Streamlit's internal DOM changes. */

        /* Uniform label row height */
        .st-key-sticky-period-filter [data-testid="stWidgetLabel"] {
            height: 20px !important;
            min-height: 20px !important;
            display: flex !important;
            align-items: center !important;
        }

        /* Outer control row: same height for selectbox and date_input */
        .st-key-sticky-period-filter [data-testid="stSelectbox"] > div:first-child,
        .st-key-sticky-period-filter [data-testid="stDateInput"] > div:first-child {
            height: 38px !important;
            min-height: 38px !important;
            max-height: 38px !important;
            box-sizing: border-box !important;
        }

        /* Inner trigger row inside selectbox */
        .st-key-sticky-period-filter [data-testid="stSelectbox"] > div:first-child > div {
            height: 38px !important;
            min-height: 38px !important;
            display: flex !important;
            align-items: center !important;
        }

        /* Actual input element inside date_input */
        .st-key-sticky-period-filter [data-testid="stDateInput"] input {
            height: 38px !important;
            min-height: 38px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            box-sizing: border-box !important;
        }

        /* Disabled date fields are auto-calculated by selected period. */
        .st-key-sticky-period-filter [data-testid="stDateInput"] input:disabled {
            color: var(--c-text) !important;
            opacity: 0.82 !important;
            cursor: not-allowed !important;
        }

        .st-key-sticky-period-filter [data-testid="stDateInput"] button[disabled] {
            opacity: 0.55 !important;
            cursor: not-allowed !important;
        }

        /* Hide validation/instruction nodes that shift date_input height —
           errors are shown as toast in Spanish instead. */
        .st-key-sticky-period-filter [data-testid="InputInstructions"],
        .st-key-sticky-period-filter [data-testid="stDateInputError"],
        .st-key-sticky-period-filter [data-testid="stDateInput"] ~ small {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        /* Ensure ancestor chain doesn't create an intermediate scroll context */
        section[data-testid="stMain"] .block-container,
        section[data-testid="stMain"] [data-testid="stVerticalBlock"],
        section[data-testid="stMain"] [data-testid="stVerticalBlockBorderWrapper"] {
            overflow: visible !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _inject_date_input_i18n_patch() -> None:
        """Translate Streamlit date range validation errors to Spanish in-place."""
        st_components.html(
                """
                <script>
                (function () {
                    function install(rootDoc) {
                        const win = rootDoc.defaultView || window;
                        if (win.__atlasDateI18nInstalled) return;
                        win.__atlasDateI18nInstalled = true;

                        const rangeRegex = /(?:Error:\s*)?Date set outside allowed range\.\s*Please select a date between\s*([^\s]+)\s*and\s*([^\.]+)\.?/i;

                        function translateText(text) {
                            if (!text || text.indexOf('Date set outside allowed range') === -1) {
                                return text;
                            }
                            return text.replace(rangeRegex, (_m, fromDate, toDate) => {
                                return `Fecha fuera del rango permitido. Selecciona una fecha entre ${fromDate.trim()} y ${toDate.trim()}.`;
                            });
                        }

                        function translateNode(node) {
                            if (!node || !node.nodeValue) return;
                            const translated = translateText(node.nodeValue);
                            if (translated !== node.nodeValue) {
                                node.nodeValue = translated;
                            }
                        }

                        function translateAll() {
                            if (!rootDoc.body) return;
                            const walker = rootDoc.createTreeWalker(rootDoc.body, NodeFilter.SHOW_TEXT);
                            let current = walker.nextNode();
                            while (current) {
                                translateNode(current);
                                current = walker.nextNode();
                            }
                        }

                        translateAll();

                        const observer = new MutationObserver((mutations) => {
                            for (const mutation of mutations) {
                                if (mutation.type === 'characterData') {
                                    translateNode(mutation.target);
                                    continue;
                                }
                                mutation.addedNodes.forEach((added) => {
                                    if (added.nodeType === Node.TEXT_NODE) {
                                        translateNode(added);
                                        return;
                                    }
                                    if (added.nodeType === Node.ELEMENT_NODE) {
                                        const subWalker = rootDoc.createTreeWalker(added, NodeFilter.SHOW_TEXT);
                                        let sub = subWalker.nextNode();
                                        while (sub) {
                                            translateNode(sub);
                                            sub = subWalker.nextNode();
                                        }
                                    }
                                });
                            }
                        });

                        observer.observe(rootDoc.body, {
                            childList: true,
                            subtree: true,
                            characterData: true,
                        });
                    }

                    try {
                        install(parent.document);
                    } catch (_err) {
                        install(document);
                    }
                })();
                </script>
                """,
                height=0,
        )


def sticky_period_filter(
    period_options: list[str] | None = None,
    default_period: str | None = None,
    default_from: date | None = None,
    default_to: date | None = None,
    min_date: date | None = None,
    max_date: date | None = None,
    default_currency: str = "COP",
    currency_options: list[str] | None = None,
    context_caption: str | None = None,
) -> dict[str, Any]:
    """
    Render a sticky period and currency filter bar.

    This component is sticky (remains visible when scrolling) and spans the full width.
    It includes: Period selector, From/To dates (for custom mode), Currency selector.

    Parameters
    ----------
    period_options : list[str], optional
        Period presets (default: ["Año actual", "Últimos 90 días", "Últimos 30 días", "Personalizado"])
    default_period : str, optional
        Default selected period preset
    default_from : date, optional
        Default start date for custom period
    default_to : date, optional
        Default end date for custom period
    min_date : date, optional
        Minimum selectable date in custom mode
    max_date : date, optional
        Maximum selectable date in custom mode
    default_currency : str
        Default currency ("COP" or "USD")
    currency_options : list[str], optional
        Available currencies (default: ["COP", "USD"])
    context_caption : str, optional
        Additional context shown below filter controls

    Returns
    -------
    dict with keys:
        - period_value (str): Currently selected period
        - from_value (date): Start date (if custom)
        - to_value (date): End date (if custom)
        - currency_value (str): Selected currency
        - is_custom (bool): Whether "Personalizado" is selected

    Example
    -------
    _inject_sticky_filter_style()  # Call once per screen
    result = sticky_period_filter(
        default_period="Año actual",
        default_from=date(2026, 1, 1),
        default_to=date(2026, 4, 22),
    )
    period = result["period_value"]
    from_date = result["from_value"]
    to_date = result["to_value"]
    currency = result["currency_value"]
    """
    if period_options is None:
        period_options = ["Año actual", "Últimos 90 días", "Últimos 30 días", "Personalizado"]
    if currency_options is None:
        currency_options = ["COP", "USD"]
    if default_period is None:
        default_period = period_options[0]
    if default_from is None:
        default_from = date(date.today().year, 1, 1)
    if default_to is None:
        default_to = date.today()

    absolute_min = min_date or date(1900, 1, 1)
    absolute_max = max_date or date.today()
    if absolute_min > absolute_max:
        absolute_min, absolute_max = absolute_max, absolute_min

    # Normalize range to keep widget bounds valid if state arrives inverted.
    base_from = min(default_from, default_to)
    base_to = max(default_from, default_to)
    base_from = max(absolute_min, min(base_from, absolute_max))
    base_to = max(base_from, min(base_to, absolute_max))

    # Inject CSS once
    _inject_sticky_filter_style()
    _inject_date_input_i18n_patch()

    with st.container(key="sticky-period-filter"):
        # 4-column layout: period, from_date, to_date, currency
        f1, f2, f3, f_cur = st.columns([3.2, 1.6, 1.6, 1.2])

        with f1:
            period_value = st.selectbox(
                "Período",
                period_options,
                index=period_options.index(default_period),
                help="Define el rango de tiempo para analizar tus finanzas.",
            )

        is_custom = period_value == "Personalizado"

        # Keep date widgets synced with the currently selected preset.
        if not is_custom:
            today_local = date.today()
            if period_value == "Últimos 30 días":
                display_from, display_to = today_local - timedelta(days=29), today_local
            elif period_value == "Últimos 90 días":
                display_from, display_to = today_local - timedelta(days=89), today_local
            elif period_value == "Año actual":
                display_from, display_to = date(today_local.year, 1, 1), date(today_local.year, 12, 31)
            else:
                display_from, display_to = base_from, base_to

            from_min = min(display_from, display_to)
            from_max = max(display_from, display_to)
            to_min = from_min
            to_max = from_max
        else:
            display_from, display_to = base_from, base_to
            from_min = absolute_min
            from_max = display_to
            to_min = display_from
            to_max = absolute_max

        from_key = "sticky_period_filter_from"
        to_key = "sticky_period_filter_to"

        if not is_custom:
            st.session_state[from_key] = display_from
            st.session_state[to_key] = display_to
        else:
            st.session_state.setdefault(from_key, display_from)
            st.session_state.setdefault(to_key, display_to)

        with f2:
            from_value = st.date_input(
                "Desde",
                value=display_from,
                min_value=from_min,
                max_value=from_max,
                key=from_key,
                disabled=not is_custom,
                help="Fecha inicial. Solo activo en modo Personalizado.",
            )

        with f3:
            to_value = st.date_input(
                "Hasta",
                value=display_to,
                min_value=to_min,
                max_value=to_max,
                key=to_key,
                disabled=not is_custom,
                help="Fecha final. Solo activo en modo Personalizado.",
            )

        with f_cur:
            currency_value = st.selectbox(
                "Moneda",
                currency_options,
                index=currency_options.index(default_currency),
                help="Moneda para montos, tarjetas y gráficos.",
            )

        if context_caption:
            st.caption(context_caption)

    return {
        "period_value": period_value,
        "from_value": from_value,
        "to_value": to_value,
        "currency_value": currency_value,
        "is_custom": is_custom,
    }


def show_warning(message: str, icon: str = "⚠️") -> None:
    """Show a warning toast notification (inline fallback)."""
    _emit_toast(message, icon, st.warning)


def show_info(message: str, icon: str = "ℹ️") -> None:
    """Show an informational toast notification (inline fallback)."""
    _emit_toast(message, icon, st.info)


# ── Empty state ──────────────────────────────────────────────────

def empty_state(
    title: str,
    message: str,
    icon: str = "📭",
    *,
    button_label: str | None = None,
    button_key: str | None = None,
    button_variant: str = "primary",
) -> bool:
    """
    Render an empty-state placeholder with optional call-to-action button.

    Returns True if the CTA button was clicked.

    Example
    -------
    if empty_state("Sin movimientos", "Crea tu primer movimiento.", "💸",
                   button_label="Crear movimiento", button_key="es_create"):
        ...
    """
    st.markdown(
        f"""
        <div class="af-empty-state">
          <div class="af-es-icon">{_html.escape(icon)}</div>
          <div class="af-es-title">{_html.escape(title)}</div>
          <div class="af-es-msg">{_html.escape(message)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if button_label and button_key:
        col1, col2, col3 = st.columns([1, 1.4, 1])
        with col2:
            return btn(button_label, key=button_key, variant=button_variant, use_container_width=True)
    return False


# ── KPI metric card ───────────────────────────────────────────

def kpi_card(
    label: str,
    value: str,
    sub: str = "",
    *,
    badge_text: str = "",
    badge_type: str = "flat",
) -> None:
    """
    Render a KPI metric card with optional delta badge.

    Parameters
    ----------
    label      : small uppercase descriptor
    value      : formatted main metric (e.g. "$ 1,240,000")
    sub        : secondary line (e.g. period or context)
    badge_text : optional compact delta label (e.g. "↑ 8 %")
    badge_type : "up" | "down" | "flat"  (controls badge color)

    Example
    -------
    kpi_card("Ingresos", "$ 3,200,000", "Este mes", badge_text="↑ 12 %", badge_type="up")
    """
    allowed = {"up", "down", "flat"}
    bt = badge_type if badge_type in allowed else "flat"
    badge_html = (
        f'<span class="af-kpi-badge {bt}">{_html.escape(badge_text)}</span>'
        if badge_text else ""
    )
    st.markdown(
        f"""
        <div class="af-kpi-card">
          <div class="af-kpi-label">{_html.escape(label)}</div>
          <div class="af-kpi-value">{_html.escape(value)}</div>
          <div class="af-kpi-sub">{_html.escape(sub)}{badge_html}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ── Insight / info card ────────────────────────────────────────

def info_card(
    label: str,
    value: str,
    *,
    sub: str = "",
    tone: str = "balance",
) -> None:
    """
    Render an insight card with a semantic left-border accent.

    Parameters
    ----------
    tone : "balance" (blue) | "expense" (red) | "impact" (green)

    Example
    -------
    info_card("Mayor gasto", "Alimentación", sub="$ 180,000", tone="expense")
    """
    allowed_tones = {"balance", "expense", "impact"}
    tone_cls = f"tone-{tone}" if tone in allowed_tones else "tone-balance"
    sub_html = f'<div class="af-ic-sub">{_html.escape(sub)}</div>' if sub else ""
    st.markdown(
        f"""
        <div class="af-insight-card {tone_cls}">
          <div class="af-ic-label">{_html.escape(label)}</div>
          <div class="af-ic-value">{_html.escape(value)}</div>
          {sub_html}
        </div>
        """,
        unsafe_allow_html=True,
    )
