# SplitEase/backend/migrations/versions/0012_add_routines.py


"""add routines for daily-bundle quick entry

Revision ID: 0012
Revises: 0011
Create Date: 2026-07-17
"""
from alembic import op

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE Routines (
            routine_id  INT          NOT NULL AUTO_INCREMENT,
            user_id     INT          NOT NULL,
            name        VARCHAR(100) NOT NULL,
            icon_name   VARCHAR(50)  NOT NULL,
            active_days VARCHAR(20)  NOT NULL DEFAULT '1,2,3,4,5'
                COMMENT '1=Mon..7=Sun, comma-separated. UI hint only, routine is always manually triggered.',
            created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_routines PRIMARY KEY (routine_id),
            CONSTRAINT fk_routine_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            INDEX idx_routine_user (user_id)
        )
    """)
    op.execute("""
        CREATE TABLE Routine_Items (
            item_id          INT NOT NULL AUTO_INCREMENT,
            routine_id       INT NOT NULL,
            template_id      INT NOT NULL,
            sort_order       INT NOT NULL DEFAULT 0,
            default_included TINYINT(1) NOT NULL DEFAULT 1,
            CONSTRAINT pk_routine_items PRIMARY KEY (item_id),
            CONSTRAINT fk_ri_routine  FOREIGN KEY (routine_id)  REFERENCES Routines(routine_id)             ON DELETE CASCADE,
            CONSTRAINT fk_ri_template FOREIGN KEY (template_id) REFERENCES Quick_Templates(template_id)     ON DELETE CASCADE,
            CONSTRAINT uq_ri_routine_template UNIQUE (routine_id, template_id)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Routine_Items")
    op.execute("DROP TABLE IF EXISTS Routines")