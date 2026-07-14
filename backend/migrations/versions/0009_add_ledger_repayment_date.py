# SplitEase/backend/migrations/versions/0009_add_ledger_repayment_date.py

"""add repayment_date to ledger repayments (needed for timeline/statement display)

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-14
"""
from alembic import op

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE Ledger_Repayments
        ADD COLUMN repayment_date DATE NULL
        COMMENT 'Date the repayment was applied — set on accept/apply, NULL while pending'
    """)
    op.execute("""
        CREATE INDEX idx_lr_status_date ON Ledger_Repayments (status, repayment_date)
    """)


def downgrade():
    op.execute("DROP INDEX idx_lr_status_date ON Ledger_Repayments")
    op.execute("ALTER TABLE Ledger_Repayments DROP COLUMN repayment_date")