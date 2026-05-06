"""add user role

Revision ID: d4a8f2e1c901
Revises: a3f5cac7b3b6
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4a8f2e1c901"
down_revision: Union[str, None] = "a3f5cac7b3b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum("admin", "user", name="userrole")


def upgrade() -> None:
    user_role_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column("role", user_role_enum, nullable=False, server_default="user"),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
    user_role_enum.drop(op.get_bind(), checkfirst=True)
