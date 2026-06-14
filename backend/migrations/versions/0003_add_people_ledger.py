# SplitEase/backend/migrations/versions/0003_add_people_ledger.py


"""add_people_ledger

Revision ID: 0003
Revises: 2219c371a0af
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '2219c371a0af'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE People (
            person_id       INT           NOT NULL AUTO_INCREMENT,
            owner_user_id   INT           NOT NULL,
            display_name    VARCHAR(150)  NOT NULL,
            linked_user_id  INT               NULL,
            created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_people          PRIMARY KEY (person_id),
            CONSTRAINT uq_person_per_user UNIQUE      (owner_user_id, display_name),
            CONSTRAINT fk_people_owner    FOREIGN KEY (owner_user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
            CONSTRAINT fk_people_linked   FOREIGN KEY (linked_user_id) REFERENCES Users(user_id)  ON DELETE SET NULL,
            INDEX idx_people_owner (owner_user_id)
        )
    """)
    op.execute("""
        CREATE TABLE Ledger_Entries (
            entry_id         INT           NOT NULL AUTO_INCREMENT,
            person_id        INT           NOT NULL,
            created_by       INT           NOT NULL,
            direction        ENUM('lent','borrowed') NOT NULL,
            amount           DECIMAL(10,2) NOT NULL,
            remaining_amount DECIMAL(10,2) NOT NULL,
            note             VARCHAR(255)      NULL,
            entry_date       DATE          NOT NULL,
            status           ENUM('active','repaid') NOT NULL DEFAULT 'active',
            created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_ledger          PRIMARY KEY (entry_id),
            CONSTRAINT fk_ledger_person   FOREIGN KEY (person_id)   REFERENCES People(person_id)  ON DELETE CASCADE,
            CONSTRAINT fk_ledger_creator  FOREIGN KEY (created_by)  REFERENCES Users(user_id)     ON DELETE CASCADE,
            CONSTRAINT chk_ledger_amt     CHECK (amount > 0),
            CONSTRAINT chk_ledger_remain  CHECK (remaining_amount >= 0),
            INDEX idx_ledger_person (person_id, status)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Ledger_Entries")
    op.execute("DROP TABLE IF EXISTS People")