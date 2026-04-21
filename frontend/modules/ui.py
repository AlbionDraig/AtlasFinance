from __future__ import annotations

import html

import streamlit as st


def inject_theme() -> None:
    """Apply the global social-inspired visual theme to the app."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap');

        :root {
            --bg-main: #f8f1ea;
            --bg-top: #fff8f3;
            --bg-bottom: #f6eee8;
            --bg-panel: rgba(255, 255, 255, 0.82);
            --bg-strong: #ffffff;
            --text-main: #1f1714;
            --text-soft: #6d5c55;
            --line-soft: rgba(123, 82, 65, 0.14);
            --accent-main: #ff5a36;
            --accent-secondary: #ff8a3d;
            --accent-tertiary: #e52e3d;
            --accent-dark: #351611;
            --success-soft: #e8fff1;
            --warning-soft: #fff4df;
            --shadow-soft: 0 24px 60px rgba(56, 23, 16, 0.12);
            --input-bg: rgba(255, 255, 255, 0.85);
            --input-line: rgba(108, 74, 59, 0.16);
            --tab-bg: rgba(255, 255, 255, 0.55);
            --sidebar-top: #231412;
            --sidebar-bottom: #351611;
            --sidebar-text: #fff7f4;
            --header-bg: rgba(255, 248, 243, 0.86);
            --widget-dark: #272836;
            --widget-dark-text: #fff7f4;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-main: #0f1118;
                --bg-top: #151925;
                --bg-bottom: #0d0f15;
                --bg-panel: rgba(22, 27, 39, 0.82);
                --bg-strong: #171b28;
                --text-main: #f5f1ee;
                --text-soft: #b6adab;
                --line-soft: rgba(255, 255, 255, 0.09);
                --shadow-soft: 0 24px 60px rgba(0, 0, 0, 0.34);
                --input-bg: rgba(18, 22, 33, 0.96);
                --input-line: rgba(255, 255, 255, 0.09);
                --tab-bg: rgba(18, 22, 33, 0.78);
                --sidebar-top: #0c0e16;
                --sidebar-bottom: #18121d;
                --sidebar-text: #f7f0ec;
                --header-bg: rgba(11, 14, 22, 0.86);
                --widget-dark: #171b28;
                --widget-dark-text: #f6f0eb;
            }
        }

        html, body, [class*="css"] {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: var(--text-main);
        }

        html, body,
        [data-testid="stAppViewContainer"],
        [data-testid="stHeader"] {
            color-scheme: light dark;
        }

        .stApp {
            background:
                radial-gradient(circle at top left, rgba(255, 112, 67, 0.18), transparent 25%),
                radial-gradient(circle at 85% 10%, rgba(229, 46, 61, 0.14), transparent 20%),
                linear-gradient(180deg, var(--bg-top) 0%, var(--bg-main) 52%, var(--bg-bottom) 100%);
            color: var(--text-main);
        }

        .block-container {
            padding-top: 1.4rem;
            padding-bottom: 2rem;
            max-width: 1260px;
        }

        [data-testid="stHeader"] {
            background: var(--header-bg);
            backdrop-filter: blur(12px);
        }

        [data-testid="stToolbar"] button,
        [data-testid="stToolbar"] svg,
        [data-testid="stToolbar"] * {
            color: var(--text-main) !important;
            fill: var(--text-main) !important;
        }

        .stApp h1,
        .stApp h2,
        .stApp h3,
        .stApp h4,
        .stApp h5,
        .stApp h6,
        .stApp p,
        .stApp label,
        .stApp span,
        .stApp div {
            color: var(--text-main);
        }

        .stApp small,
        .stApp .caption,
        .stApp [data-testid="stCaptionContainer"],
        .stApp [data-testid="stMarkdownContainer"] p,
        .section-copy,
        .content-card p,
        .metric-card .metric-caption,
        .metric-card .metric-label {
            color: var(--text-soft) !important;
        }

        [data-testid="stWidgetLabel"],
        [data-testid="stWidgetLabel"] *,
        .stSelectbox label,
        .stTextInput label,
        .stNumberInput label,
        .stDateInput label,
        .stTimeInput label {
            color: var(--text-main) !important;
            font-weight: 700;
        }

        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, var(--sidebar-top) 0%, var(--sidebar-bottom) 100%);
            border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-testid="stSidebar"] * {
            color: var(--sidebar-text) !important;
        }

        [data-testid="stSidebar"] .stButton > button {
            background: linear-gradient(135deg, #ff5a36 0%, #ff8a3d 100%);
            color: white;
            border: none;
        }

        .stTabs [data-baseweb="tab-list"] {
            gap: 0.75rem;
            background: var(--tab-bg);
            border: 1px solid var(--line-soft);
            padding: 0.4rem;
            border-radius: 999px;
            backdrop-filter: blur(18px);
        }

        .stTabs [data-baseweb="tab"] {
            height: 3rem;
            padding: 0 1.25rem;
            border-radius: 999px;
            color: var(--text-soft);
            font-weight: 700;
        }

        .stTabs [aria-selected="true"] {
            background: linear-gradient(135deg, var(--accent-main) 0%, var(--accent-secondary) 100%);
            color: white;
        }

        .stButton > button,
        .stFormSubmitButton > button {
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, var(--accent-main) 0%, var(--accent-secondary) 100%);
            color: white;
            font-weight: 800;
            padding: 0.82rem 1rem;
            box-shadow: 0 12px 28px rgba(229, 46, 61, 0.22);
        }

        .stButton > button:hover,
        .stFormSubmitButton > button:hover {
            filter: brightness(1.04);
            transform: translateY(-1px);
        }

        .stTextInput input,
        .stNumberInput input,
        .stDateInput input,
        .stTimeInput input,
        .stSelectbox [data-baseweb="select"],
        .stMultiSelect [data-baseweb="select"],
        textarea {
            border-radius: 16px !important;
            border: 1px solid var(--input-line) !important;
            background: var(--input-bg) !important;
            color: var(--text-main) !important;
            box-shadow: none !important;
        }

        .stTextInput input::placeholder,
        .stNumberInput input::placeholder,
        textarea::placeholder {
            color: var(--text-soft) !important;
        }

        .stTextInput [data-baseweb="base-input"],
        .stNumberInput [data-baseweb="base-input"],
        .stDateInput [data-baseweb="base-input"],
        .stTimeInput [data-baseweb="base-input"],
        .stSelectbox [data-baseweb="select"] > div,
        .stMultiSelect [data-baseweb="select"] > div {
            background: var(--input-bg) !important;
            color: var(--text-main) !important;
        }

        .stSelectbox svg,
        .stMultiSelect svg,
        .stDateInput svg,
        .stTimeInput svg {
            fill: var(--text-soft) !important;
        }

        [role="listbox"] {
            background: var(--bg-strong) !important;
            border: 1px solid var(--line-soft) !important;
        }

        [role="option"] {
            color: var(--text-main) !important;
        }

        [role="option"][aria-selected="true"] {
            background: rgba(255, 90, 54, 0.14) !important;
        }

        .stAlert {
            border-radius: 18px;
            border: 1px solid var(--line-soft);
            box-shadow: var(--shadow-soft);
        }

        .stSuccess,
        .stWarning,
        .stInfo,
        .stError {
            color: var(--text-main) !important;
        }

        [data-testid="stDataFrame"],
        [data-testid="stMetric"] {
            background: var(--bg-panel);
            border: 1px solid var(--line-soft);
            border-radius: 22px;
            box-shadow: var(--shadow-soft);
        }

        [data-testid="stDataFrame"] * {
            color: var(--text-main) !important;
        }

        .social-hero {
            position: relative;
            overflow: hidden;
            padding: 2rem;
            border-radius: 30px;
            background:
                radial-gradient(circle at top right, rgba(255, 255, 255, 0.22), transparent 25%),
                linear-gradient(135deg, #e52e3d 0%, #ff5a36 48%, #ff8a3d 100%);
            color: white;
            box-shadow: 0 28px 70px rgba(229, 46, 61, 0.24);
            margin-bottom: 1.25rem;
        }

        .social-hero::after {
            content: "";
            position: absolute;
            inset: auto -40px -50px auto;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
        }

        .social-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.45rem 0.8rem;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 1rem;
        }

        .social-hero h1,
        .social-hero h2 {
            margin: 0;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            line-height: 1;
        }

        .social-hero h1 {
            font-size: clamp(2.2rem, 4vw, 4rem);
            margin-bottom: 0.8rem;
        }

        .social-hero p {
            font-size: 1rem;
            max-width: 680px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 1rem;
        }

        .hero-pill-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
        }

        .hero-pill {
            padding: 0.55rem 0.9rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.16);
            font-size: 0.86rem;
            font-weight: 600;
        }

        .content-card {
            padding: 1.15rem 1.15rem 1rem;
            border-radius: 24px;
            background: var(--bg-panel);
            border: 1px solid var(--line-soft);
            box-shadow: var(--shadow-soft);
            backdrop-filter: blur(18px);
            margin-bottom: 1rem;
        }

        .content-card h3 {
            margin: 0 0 0.35rem;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.18rem;
        }

        .content-card p {
            margin: 0;
            color: var(--text-soft);
            font-size: 0.94rem;
        }

        .metric-card {
            padding: 1.1rem;
            border-radius: 22px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 244, 0.78) 100%);
            border: 1px solid rgba(123, 82, 65, 0.14);
            box-shadow: var(--shadow-soft);
            min-height: 148px;
        }

        .metric-card .metric-label {
            color: var(--text-soft);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.74rem;
            font-weight: 800;
            margin-bottom: 0.7rem;
        }

        .metric-card .metric-value {
            font-family: 'Space Grotesk', sans-serif;
            font-size: clamp(1.5rem, 2vw, 2.3rem);
            line-height: 1.05;
            margin-bottom: 0.45rem;
        }

        .metric-card .metric-caption {
            color: var(--text-soft);
            font-size: 0.9rem;
        }

        .section-eyebrow {
            color: var(--accent-tertiary);
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 0.75rem;
            margin-bottom: 0.35rem;
        }

        .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            margin-bottom: 0.2rem;
            color: var(--text-main) !important;
        }

        .section-copy {
            color: var(--text-soft);
            margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
            .social-hero {
                padding: 1.35rem;
                border-radius: 24px;
            }

            .stTabs [data-baseweb="tab-list"] {
                gap: 0.4rem;
            }

            .stTabs [data-baseweb="tab"] {
                min-width: 0;
                padding: 0 0.8rem;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_hero(title: str, copy: str, *, kicker: str, pills: list[str] | None = None) -> None:
    """Render a bold hero banner inspired by modern creator platforms."""
    pill_markup = ""
    if pills:
        pill_markup = '<div class="hero-pill-row">' + "".join(
            f'<span class="hero-pill">{html.escape(pill)}</span>' for pill in pills
        ) + "</div>"

    st.markdown(
        f"""
        <section class="social-hero">
            <div class="social-kicker">{html.escape(kicker)}</div>
            <h1>{html.escape(title)}</h1>
            <p>{html.escape(copy)}</p>
            {pill_markup}
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_section_header(eyebrow: str, title: str, copy: str) -> None:
    """Render a section heading block."""
    st.markdown(
        f"""
        <div class="section-eyebrow">{html.escape(eyebrow)}</div>
        <div class="section-title">{html.escape(title)}</div>
        <div class="section-copy">{html.escape(copy)}</div>
        """,
        unsafe_allow_html=True,
    )


def render_info_card(title: str, copy: str) -> None:
    """Render a glassy card for explanatory content."""
    st.markdown(
        f"""
        <section class="content-card">
            <h3>{html.escape(title)}</h3>
            <p>{html.escape(copy)}</p>
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_metric_card(label: str, value: str, caption: str) -> None:
    """Render a branded metric card."""
    st.markdown(
        f"""
        <section class="metric-card">
            <div class="metric-label">{html.escape(label)}</div>
            <div class="metric-value">{html.escape(value)}</div>
            <div class="metric-caption">{html.escape(caption)}</div>
        </section>
        """,
        unsafe_allow_html=True,
    )