# Re-export UI component primitives for convenient access.
# Usage: from modules.components import btn, text_field, section_header, ...
from modules.components import (  # noqa: F401
    # ── Style injection ──────────────────────────────────────────────
    inject_component_styles,
    # ── Interactive controls ──────────────────────────────────────
    btn,
    text_field,
    textarea_field,
    number_field,
    date_field,
    time_field,
    select_field,
    multiselect_field,
    # ── Layout helpers ────────────────────────────────────────────
    section_header,
    form_section,
    divider,
    # ── Data display ─────────────────────────────────────────────
    stat_card,
    kpi_card,
    info_card,
    badge,
    info_box,
    empty_state,
    # ── Notifications ────────────────────────────────────────────
    show_success,
    show_error,
    show_warning,
    show_info,
)
