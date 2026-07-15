# SplitEase/backend/migrations/versions/0010_add_quickentry_recurring_bills.py

"""add quick-entry templates and recurring bills

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-15
"""
from alembic import op

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    # ── Step 1: expand existing categories ──────────────────
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name
        FROM Categories c
        JOIN (
            SELECT 'Metro' AS subcategory_name
            UNION ALL SELECT 'Auto / E-Rickshaw'
        ) s
        WHERE c.category_name = 'Travel'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name
        FROM Categories c
        JOIN (SELECT 'Flat' AS subcategory_name) s
        WHERE c.category_name = 'Accommodation'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name
        FROM Categories c
        JOIN (
            SELECT 'Canteen' AS subcategory_name
            UNION ALL SELECT 'Tiffin Service'
        ) s
        WHERE c.category_name = 'Food & Dining'
    """)

    # ── Step 2: new categories + subcategories ───────────────
    op.execute("""
        INSERT IGNORE INTO Categories (category_name) VALUES
            ('Shopping'), ('Entertainment'), ('Health & Medical'),
            ('Education'), ('Miscellaneous')
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name FROM Categories c
        JOIN (SELECT 'Clothing' AS subcategory_name UNION ALL SELECT 'Electronics' UNION ALL SELECT 'Personal Care') s
        WHERE c.category_name = 'Shopping'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name FROM Categories c
        JOIN (SELECT 'Movies' AS subcategory_name UNION ALL SELECT 'Subscriptions' UNION ALL SELECT 'Events') s
        WHERE c.category_name = 'Entertainment'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name FROM Categories c
        JOIN (SELECT 'Pharmacy' AS subcategory_name UNION ALL SELECT 'Doctor' UNION ALL SELECT 'Fitness') s
        WHERE c.category_name = 'Health & Medical'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name FROM Categories c
        JOIN (SELECT 'Books' AS subcategory_name UNION ALL SELECT 'Stationery' UNION ALL SELECT 'Fees') s
        WHERE c.category_name = 'Education'
    """)
    op.execute("""
        INSERT IGNORE INTO Subcategories (category_id, subcategory_name)
        SELECT c.category_id, s.subcategory_name FROM Categories c
        JOIN (SELECT 'Quick Entry' AS subcategory_name) s
        WHERE c.category_name = 'Miscellaneous'
    """)

    # ── Step 3: Quick_Templates ───────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS Quick_Templates (
            template_id    INT           NOT NULL AUTO_INCREMENT,
            user_id        INT           NOT NULL,
            name           VARCHAR(100)  NOT NULL,
            icon_name      VARCHAR(50)   NOT NULL,
            default_amount DECIMAL(10,2)     NULL,
            default_time   TIME          NOT NULL DEFAULT '09:00:00',
            group_id       INT               NULL,
            category_id    INT           NOT NULL,
            subcategory_id INT               NULL,
            created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_quick_templates PRIMARY KEY (template_id),
            CONSTRAINT fk_qt_user         FOREIGN KEY (user_id)        REFERENCES Users(user_id)                ON DELETE CASCADE,
            CONSTRAINT fk_qt_group        FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE SET NULL,
            CONSTRAINT fk_qt_category     FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
            CONSTRAINT fk_qt_subcategory  FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
            CONSTRAINT chk_qt_amount      CHECK (default_amount IS NULL OR default_amount > 0),
            INDEX idx_qt_user (user_id)
        )
    """)

    # ── Step 4: Recurring_Bills ────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS Recurring_Bills (
            bill_id        INT           NOT NULL AUTO_INCREMENT,
            user_id        INT           NOT NULL,
            name           VARCHAR(100)  NOT NULL,
            icon_name      VARCHAR(50)   NOT NULL,
            group_id       INT               NULL,
            category_id    INT           NOT NULL,
            subcategory_id INT               NULL,
            cron_day       TINYINT       NOT NULL,
            created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_recurring_bills PRIMARY KEY (bill_id),
            CONSTRAINT fk_rb_user         FOREIGN KEY (user_id)        REFERENCES Users(user_id)                ON DELETE CASCADE,
            CONSTRAINT fk_rb_group        FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE SET NULL,
            CONSTRAINT fk_rb_category     FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
            CONSTRAINT fk_rb_subcategory  FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
            CONSTRAINT chk_rb_cron_day    CHECK (cron_day BETWEEN 1 AND 31),
            INDEX idx_rb_user (user_id)
        )
    """)

    # ── Step 5: Pending_Bills ──────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS Pending_Bills (
            pending_id          INT         NOT NULL AUTO_INCREMENT,
            bill_id              INT        NOT NULL,
            user_id              INT        NOT NULL,
            status               ENUM('pending','paid','dismissed') NOT NULL DEFAULT 'pending',
            generated_for_month  DATE       NOT NULL,
            created_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_pending_bills PRIMARY KEY (pending_id),
            CONSTRAINT fk_pb_bill       FOREIGN KEY (bill_id) REFERENCES Recurring_Bills(bill_id) ON DELETE CASCADE,
            CONSTRAINT fk_pb_user       FOREIGN KEY (user_id) REFERENCES Users(user_id)           ON DELETE CASCADE,
            CONSTRAINT uq_pb_bill_month UNIQUE (bill_id, generated_for_month),
            INDEX idx_pb_user_status (user_id, status)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS Pending_Bills")
    op.execute("DROP TABLE IF EXISTS Recurring_Bills")
    op.execute("DROP TABLE IF EXISTS Quick_Templates")

    # Best-effort seed rollback — removes only the rows this migration added
    op.execute("""
        DELETE sc FROM Subcategories sc
        JOIN Categories c ON c.category_id = sc.category_id
        WHERE (c.category_name = 'Travel' AND sc.subcategory_name IN ('Metro', 'Auto / E-Rickshaw'))
           OR (c.category_name = 'Accommodation' AND sc.subcategory_name = 'Flat')
           OR (c.category_name = 'Food & Dining' AND sc.subcategory_name IN ('Canteen', 'Tiffin Service'))
    """)
    # Deleting these categories cascades and removes their subcategories too
    op.execute("""
        DELETE FROM Categories
        WHERE category_name IN ('Shopping', 'Entertainment', 'Health & Medical', 'Education', 'Miscellaneous')
    """)