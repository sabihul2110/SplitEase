# SplitEase/backend/migrations/versions/0004_phase3_people_linking.py


"""
Revision ID: 0004
Revises: 0003
Create Date: 2026-06-14
"""
from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    # Push token on Users — safe check via information_schema
    op.execute("""
        SET @col_exists = (
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'Users'
              AND COLUMN_NAME  = 'expo_push_token'
        )
    """)
    op.execute("""
        SET @sql = IF(
            @col_exists = 0,
            'ALTER TABLE Users ADD COLUMN expo_push_token VARCHAR(200) NULL',
            'SELECT 1'
        )
    """)
    op.execute("PREPARE stmt FROM @sql")
    op.execute("EXECUTE stmt")
    op.execute("DEALLOCATE PREPARE stmt")

    # Extend Ledger_Entries status enum
    op.execute("""
        ALTER TABLE Ledger_Entries
        MODIFY COLUMN status
        ENUM('pending','active','repaid','rejected') NOT NULL DEFAULT 'active'
    """)

    # Ledger notifications table
    op.execute("""
        CREATE TABLE IF NOT EXISTS Ledger_Notifications (
            notif_id      INT           NOT NULL AUTO_INCREMENT,
            entry_id      INT               NULL,
            recipient_id  INT           NOT NULL,
            sender_id     INT           NOT NULL,
            type          ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded','entry_deleted') NOT NULL,
            message       VARCHAR(500)  NOT NULL,
            is_read       TINYINT(1)    NOT NULL DEFAULT 0,
            created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (notif_id),
            CONSTRAINT fk_ln_entry     FOREIGN KEY (entry_id)     REFERENCES Ledger_Entries(entry_id) ON DELETE SET NULL,
            CONSTRAINT fk_ln_recipient FOREIGN KEY (recipient_id) REFERENCES Users(user_id)           ON DELETE CASCADE,
            CONSTRAINT fk_ln_sender    FOREIGN KEY (sender_id)    REFERENCES Users(user_id)           ON DELETE CASCADE,
            INDEX idx_ln_recipient (recipient_id, is_read)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Ledger_Notifications")
    op.execute("""
        ALTER TABLE Ledger_Entries
        MODIFY COLUMN status
        ENUM('active','repaid','rejected') NOT NULL DEFAULT 'active'
    """)
    op.execute("""
        SET @col_exists = (
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'Users'
              AND COLUMN_NAME  = 'expo_push_token'
        )
    """)
    op.execute("""
        SET @sql = IF(
            @col_exists = 1,
            'ALTER TABLE Users DROP COLUMN expo_push_token',
            'SELECT 1'
        )
    """)
    op.execute("PREPARE stmt FROM @sql")
    op.execute("EXECUTE stmt")
    op.execute("DEALLOCATE PREPARE stmt")