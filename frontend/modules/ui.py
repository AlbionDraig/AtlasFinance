from __future__ import annotations

import html

import streamlit as st


def inject_theme() -> None:
    """Inject a minimalist design system with clean dark/light mode support."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

        /* â”€â”€ Design tokens: light â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        :root {
            --c-bg:       #f4f5f7;
            --c-surface:  #ffffff;
            --c-surfaceL: rgba(255,255,255,0.6);
            --c-border:   rgba(0,0,0,0.07);
            --c-text:     #0f1115;
            --c-muted:    #6b7280;
            --c-accent:   #6366f1;
            --c-accent2:  #8b5cf6;
            --c-up:       #10b981;
            --c-down:     #f43f5e;
            --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
            --shadow-md:  0 2px 8px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.05);
            --r:          12px;
            --r-sm:       8px;
            --font:       'Inter', system-ui, sans-serif;
            --font-mono:  'JetBrains Mono', monospace;
        }

        /* â”€â”€ Base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        html, body, [class*="css"] {
            font-family: var(--font) !important;
            color-scheme: light !important;
        }

        .stApp {
            background: var(--c-bg) !important;
            color: var(--c-text) !important;
        }

        .block-container {
            padding-top: 1.5rem !important;
            padding-bottom: 3rem !important;
            max-width: 1320px !important;
        }

        /* â”€â”€ Global text colour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .stApp h1, .stApp h2, .stApp h3,
        .stApp h4, .stApp h5, .stApp h6,
        .stApp p, .stApp label,
        .stApp li, .stApp td, .stApp th {
            color: var(--c-text) !important;
        }

        /* Hide the entire Streamlit header strip. */
        [data-testid="stHeader"] {
            display: none !important;
            height: 0 !important;
        }

        /* Hide Streamlit default header actions (Deploy/theme/menu). */
        [data-testid="stToolbar"],
        [data-testid="stHeaderActionElements"],
        [data-testid="stAppToolbar"],
        [data-testid="stStatusWidget"],
        button[kind="headerNoPadding"],
        #MainMenu,
        [data-testid="stDecoration"] {
            display: none !important;
            visibility: hidden !important;
        }

        /* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #ffffff 0%, #fcfcff 100%) !important;
            border-right: 1px solid var(--c-border) !important;
            padding-top: 0.2rem !important;
        }

        /* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .stTabs [data-baseweb="tab-list"] {
            background: var(--c-surface) !important;
            border: none !important;
            border-radius: 999px !important;
            padding: 5px !important;
            gap: 6px !important;
            box-shadow: inset 0 0 0 1px var(--c-border) !important;
            width: fit-content !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: inline-flex !important;
            margin-bottom: 0.35rem !important;
        }

        .stTabs [data-baseweb="tab-list"]::-webkit-scrollbar {
            height: 0 !important;
        }

        .stTabs [data-baseweb="tab"] {
            border-radius: 999px !important;
            padding: 0 1.35rem !important;
            height: 40px !important;
            font-weight: 600 !important;
            font-size: 0.875rem !important;
            color: var(--c-muted) !important;
            background: transparent !important;
            border: none !important;
            transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease !important;
        }

        .stTabs [data-baseweb="tab"]:hover {
            background: rgba(99, 102, 241, 0.08) !important;
            color: var(--c-text) !important;
        }

        .stTabs [data-baseweb="tab"][aria-selected="true"] {
            background: linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent2) 100%) !important;
            color: #fff !important;
            box-shadow: 0 6px 14px rgba(99, 102, 241, 0.28) !important;
        }

        .stTabs [data-baseweb="tab"][aria-selected="true"] p,
        .stTabs [data-baseweb="tab"][aria-selected="true"] span,
        .stTabs [data-baseweb="tab"][aria-selected="true"] div {
            color: #fff !important;
        }

        /* Remove default Streamlit tab underline/highlight bar. */
        .stTabs [data-baseweb="tab-highlight"],
        .stTabs [data-baseweb="tab-border"],
        .stTabs [role="tablist"] + div {
            display: none !important;
        }

        /* â”€â”€ Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .stButton > button,
        .stFormSubmitButton > button {
            border-radius: var(--r-sm) !important;
            border: none !important;
            background: var(--c-accent) !important;
            color: #fff !important;
            font-weight: 600 !important;
            font-size: 0.875rem !important;
            padding: 0.55rem 1.1rem !important;
            line-height: 1.2 !important;
            text-align: center !important;
            transition: opacity 0.15s, transform 0.1s !important;
            box-shadow: 0 4px 14px rgba(99,102,241,0.28) !important;
        }

        .stButton > button p,
        .stFormSubmitButton > button p,
        .stButton > button span,
        .stFormSubmitButton > button span,
        .stButton > button div,
        .stFormSubmitButton > button div {
            color: #ffffff !important;
            margin: 0 !important;
            line-height: 1.2 !important;
            font-weight: 600 !important;
        }

        .stButton > button:hover,
        .stFormSubmitButton > button:hover {
            opacity: 0.86 !important;
            transform: translateY(-1px) !important;
        }

        /* â”€â”€ Inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .stTextInput input,
        .stNumberInput input,
        .stDateInput input,
        .stTimeInput input,
        textarea {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r-sm) !important;
            color: var(--c-text) !important;
            font-family: var(--font) !important;
            transition: border-color 0.15s, box-shadow 0.15s !important;
        }

        .stTextInput input:focus,
        .stNumberInput input:focus,
        textarea:focus {
            border-color: var(--c-accent) !important;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.18) !important;
            outline: none !important;
        }

        .stSelectbox [data-baseweb="select"] > div,
        .stMultiSelect [data-baseweb="select"] > div {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r-sm) !important;
            color: var(--c-text) !important;
        }

        [role="listbox"] {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
        }

        [role="option"] { color: var(--c-text) !important; }

        [role="option"]:hover,
        [role="option"][aria-selected="true"] {
            background: rgba(99,102,241,0.10) !important;
        }

        .stSelectbox svg,
        .stDateInput svg,
        .stTimeInput svg { fill: var(--c-muted) !important; }

        [data-testid="stWidgetLabel"],
        [data-testid="stWidgetLabel"] * {
            color: var(--c-text) !important;
            font-weight: 600 !important;
            font-size: 0.8125rem !important;
        }

        /* Hide Streamlit inline input helper hint (Press Enter to submit form). */
        [data-testid="InputInstructions"] {
            display: none !important;
        }

        /* â”€â”€ Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .stAlert {
            border-radius: var(--r) !important;
            border-width: 1px !important;
        }

        /* â”€â”€ DataFrames â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        [data-testid="stDataFrame"] {
            border-radius: var(--r) !important;
            border: 1px solid var(--c-border) !important;
            overflow: hidden !important;
            box-shadow: var(--shadow-sm) !important;
        }

        [data-testid="stDataFrame"] * {
            color: var(--c-text) !important;
            font-family: var(--font-mono) !important;
            font-size: 0.8rem !important;
        }

        /* â”€â”€ Custom components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

        /* Hero strip */
        .af-hero {
            border-radius: var(--r) !important;
            padding: 1.75rem 2rem !important;
            background: linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent2) 100%) !important;
            color: #fff !important;
            margin-bottom: 1.5rem !important;
        }

        .af-hero.compact {
            padding: 1.05rem 1.35rem !important;
            margin-bottom: 0.95rem !important;
        }

        .af-hero.compact.narrow {
            max-width: 920px !important;
        }

        .af-hero .kicker {
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.12em !important;
            text-transform: uppercase !important;
            opacity: 0.7 !important;
            margin-bottom: 0.4rem !important;
        }

        .af-hero.compact .kicker {
            margin-bottom: 0.2rem !important;
            font-size: 0.64rem !important;
        }

        .af-hero h1 {
            font-size: clamp(1.5rem, 2.8vw, 2.4rem) !important;
            font-weight: 700 !important;
            line-height: 1.1 !important;
            margin: 0 0 0.4rem !important;
            color: #fff !important;
        }

        .af-hero.compact h1 {
            font-size: clamp(1.3rem, 2.2vw, 1.9rem) !important;
            margin-bottom: 0.22rem !important;
        }

        .af-hero p {
            font-size: 0.875rem !important;
            opacity: 0.85 !important;
            margin: 0 !important;
            color: #fff !important;
        }

        .af-hero.compact p {
            font-size: 0.8rem !important;
        }

        /* Section heading */
        .af-section { margin: 2rem 0 0.75rem !important; }

        .af-section .eyebrow {
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.12em !important;
            text-transform: uppercase !important;
            color: var(--c-accent) !important;
            margin-bottom: 0.2rem !important;
        }

        .af-section h2 {
            font-size: 1.2rem !important;
            font-weight: 700 !important;
            margin: 0 0 0.1rem !important;
            color: var(--c-text) !important;
        }

        .af-section p {
            font-size: 0.83rem !important;
            color: var(--c-muted) !important;
            margin: 0 !important;
        }

        /* Surface card */
        .af-card {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r) !important;
            padding: 1rem 1.2rem !important;
            margin-bottom: 0.75rem !important;
            box-shadow: var(--shadow-sm) !important;
        }

        .af-card h3 {
            font-size: 0.875rem !important;
            font-weight: 700 !important;
            margin: 0 0 0.25rem !important;
            color: var(--c-text) !important;
        }

        .af-card p {
            font-size: 0.82rem !important;
            color: var(--c-muted) !important;
            margin: 0 !important;
        }

        /* Compact insight card for short KPI context blocks */
        .af-info-card {
            min-height: 132px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            margin-top: 0.35rem !important;
            border-left-width: 4px !important;
            border-left-style: solid !important;
            border-left-color: rgba(99,102,241,0.35) !important;
            gap: 0.35rem !important;
        }

        .af-info-card .info-label {
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            text-transform: uppercase !important;
            color: var(--c-muted) !important;
            margin-bottom: 0.5rem !important;
        }

        .af-info-card .info-value {
            font-family: var(--font-mono) !important;
            font-size: 1.08rem !important;
            font-weight: 500 !important;
            color: var(--c-text) !important;
            line-height: 1.3 !important;
            word-break: break-word !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        .af-info-card .info-sub {
            font-size: 0.78rem !important;
            color: var(--c-muted) !important;
            line-height: 1.25 !important;
            margin-top: auto !important;
        }

        .af-info-card.tone-balance {
            border-left-color: rgba(99,102,241,0.5) !important;
        }

        .af-info-card.tone-expense {
            border-left-color: rgba(245,158,11,0.55) !important;
        }

        .af-info-card.tone-impact {
            border-left-color: rgba(236,72,153,0.48) !important;
        }

        /* KPI metric card */
        .af-kpi {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r) !important;
            padding: 1.25rem 1.4rem !important;
            box-shadow: var(--shadow-sm) !important;
            margin-bottom: 0.55rem !important;
            min-height: 148px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
        }

        .af-kpi .kpi-label {
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            color: var(--c-muted) !important;
            margin-bottom: 0.6rem !important;
        }

        .af-kpi .kpi-value {
            font-family: var(--font-mono) !important;
            font-size: clamp(1.35rem, 2vw, 1.9rem) !important;
            font-weight: 500 !important;
            line-height: 1 !important;
            color: var(--c-text) !important;
            margin-bottom: 0.4rem !important;
        }

        .af-kpi .kpi-sub {
            font-size: 0.75rem !important;
            color: var(--c-muted) !important;
        }

        .af-kpi .kpi-badge {
            display: inline-block !important;
            font-size: 0.7rem !important;
            font-weight: 700 !important;
            padding: 2px 7px !important;
            border-radius: 999px !important;
        }

        .kpi-badge.up   { background: rgba(16,185,129,0.12) !important; color: #10b981 !important; }
        .kpi-badge.down { background: rgba(244,63,94,0.12)  !important; color: #f43f5e !important; }
        .kpi-badge.flat { background: rgba(107,114,128,0.12) !important; color: var(--c-muted) !important; }

        /* Transaction feed */
        .af-tx-row {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
            padding: 0.65rem 0 !important;
            border-bottom: 1px solid var(--c-border) !important;
        }

        .af-tx-row:last-child { border-bottom: none !important; }

        .af-tx-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 9px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 0.9rem !important;
            flex-shrink: 0 !important;
        }

        .af-tx-icon.expense { background: rgba(244,63,94,0.12) !important; }
        .af-tx-icon.income  { background: rgba(16,185,129,0.12) !important; }

        .af-tx-meta { flex: 1 !important; min-width: 0 !important; }

        .af-tx-meta .desc {
            font-size: 0.875rem !important;
            font-weight: 600 !important;
            color: var(--c-text) !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .af-tx-meta .sub {
            font-size: 0.75rem !important;
            color: var(--c-muted) !important;
        }

        .af-tx-amount {
            font-family: var(--font-mono) !important;
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            flex-shrink: 0 !important;
        }

        .af-tx-amount.expense { color: #f43f5e !important; }
        .af-tx-amount.income  { color: #10b981 !important; }

        /* Custom HTML table */
        .af-table-wrap {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r) !important;
            overflow: hidden !important;
            box-shadow: var(--shadow-sm) !important;
        }

        .af-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-family: var(--font) !important;
            font-size: 0.8125rem !important;
        }

        .af-table thead tr {
            border-bottom: 1px solid var(--c-border) !important;
        }

        .af-table thead th {
            padding: 0.65rem 0.85rem !important;
            text-align: left !important;
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            text-transform: uppercase !important;
            color: var(--c-muted) !important;
            white-space: nowrap !important;
        }

        .af-table tbody tr {
            border-bottom: 1px solid var(--c-border) !important;
            transition: background 0.1s !important;
        }

        .af-table tbody tr:last-child { border-bottom: none !important; }

        .af-table tbody tr:hover {
            background: rgba(99,102,241,0.05) !important;
        }

        .af-table td {
            padding: 0.6rem 0.85rem !important;
            color: var(--c-text) !important;
            vertical-align: middle !important;
        }

        .af-table td.mono {
            font-family: var(--font-mono) !important;
            font-size: 0.8rem !important;
        }

        .af-table .badge-expense {
            display: inline-block !important;
            padding: 2px 8px !important;
            border-radius: 999px !important;
            font-size: 0.7rem !important;
            font-weight: 700 !important;
            background: rgba(244,63,94,0.12) !important;
            color: #f43f5e !important;
        }

        .af-table .badge-income {
            display: inline-block !important;
            padding: 2px 8px !important;
            border-radius: 999px !important;
            font-size: 0.7rem !important;
            font-weight: 700 !important;
            background: rgba(16,185,129,0.12) !important;
            color: #10b981 !important;
        }

        .af-table .amount-expense { color: #f43f5e !important; font-family: var(--font-mono) !important; }
        .af-table .amount-income  { color: #10b981 !important; font-family: var(--font-mono) !important; }

        /* Auth side panel */
        .af-auth-side {
            background: var(--c-surface) !important;
            border: 1px solid var(--c-border) !important;
            border-radius: var(--r) !important;
            box-shadow: var(--shadow-sm) !important;
            padding: 1rem 1.05rem !important;
            margin-top: 0.2rem !important;
        }

        .af-auth-intro {
            margin: 0 0 0.95rem !important;
            padding: 0.72rem 0.82rem !important;
            background: rgba(99,102,241,0.05) !important;
            border: 1px solid rgba(99,102,241,0.17) !important;
            border-left: 4px solid rgba(99,102,241,0.35) !important;
            border-radius: 12px !important;
        }

        .af-auth-intro-tag {
            display: inline-block !important;
            margin: 0 0 0.32rem !important;
            padding: 0.13rem 0.5rem !important;
            border-radius: 999px !important;
            background: rgba(99,102,241,0.11) !important;
            color: #5b5de2 !important;
            font-size: 0.66rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            text-transform: uppercase !important;
        }

        .af-auth-card-title {
            display: block !important;
            margin: 0 0 0.35rem !important;
            font-size: 0.95rem !important;
            font-weight: 700 !important;
            color: var(--c-text) !important;
            line-height: 1.25 !important;
        }

        .af-auth-card-copy {
            margin: 0 !important;
            font-size: 0.82rem !important;
            line-height: 1.45 !important;
            color: var(--c-muted) !important;
        }

        @media (max-width: 900px) {
            .af-auth-side {
                padding: 1rem !important;
            }
        }

        .af-auth-side h3 {
            margin: 0 0 0.45rem !important;
            font-size: 0.95rem !important;
            font-weight: 700 !important;
            color: var(--c-text) !important;
        }

        .af-auth-side p {
            margin: 0 0 0.7rem !important;
            font-size: 0.82rem !important;
            color: var(--c-muted) !important;
            line-height: 1.45 !important;
        }

        .af-auth-note {
            font-size: 0.78rem !important;
            color: var(--c-text) !important;
            background: rgba(99,102,241,0.07) !important;
            border: 1px solid rgba(99,102,241,0.18) !important;
            border-radius: 8px !important;
            padding: 0.45rem 0.55rem !important;
            margin-top: 0.45rem !important;
        }

        .af-pw-strength {
            margin: 0.1rem 0 0.55rem !important;
        }

        .af-pw-strength-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-bottom: 0.32rem !important;
            font-size: 0.76rem !important;
            color: var(--c-muted) !important;
            font-weight: 600 !important;
        }

        .af-pw-strength-row .weak {
            color: #f43f5e !important;
        }

        .af-pw-strength-row .medium {
            color: #f59e0b !important;
        }

        .af-pw-strength-row .strong {
            color: #10b981 !important;
        }

        .af-pw-strength-row .neutral {
            color: var(--c-muted) !important;
        }

        .af-pw-strength-track {
            width: 100% !important;
            height: 8px !important;
            border-radius: 999px !important;
            background: rgba(107,114,128,0.18) !important;
            overflow: hidden !important;
        }

        .af-pw-strength-fill {
            height: 100% !important;
            border-radius: 999px !important;
            transition: width 0.18s ease !important;
        }

        .af-pw-strength-fill.weak {
            background: #f43f5e !important;
        }

        .af-pw-strength-fill.medium {
            background: #f59e0b !important;
        }

        .af-pw-strength-fill.strong {
            background: #10b981 !important;
        }

        .af-pw-strength-fill.neutral {
            background: #9ca3af !important;
        }

        .af-pw-checklist {
            list-style: none !important;
            margin: 0.35rem 0 0.55rem !important;
            padding: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.3rem 0.8rem !important;
        }

        .af-pw-checklist li {
            font-size: 0.76rem !important;
            line-height: 1.25 !important;
        }

        .af-pw-checklist li.ok {
            color: #10b981 !important;
            font-weight: 600 !important;
        }

        .af-pw-checklist li.pending {
            color: var(--c-muted) !important;
        }

        </style>
        """,
        unsafe_allow_html=True,
    )


