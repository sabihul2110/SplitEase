# SplitEase/backend/migrations/versions/0005_fix_ledger_notif_enum.py


"""fix_ledger_notif_enum_add_entry_deleted

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-18
"""
from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded','entry_deleted')
        NOT NULL
    """)


def downgrade():
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded')
        NOT NULL
    """)