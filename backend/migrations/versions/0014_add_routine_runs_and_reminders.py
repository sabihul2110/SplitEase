# SplitEase/backend/migrations/versions/0014_add_routine_runs_and_reminders.py


"""add routine run log and reminder dedup tracking

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-18
"""
from alembic import op

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE Routines
        ADD COLUMN last_reminded_date DATE NULL
            COMMENT 'Last calendar date (IST) a "routine not run" push was sent. NULL = never.'
            AFTER active_days
    """)
    op.execute("""
        CREATE TABLE Routine_Runs (
            run_id     INT  NOT NULL AUTO_INCREMENT,
            routine_id INT  NOT NULL,
            user_id    INT  NOT NULL,
            run_date   DATE NOT NULL COMMENT 'Calendar date (IST) the routine was executed on.',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_routine_runs PRIMARY KEY (run_id),
            CONSTRAINT fk_rr_routine FOREIGN KEY (routine_id) REFERENCES Routines(routine_id) ON DELETE CASCADE,
            CONSTRAINT uq_rr_routine_date UNIQUE (routine_id, run_date),
            INDEX idx_rr_user_date (user_id, run_date)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Routine_Runs")
    op.execute("ALTER TABLE Routines DROP COLUMN last_reminded_date")