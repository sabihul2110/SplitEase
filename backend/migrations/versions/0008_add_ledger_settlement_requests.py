# SplitEase/backend/migrations/versions/0008_add_ledger_settlement_requests.py

"""add ledger settlement requests (debtor-proposed settle-up needing creditor ack)

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-14
"""
from alembic import op

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS Ledger_Settlement_Requests (
            request_id  INT           NOT NULL AUTO_INCREMENT,
            person_id   INT           NOT NULL
                COMMENT 'The proposer''s People row for the other party',
            proposed_by INT           NOT NULL,
            net_amount  DECIMAL(10,2) NOT NULL,
            status      ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
            created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP     NULL,
            CONSTRAINT pk_ledger_settlement_requests PRIMARY KEY (request_id),
            CONSTRAINT fk_lsr_person   FOREIGN KEY (person_id)   REFERENCES People(person_id) ON DELETE CASCADE,
            CONSTRAINT fk_lsr_proposer FOREIGN KEY (proposed_by) REFERENCES Users(user_id)    ON DELETE CASCADE,
            INDEX idx_lsr_person (person_id, status)
        )
    """)
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded',
             'entry_deleted','repayment_request','repayment_confirmed','repayment_declined',
             'settlement_request','settlement_confirmed','settlement_declined')
        NOT NULL
    """)


def downgrade():
    op.execute("""
        ALTER TABLE Ledger_Notifications
        MODIFY COLUMN type
        ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded',
             'entry_deleted','repayment_request','repayment_confirmed','repayment_declined')
        NOT NULL
    """)
    op.execute("DROP TABLE IF EXISTS Ledger_Settlement_Requests")