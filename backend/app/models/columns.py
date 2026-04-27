from sqlalchemy import DateTime, ForeignKey, Integer, text
from sqlalchemy.orm import Mapped, mapped_column


def required_fk_column(target: str) -> Mapped[int]:
    """Return a required indexed FK column with CASCADE delete."""
    return mapped_column(
        Integer,
        ForeignKey(target, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


def created_at_column() -> Mapped[DateTime]:
    """Return a timezone-aware created_at timestamp column."""
    return mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
    )
