# SplitEase/backend/migrations/versions/0016_add_routine_item_modifiers.py


"""add modifier_schema to routine items

Revision ID: 0016
Revises: 0015
Create Date: 2026-07-29
"""
from alembic import op
import sqlalchemy as sa

revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'Routine_Items',
        sa.Column('modifier_schema', sa.JSON(), nullable=True,
                   comment='Array of execution-time modifier definitions (toggle/counter), applied at log time before the final amount is computed.')
    )


def downgrade():
    op.drop_column('Routine_Items', 'modifier_schema')