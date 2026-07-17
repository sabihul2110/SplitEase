# SplitEase/backend/migrations/versions/0013_add_bill_reminder_tracking.py


"""add reminder dedup tracking to pending bills

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-18
"""
from alembic import op

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE Pending_Bills
        ADD COLUMN last_reminded_date DATE NULL
            COMMENT 'Last calendar date a push reminder was sent for this pending bill. NULL = never reminded.'
            AFTER paid_at
    """)


def downgrade():
    op.execute("ALTER TABLE Pending_Bills DROP COLUMN last_reminded_date")