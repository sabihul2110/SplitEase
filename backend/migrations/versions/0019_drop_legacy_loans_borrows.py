# backend/migrations/versions/0019_drop_legacy_loans_borrows.py


"""drop legacy Loans/Borrows tables

Ledger_Entries + People has been the actual source of truth for reads
since migration 0003; Loans/Borrows were only kept as a best-effort
mirror matched by name+amount+date (no FK), which every write path had
to keep in sync by hand. That sync logic is removed from
loan_repository.py, borrow_repository.py, and people_repository.py in
this same change — nothing in the application reads these two tables
after that.

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-15
"""
from alembic import op

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS Loans")
    op.execute("DROP TABLE IF EXISTS Borrows")


def downgrade():
    op.execute("""
        CREATE TABLE Loans (
            loan_id          INT           NOT NULL AUTO_INCREMENT,
            lender_user_id   INT           NOT NULL,
            borrower_name    VARCHAR(150)  NOT NULL,
            amount           DECIMAL(10,2) NOT NULL,
            remaining_amount DECIMAL(10,2) NOT NULL,
            note             VARCHAR(255)      NULL,
            loan_date        DATE          NOT NULL,
            status           VARCHAR(10)   NOT NULL DEFAULT 'active',
            created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_loans        PRIMARY KEY (loan_id),
            CONSTRAINT fk_loans_lender FOREIGN KEY (lender_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            CONSTRAINT chk_loan_amount CHECK (amount > 0),
            CONSTRAINT chk_loan_remain CHECK (remaining_amount >= 0),
            CONSTRAINT chk_loan_status CHECK (status IN ('active', 'repaid')),
            INDEX idx_loans_lender (lender_user_id, status)
        )
    """)
    op.execute("""
        CREATE TABLE Borrows (
            borrow_id        INT           NOT NULL AUTO_INCREMENT,
            borrower_user_id INT           NOT NULL,
            lender_name      VARCHAR(150)  NOT NULL,
            amount           DECIMAL(10,2) NOT NULL,
            remaining_amount DECIMAL(10,2) NOT NULL,
            note             VARCHAR(255)      NULL,
            borrow_date      DATE          NOT NULL,
            status           VARCHAR(10)   NOT NULL DEFAULT 'active',
            created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_borrows        PRIMARY KEY (borrow_id),
            CONSTRAINT fk_borrows_user   FOREIGN KEY (borrower_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            CONSTRAINT chk_borrow_amount CHECK (amount > 0),
            CONSTRAINT chk_borrow_remain CHECK (remaining_amount >= 0),
            CONSTRAINT chk_borrow_status CHECK (status IN ('active', 'repaid')),
            INDEX idx_borrows_user (borrower_user_id, status)
        )
    """)
    # Downgrade recreates empty tables only — no data is reconstructed,
    # since Ledger_Entries was already the complete source of truth
    # before this migration ran.