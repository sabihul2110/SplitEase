# SplitEase/backend/migrations/versions/2219c371a0af_add_email_verification.py


"""add_email_verification

Revision ID: 2219c371a0af
Revises: 0002_perf_indexes
Create Date: 2026-06-11 20:17:39.820046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2219c371a0af'
down_revision: Union[str, Sequence[str], None] = '0002_perf_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
            id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id    INT          NOT NULL,
            token      VARCHAR(64)  NOT NULL,
            expires_at DATETIME     NOT NULL,
            used       TINYINT(1)   NOT NULL DEFAULT 0,
            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_evt_token (token),
            KEY        idx_evt_user (user_id),
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
    """)
    # ADD COLUMN IF NOT EXISTS requires MySQL 8.0.3+.
    # This checks the information_schema first so it's safe on any version.
    op.execute("""
        SET @col_exists = (
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'Users'
              AND COLUMN_NAME  = 'email_verified'
        );
    """)
    op.execute("""
        SET @sql = IF(
            @col_exists = 0,
            'ALTER TABLE Users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0',
            'SELECT 1'
        );
    """)
    op.execute("PREPARE stmt FROM @sql;")
    op.execute("EXECUTE stmt;")
    op.execute("DEALLOCATE PREPARE stmt;")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS EmailVerificationTokens")
    op.execute("ALTER TABLE Users DROP COLUMN IF EXISTS email_verified")
