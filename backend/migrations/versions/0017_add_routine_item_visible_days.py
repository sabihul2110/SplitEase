# SplitEase/backend/migrations/versions/0017_add_routine_item_visible_days.py


"""add visible_days to routine items for conditional legs

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'Routine_Items',
        sa.Column('visible_days', sa.JSON(), nullable=True,
                   comment='Array of 1-7 (Mon-Sun). NULL/empty = item always shown. '
                           'Lets a routine include legs that only exist on certain days '
                           '(e.g. an optional Friday prayer round-trip) without affecting '
                           'sort_order of the surrounding items.')
    )


def downgrade():
    op.drop_column('Routine_Items', 'visible_days')