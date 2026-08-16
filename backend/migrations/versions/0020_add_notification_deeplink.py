# backend/migrations/versions/0020_add_notification_deeplink.py


"""add ref_type/ref_id to Notifications for deep-linking

Lets a Notifications row point at a Ledger_Entries/Ledger_Repayments/
Ledger_Settlement_Requests row so the app can navigate straight to the
right screen when the person taps it — needed for entry_request,
repayment_request, and settlement_request notifications, which
previously only surfaced as a badge dot and a push (both of which can
be missed or fail silently) with no durable record in the bell inbox.

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'Notifications',
        sa.Column('ref_type', sa.String(20), nullable=True,
                   comment="What ref_id points at: 'entry', 'repayment', or 'settlement'. NULL for notifications with no deep-link target.")
    )
    op.add_column(
        'Notifications',
        sa.Column('ref_id', sa.Integer(), nullable=True,
                   comment='Ledger_Entries.entry_id / Ledger_Repayments.repayment_id / Ledger_Settlement_Requests.request_id depending on ref_type. No FK constraint since the target table varies.')
    )


def downgrade():
    op.drop_column('Notifications', 'ref_id')
    op.drop_column('Notifications', 'ref_type')