def render_hero(
    title: str,
    copy: str,
    *,
    kicker: str,
    pills: list[str] | None = None,
    compact: bool = False,
    narrow: bool = False,
) -> None:
    """Render a compact gradient hero strip."""
    hero_classes = ["af-hero"]
    if compact:
        hero_classes.append("compact")
    if narrow:
        hero_classes.append("narrow")
    hero_class = " ".join(hero_classes)
    st.markdown(
        f"""
        <div class="{hero_class}">
            <div class="kicker">{html.escape(kicker)}</div>
            <h1>{html.escape(title)}</h1>
            <p>{html.escape(copy)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_section_header(eyebrow: str, title: str, copy: str) -> None:
    """Render a minimal section heading block."""
    st.markdown(
        f"""
        <div class="af-section">
            <div class="eyebrow">{html.escape(eyebrow)}</div>
            <h2>{html.escape(title)}</h2>
            <p>{html.escape(copy)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_info_card(title: str, value: str, *, sub: str = "", tone: str = "balance") -> None:
    """Render an insight card with value-first hierarchy and semantic accent."""
    tone_safe = html.escape(tone if tone in {"balance", "expense", "impact"} else "balance")
    sub_html = f'<div class="info-sub">{html.escape(sub)}</div>' if sub else ""
    st.markdown(
        f"""
        <div class="af-card af-info-card tone-{tone_safe}">
            <div class="info-label">{html.escape(title)}</div>
            <div class="info-value">{html.escape(value)}</div>
            {sub_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_kpi_card(label: str, value: str, sub: str, *, badge: str = "", badge_type: str = "flat") -> None:
    """Render a metric card with optional delta badge."""
    badge_html = (
        f'<span class="kpi-badge {html.escape(badge_type)}">{html.escape(badge)}</span>'
        if badge
        else ""
    )
    st.markdown(
        f"""
        <div class="af-kpi">
            <div class="kpi-label">{html.escape(label)}</div>
            <div class="kpi-value">{html.escape(value)}</div>
            <div class="kpi-sub">{html.escape(sub)}&nbsp;{badge_html}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_metric_card(label: str, value: str, caption: str) -> None:
    """Backwards-compatible alias for render_kpi_card."""
    render_kpi_card(label, value, caption)


def render_tx_feed(transactions: list[dict], *, limit: int = 10) -> None:
    """Render a styled activity feed of recent transactions inside a card."""
    rows_html = ""
    for tx in transactions[:limit]:
        tx_type = tx.get("transaction_type", "expense")
        icon = "&#8595;" if tx_type == "expense" else "&#8593;"
        sign = "&minus;" if tx_type == "expense" else "+"
        desc = html.escape(str(tx.get("description") or "Sin descripcion"))
        amount = tx.get("amount", 0)
        currency = html.escape(str(tx.get("currency", "")))
        date_raw = str(tx.get("occurred_at", ""))
        date_short = date_raw[:10] if len(date_raw) >= 10 else date_raw
        t = html.escape(tx_type)
        # Single-line HTML per row — avoids Streamlit markdown parser treating newlines as breaks
        rows_html += (f'<div class="af-tx-row">'
                      f'<div class="af-tx-icon {t}">{icon}</div>'
                      f'<div class="af-tx-meta"><div class="desc">{desc}</div><div class="sub">{date_short}</div></div>'
                      f'<div class="af-tx-amount {t}">{sign}{amount:,.2f} {currency}</div>'
                      f'</div>')
    st.markdown(
        f'<div class="af-card" style="padding:0.3rem 1.2rem;">{rows_html}</div>',
        unsafe_allow_html=True,
    )


def render_html_table(rows: list[dict], columns: list[str], *, col_labels: dict[str, str] | None = None, max_rows: int = 200) -> None:
    """Render a styled HTML table matching the design system."""
    labels = col_labels or {}
    header = "".join(f'<th>{html.escape(labels.get(c, c))}</th>' for c in columns)
    body = ""
    for row in rows[:max_rows]:
        cells = ""
        for col in columns:
            val = row.get(col, "")
            if col == "transaction_type":
                badge_cls = "badge-expense" if val == "expense" else "badge-income"
                label = "Gasto" if val == "expense" else "Ingreso"
                cells += f'<td><span class="{badge_cls}">{label}</span></td>'
            elif col == "amount":
                tx_type = row.get("transaction_type", "expense")
                amt_cls = "amount-expense" if tx_type == "expense" else "amount-income"
                sign = "&minus;" if tx_type == "expense" else "+"
                cells += f'<td class="{amt_cls}">{sign}{float(val):,.2f}</td>'
            elif col == "occurred_at":
                short = str(val)[:16] if len(str(val)) >= 16 else str(val)
                cells += f'<td class="mono">{html.escape(short)}</td>'
            else:
                cells += f'<td>{html.escape(str(val))}</td>'
        body += f'<tr>{cells}</tr>'
    st.markdown(
        f'<div class="af-table-wrap"><table class="af-table"><thead><tr>{header}</tr></thead><tbody>{body}</tbody></table></div>',
        unsafe_allow_html=True,
    )
