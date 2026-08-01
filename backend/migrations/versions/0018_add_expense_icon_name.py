# backend/migrations/versions/0018_add_expense_icon_name.py

"""add icon_name to Expenses and Personal_Expenses

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0018'
down_revision = '0017'  # verify against `alembic heads` before running
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'Expenses',
        sa.Column('icon_name', sa.String(50), nullable=True,
                   comment='Manual icon override, keyed into templateIcons.js '
                           'TEMPLATE_ICON_MAP. NULL = fall back to live '
                           'category/subcategory/description-derived icon.')
    )
    op.add_column(
        'Personal_Expenses',
        sa.Column('icon_name', sa.String(50), nullable=True,
                   comment='Same as Expenses.icon_name.')
    )


def downgrade():
    op.drop_column('Personal_Expenses', 'icon_name')
    op.drop_column('Expenses', 'icon_name')