# SplitEase/backend/migrations/versions/0011_add_split_configs_and_time.py


"""add split configs and time

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── True per-entry time — real chronological ordering & analytics ──
    op.add_column('Personal_Expenses', sa.Column('expense_time', sa.Time(), nullable=True))
    op.add_column('Expenses',          sa.Column('expense_time', sa.Time(), nullable=True))

    # ── Quick_Templates: custom split support ──
    op.add_column(
        'Quick_Templates',
        sa.Column('split_type', sa.Enum('equal', 'custom', name='qt_split_type'),
                   nullable=False, server_default='equal'),
    )
    op.add_column('Quick_Templates', sa.Column('split_config', sa.JSON(), nullable=True))

    # ── Recurring_Bills: custom split support ──
    op.add_column(
        'Recurring_Bills',
        sa.Column('split_type', sa.Enum('equal', 'custom', name='rb_split_type'),
                   nullable=False, server_default='equal'),
    )
    op.add_column('Recurring_Bills', sa.Column('split_config', sa.JSON(), nullable=True))

    # ── Pending_Bills: traceability to the committed entry + paid_at ──
    op.add_column('Pending_Bills', sa.Column('resulting_expense_id', sa.Integer(), nullable=True))
    op.add_column('Pending_Bills', sa.Column('resulting_personal_expense_id', sa.Integer(), nullable=True))
    op.add_column('Pending_Bills', sa.Column('paid_at', sa.TIMESTAMP(), nullable=True))

    op.create_foreign_key(
        'fk_pb_resulting_expense', 'Pending_Bills', 'Expenses',
        ['resulting_expense_id'], ['expense_id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_pb_resulting_personal_expense', 'Pending_Bills', 'Personal_Expenses',
        ['resulting_personal_expense_id'], ['expense_id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_pb_resulting_personal_expense', 'Pending_Bills', type_='foreignkey')
    op.drop_constraint('fk_pb_resulting_expense', 'Pending_Bills', type_='foreignkey')
    op.drop_column('Pending_Bills', 'paid_at')
    op.drop_column('Pending_Bills', 'resulting_personal_expense_id')
    op.drop_column('Pending_Bills', 'resulting_expense_id')

    op.drop_column('Recurring_Bills', 'split_config')
    op.drop_column('Recurring_Bills', 'split_type')

    op.drop_column('Quick_Templates', 'split_config')
    op.drop_column('Quick_Templates', 'split_type')

    op.drop_column('Expenses', 'expense_time')
    op.drop_column('Personal_Expenses', 'expense_time')