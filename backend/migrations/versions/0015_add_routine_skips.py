# SplitEase/backend/migrations/versions/0015_add_routine_skips.py

"""add routine skips for holiday/not-required marking

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-26
"""
from alembic import op

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE Routine_Skips (
            skip_id     INT NOT NULL AUTO_INCREMENT,
            routine_id  INT NOT NULL,
            skip_date   DATE NOT NULL
                COMMENT 'A date the routine was marked "not required" (e.g. holiday) — excluded from catch-up and reminders.',
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_routine_skips PRIMARY KEY (skip_id),
            CONSTRAINT fk_rskip_routine FOREIGN KEY (routine_id) REFERENCES Routines(routine_id) ON DELETE CASCADE,
            CONSTRAINT uq_rskip_routine_date UNIQUE (routine_id, skip_date)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Routine_Skips")