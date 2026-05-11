"""add pocket link to savings goals

Revision ID: e6b7f9a2c114
Revises: d4a8f2e1c901
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e6b7f9a2c114"
down_revision: Union[str, None] = "e7c3f2b1d5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("savings_goals", sa.Column("pocket_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_savings_goals_pocket_id"), "savings_goals", ["pocket_id"], unique=False)

    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("savings_goals") as batch_op:
            batch_op.create_foreign_key(
                "fk_savings_goals_pocket_id_pockets",
                "pockets",
                ["pocket_id"],
                ["id"],
                ondelete="SET NULL",
            )
    else:
        op.create_foreign_key(
            "fk_savings_goals_pocket_id_pockets",
            "savings_goals",
            "pockets",
            ["pocket_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("savings_goals") as batch_op:
            batch_op.drop_constraint("fk_savings_goals_pocket_id_pockets", type_="foreignkey")
    else:
        op.drop_constraint("fk_savings_goals_pocket_id_pockets", "savings_goals", type_="foreignkey")
    op.drop_index(op.f("ix_savings_goals_pocket_id"), table_name="savings_goals")
    op.drop_column("savings_goals", "pocket_id")
