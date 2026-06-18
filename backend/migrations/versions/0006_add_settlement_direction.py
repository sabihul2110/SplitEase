# SplitEase/backend/migrations/versions/0006_add_settlement_direction.py


"""add settlement direction to ledger entries

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-18
"""
from alembic import op

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE Ledger_Entries
        MODIFY COLUMN direction
        ENUM('lent', 'borrowed', 'settlement') NOT NULL
    """)


def downgrade():
    op.execute("""
        ALTER TABLE Ledger_Entries
        MODIFY COLUMN direction
        ENUM('lent', 'borrowed') NOT NULL
    """)