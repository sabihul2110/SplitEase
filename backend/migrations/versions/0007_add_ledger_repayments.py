# SplitEase/backend/migrations/versions/0007_add_ledger_repayments.py

"""add ledger repayments (debtor-proposed repayments needing creditor ack)

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-14
"""
from alembic import op

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS Ledger_Repayments (
            repayment_id INT           NOT NULL AUTO_INCREMENT,
            entry_id     INT           NOT NULL,
            proposed_by  INT           NOT NULL,
            amount       DECIMAL(10,2) NOT NULL,
            status       ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
            note         VARCHAR(255)  NULL,
            created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at  TIMESTAMP     NULL,
            CONSTRAINT pk_ledger_repayments PRIMARY KEY (repayment_id),
            CONSTRAINT fk_lr_entry    FOREIGN KEY (entry_id)    REFERENCES Ledger_Entries(entry_id) ON DELETE CASCADE,
            CONSTRAINT fk_lr_proposer FOREIGN KEY (proposed_by) REFERENCES Users(user_id)           ON DELETE CASCADE,
            CONSTRAINT chk_lr_amount  CHECK (amount > 0),
            INDEX idx_lr_entry (entry_id, status)
        )
    """)
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded',
             'entry_deleted','repayment_request','repayment_confirmed','repayment_declined')
        NOT NULL
    """)


def downgrade():
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded','entry_deleted')
        NOT NULL
    """)
    op.execute("DROP TABLE IF EXISTS Ledger_Repayments")