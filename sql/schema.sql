-- SplitEase/sql/schema.sql

-- ============================================================
--  SplitEase — Complete Group & Personal Expense Manager
--
--  ⚠️  SCHEMA COVERAGE: this file reflects migrations
--      0001_baseline.py  →  0020_add_notification_deeplink.py
--      (i.e. matches `alembic_version` = 0020 / `alembic current`
--      showing 0020 (head)).
--
--      UPDATE THIS COMMENT every time a new migration lands.
--      If in doubt, check backend/migrations/versions/ for the
--      actual highest-numbered file, or run `alembic history`
--      against a fully-migrated DB and compare.
--
--  Tables
--    1.  Users
--    2.  Categories
--    3.  Subcategories
--    4.  Groups
--    5.  Group_Members
--    6.  People
--    7.  PasswordResetTokens
--    8.  EmailVerificationTokens
--    9.  Expenses
--    10. Expense_Splits
--    11. Payments
--    12. Payment_Allocations
--    13. Invites
--    14. Notifications
--    15. Personal_Expenses
--    16. Income
--    17. Ledger_Entries
--    18. Ledger_Notifications
--    19. Ledger_Repayments
--    20. Ledger_Settlement_Requests
--    21. Quick_Templates
--    22. Recurring_Bills
--    23. Pending_Bills
--    24. Routines
--    25. Routine_Items
--    26. Routine_Runs
--    27. Routine_Skips
--
--  Stored Procedures
--    SP1. Calculate_Settlements
--
--  Seed Data
--    Categories, Subcategories
--
--  NOTE: Loans/Borrows (legacy standalone lending tables) were
--  dropped in migration 0019 — People + Ledger_Entries has been
--  the single source of truth for lending/borrowing since
--  migration 0003; see 0019's docstring for the full rationale.
-- ============================================================

DROP DATABASE IF EXISTS splitease_db;
CREATE DATABASE splitease_db;
USE splitease_db;


-- ─────────────────────────────────────────────
--  1. USERS
-- ─────────────────────────────────────────────
CREATE TABLE Users (
    user_id         INT                  NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)         NOT NULL,
    email           VARCHAR(150)         NOT NULL,
    password_hash   VARCHAR(255)             NULL,
    upi_id          VARCHAR(100)             NULL,
    role            ENUM('user','admin') NOT NULL DEFAULT 'user',
    token_version   INT                  NOT NULL DEFAULT 0
        COMMENT 'Incremented on every password change to invalidate old JWTs',
    email_verified  TINYINT(1)           NOT NULL DEFAULT 0,
    expo_push_token VARCHAR(200)             NULL
        COMMENT 'Expo push token for mobile notifications',
    created_at      TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_email UNIQUE      (email)
);


-- ─────────────────────────────────────────────
--  2. CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE Categories (
    category_id   INT          NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_categories    PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name UNIQUE      (category_name)
);


-- ─────────────────────────────────────────────
--  3. SUBCATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE Subcategories (
    subcategory_id   INT          NOT NULL AUTO_INCREMENT,
    category_id      INT          NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_subcategories       PRIMARY KEY (subcategory_id),
    CONSTRAINT uq_subcat_per_category UNIQUE      (category_id, subcategory_name),
    CONSTRAINT fk_subcat_category     FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE
);


-- ─────────────────────────────────────────────
--  4. GROUPS
-- ─────────────────────────────────────────────
CREATE TABLE `Groups` (
    group_id   INT          NOT NULL AUTO_INCREMENT,
    group_name VARCHAR(150) NOT NULL,
    created_by INT              NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_groups      PRIMARY KEY (group_id),
    CONSTRAINT fk_grp_creator FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL
);


-- ─────────────────────────────────────────────
--  5. GROUP_MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE Group_Members (
    group_id  INT       NOT NULL,
    user_id   INT       NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_group_members PRIMARY KEY (group_id, user_id),
    CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES `Groups`(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_user  FOREIGN KEY (user_id)  REFERENCES Users(user_id)     ON DELETE CASCADE
);


-- ─────────────────────────────────────────────
--  6. PEOPLE
-- ─────────────────────────────────────────────
CREATE TABLE People (
    person_id      INT          NOT NULL AUTO_INCREMENT,
    owner_user_id  INT          NOT NULL,
    display_name   VARCHAR(150) NOT NULL,
    linked_user_id INT              NULL
        COMMENT 'FK to Users for registered user linking — NULL for custom persons',
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_people          PRIMARY KEY (person_id),
    CONSTRAINT uq_person_per_user UNIQUE      (owner_user_id, display_name),
    CONSTRAINT fk_people_owner    FOREIGN KEY (owner_user_id)  REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_people_linked   FOREIGN KEY (linked_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_people_owner (owner_user_id)
);


-- ─────────────────────────────────────────────
--  7. PASSWORD RESET TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE PasswordResetTokens (
    token_id   INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,
    token      VARCHAR(64) NOT NULL,
    expires_at DATETIME    NOT NULL,
    used       TINYINT(1)  NOT NULL DEFAULT 0,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_password_reset_tokens PRIMARY KEY (token_id),
    CONSTRAINT uq_prt_token UNIQUE (token),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);


-- ─────────────────────────────────────────────
--  8. EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE EmailVerificationTokens (
    id         INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,
    token      VARCHAR(64) NOT NULL,
    expires_at DATETIME    NOT NULL,
    used       TINYINT(1)  NOT NULL DEFAULT 0,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_email_verification_tokens PRIMARY KEY (id),
    CONSTRAINT uq_evt_token UNIQUE (token),
    CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_evt_user (user_id)
);


-- ─────────────────────────────────────────────
--  9. EXPENSES
-- ─────────────────────────────────────────────
CREATE TABLE Expenses (
    expense_id     INT           NOT NULL AUTO_INCREMENT,
    group_id       INT           NOT NULL,
    payer_id       INT           NOT NULL,
    category_id    INT           NOT NULL,
    subcategory_id INT               NULL,
    total_amount   DECIMAL(10,2) NOT NULL,
    description    VARCHAR(255)  NOT NULL,
    split_type     VARCHAR(10)   NOT NULL DEFAULT 'equal',
    expense_date   DATE          NOT NULL,
    expense_time   TIME              NULL,
    icon_name      VARCHAR(50)       NULL
        COMMENT 'Manual icon override, keyed into templateIcons.js TEMPLATE_ICON_MAP. NULL = fall back to live category/subcategory/description-derived icon.',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_expenses        PRIMARY KEY (expense_id),
    CONSTRAINT fk_exp_group       FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE CASCADE,
    CONSTRAINT fk_exp_payer       FOREIGN KEY (payer_id)       REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_exp_category    FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_exp_subcategory FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_exp_amount     CHECK (total_amount > 0),
    CONSTRAINT chk_split_type     CHECK (split_type IN ('equal', 'custom'))
);


-- ─────────────────────────────────────────────
--  10. EXPENSE_SPLITS
-- ─────────────────────────────────────────────
CREATE TABLE Expense_Splits (
    split_id    INT           NOT NULL AUTO_INCREMENT,
    expense_id  INT           NOT NULL,
    user_id     INT           NOT NULL,
    amount_owed DECIMAL(10,2) NOT NULL,
    share_pct   DECIMAL(5,2)      NULL
        COMMENT 'Populated for custom splits; NULL for equal splits',
    CONSTRAINT pk_splits         PRIMARY KEY (split_id),
    CONSTRAINT uq_split_per_user UNIQUE      (expense_id, user_id),
    CONSTRAINT fk_split_expense  FOREIGN KEY (expense_id) REFERENCES Expenses(expense_id) ON DELETE CASCADE,
    CONSTRAINT fk_split_user     FOREIGN KEY (user_id)    REFERENCES Users(user_id)       ON DELETE CASCADE,
    CONSTRAINT chk_split_owed    CHECK (amount_owed >= 0),
    CONSTRAINT chk_split_pct     CHECK (share_pct IS NULL OR (share_pct >= 0 AND share_pct <= 100))
);


-- ─────────────────────────────────────────────
--  11. PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE Payments (
    payment_id   INT           NOT NULL AUTO_INCREMENT,
    group_id     INT           NOT NULL,
    payer_id     INT           NOT NULL,
    payee_id     INT           NOT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    note         VARCHAR(255)      NULL,
    payment_date DATE          NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_payments    PRIMARY KEY (payment_id),
    CONSTRAINT fk_pay_group   FOREIGN KEY (group_id) REFERENCES `Groups`(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_payer   FOREIGN KEY (payer_id) REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT fk_pay_payee   FOREIGN KEY (payee_id) REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT chk_pay_amount CHECK (amount > 0),
    CONSTRAINT chk_pay_self   CHECK (payer_id <> payee_id)
);


-- ─────────────────────────────────────────────
--  12. PAYMENT_ALLOCATIONS
-- ─────────────────────────────────────────────
CREATE TABLE Payment_Allocations (
    allocation_id INT           NOT NULL AUTO_INCREMENT,
    payment_id    INT           NOT NULL,
    expense_id    INT           NOT NULL,
    allocated_amt DECIMAL(10,2) NOT NULL,
    CONSTRAINT pk_alloc         PRIMARY KEY (allocation_id),
    CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id) REFERENCES Payments(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_expense FOREIGN KEY (expense_id) REFERENCES Expenses(expense_id) ON DELETE CASCADE,
    CONSTRAINT uq_alloc         UNIQUE (payment_id, expense_id),
    CONSTRAINT chk_alloc_amt    CHECK (allocated_amt > 0)
);


-- ─────────────────────────────────────────────
--  13. INVITES
-- ─────────────────────────────────────────────
CREATE TABLE Invites (
    invite_id  INT         NOT NULL AUTO_INCREMENT,
    token      VARCHAR(64) NOT NULL,
    group_id   INT         NOT NULL,
    created_by INT         NOT NULL,
    expires_at TIMESTAMP       NULL
        COMMENT 'NULL = never expires. Default is now 72h (set in INVITE_EXPIRY_HOURS env var)',
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_invites      PRIMARY KEY (invite_id),
    CONSTRAINT uq_invite_token UNIQUE      (token),
    CONSTRAINT fk_inv_group    FOREIGN KEY (group_id)   REFERENCES `Groups`(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_creator  FOREIGN KEY (created_by) REFERENCES Users(user_id)     ON DELETE RESTRICT
);


-- ─────────────────────────────────────────────
--  14. NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE Notifications (
    notification_id INT          NOT NULL AUTO_INCREMENT,
    user_id         INT          NOT NULL,
    from_user_id    INT              NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'reminder',
    message         VARCHAR(500) NOT NULL,
    group_id        INT              NULL,
    ref_type        VARCHAR(20)      NULL                                  -- 0020
        COMMENT "What ref_id points at: 'entry', 'repayment', or 'settlement'. NULL for notifications with no deep-link target.",
    ref_id          INT              NULL                                  -- 0020
        COMMENT 'Ledger_Entries.entry_id / Ledger_Repayments.repayment_id / Ledger_Settlement_Requests.request_id depending on ref_type. No FK constraint since the target table varies.',
    is_read         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_notifications   PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_user      FOREIGN KEY (user_id)      REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT fk_notif_from_user FOREIGN KEY (from_user_id) REFERENCES Users(user_id)     ON DELETE SET NULL,
    CONSTRAINT fk_notif_group     FOREIGN KEY (group_id)     REFERENCES `Groups`(group_id) ON DELETE SET NULL,
    INDEX idx_notif_user_read (user_id, is_read)
);


-- ─────────────────────────────────────────────
--  15. PERSONAL_EXPENSES
--
--  NOTE (flagged, unresolved): stores BOTH a free-text `category`
--  column AND a normalised `subcategory_id` FK — the two can
--  drift out of sync. No migration through 0020 touches this.
-- ─────────────────────────────────────────────
CREATE TABLE Personal_Expenses (
    expense_id     INT           NOT NULL AUTO_INCREMENT,
    user_id        INT           NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    category       VARCHAR(100)  NOT NULL DEFAULT 'General',
    subcategory_id INT               NULL
        COMMENT 'FK to Subcategories; populated by AI receipt scanner',
    merchant_name  VARCHAR(255)      NULL
        COMMENT 'Extracted by AI receipt scanner',
    note           VARCHAR(255)      NULL,
    expense_date   DATE          NOT NULL,
    expense_time   TIME              NULL,
    icon_name      VARCHAR(50)       NULL
        COMMENT 'Same as Expenses.icon_name.',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_personal_expenses PRIMARY KEY (expense_id),
    CONSTRAINT fk_pe_user           FOREIGN KEY (user_id)        REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_pe_subcategory    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_pe_amount        CHECK (amount > 0),
    INDEX idx_pe_user_date (user_id, expense_date DESC)
);


-- ─────────────────────────────────────────────
--  16. INCOME
-- ─────────────────────────────────────────────
CREATE TABLE Income (
    income_id   INT           NOT NULL AUTO_INCREMENT,
    user_id     INT           NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    source_type VARCHAR(50)   NOT NULL DEFAULT 'other',
    note        VARCHAR(255)      NULL,
    income_date DATE          NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_income      PRIMARY KEY (income_id),
    CONSTRAINT fk_income_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_income_amt CHECK (amount > 0),
    CONSTRAINT chk_income_src CHECK (source_type IN ('salary', 'pocket_money', 'stipend', 'other')),
    INDEX idx_income_user_date (user_id, income_date DESC)
);


-- ─────────────────────────────────────────────
--  17. LEDGER_ENTRIES
--  Single source of truth for lending/borrowing between two
--  people, whether or not the counterparty is a registered user.
--  Replaces the legacy Loans/Borrows tables (dropped in 0019).
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Entries (
    entry_id         INT           NOT NULL AUTO_INCREMENT,
    person_id        INT           NOT NULL,
    created_by       INT           NOT NULL,
    direction        ENUM('lent','borrowed','settlement') NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    note             VARCHAR(255)      NULL,
    entry_date       DATE          NOT NULL,
    status           ENUM('pending','active','repaid','rejected') NOT NULL DEFAULT 'active',
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ledger          PRIMARY KEY (entry_id),
    CONSTRAINT fk_ledger_person   FOREIGN KEY (person_id)  REFERENCES People(person_id) ON DELETE CASCADE,
    CONSTRAINT fk_ledger_creator  FOREIGN KEY (created_by) REFERENCES Users(user_id)    ON DELETE CASCADE,
    CONSTRAINT chk_ledger_amt     CHECK (amount > 0),
    CONSTRAINT chk_ledger_remain  CHECK (remaining_amount >= 0),
    INDEX idx_ledger_person (person_id, status)
);


-- ─────────────────────────────────────────────
--  18. LEDGER_NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Notifications (
    notif_id     INT           NOT NULL AUTO_INCREMENT,
    entry_id     INT               NULL,
    recipient_id INT           NOT NULL,
    sender_id    INT           NOT NULL,
    type         ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded',
                       'entry_deleted','repayment_request','repayment_confirmed','repayment_declined',
                       'settlement_request','settlement_confirmed','settlement_declined') NOT NULL,
    message      VARCHAR(500)  NOT NULL,
    is_read      TINYINT(1)    NOT NULL DEFAULT 0,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ledger_notifications PRIMARY KEY (notif_id),
    CONSTRAINT fk_ln_entry     FOREIGN KEY (entry_id)     REFERENCES Ledger_Entries(entry_id) ON DELETE SET NULL,
    CONSTRAINT fk_ln_recipient FOREIGN KEY (recipient_id) REFERENCES Users(user_id)           ON DELETE CASCADE,
    CONSTRAINT fk_ln_sender    FOREIGN KEY (sender_id)    REFERENCES Users(user_id)           ON DELETE CASCADE,
    INDEX idx_ln_recipient (recipient_id, is_read)
);


-- ─────────────────────────────────────────────
--  19. LEDGER_REPAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Repayments (
    repayment_id   INT           NOT NULL AUTO_INCREMENT,
    entry_id       INT           NOT NULL,
    proposed_by    INT           NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    status         ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    note           VARCHAR(255)  NULL,
    repayment_date DATE              NULL
        COMMENT 'Date the repayment was applied — set on accept/apply, NULL while pending',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at    TIMESTAMP         NULL,
    CONSTRAINT pk_ledger_repayments PRIMARY KEY (repayment_id),
    CONSTRAINT fk_lr_entry    FOREIGN KEY (entry_id)    REFERENCES Ledger_Entries(entry_id) ON DELETE CASCADE,
    CONSTRAINT fk_lr_proposer FOREIGN KEY (proposed_by) REFERENCES Users(user_id)           ON DELETE CASCADE,
    CONSTRAINT chk_lr_amount  CHECK (amount > 0),
    INDEX idx_lr_entry (entry_id, status),
    INDEX idx_lr_status_date (status, repayment_date)
);


-- ─────────────────────────────────────────────
--  20. LEDGER_SETTLEMENT_REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Settlement_Requests (
    request_id  INT           NOT NULL AUTO_INCREMENT,
    person_id   INT           NOT NULL
        COMMENT 'The proposer''s People row for the other party',
    proposed_by INT           NOT NULL,
    net_amount  DECIMAL(10,2) NOT NULL,
    status      ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP         NULL,
    CONSTRAINT pk_ledger_settlement_requests PRIMARY KEY (request_id),
    CONSTRAINT fk_lsr_person   FOREIGN KEY (person_id)   REFERENCES People(person_id) ON DELETE CASCADE,
    CONSTRAINT fk_lsr_proposer FOREIGN KEY (proposed_by) REFERENCES Users(user_id)    ON DELETE CASCADE,
    INDEX idx_lsr_person (person_id, status)
);


-- ─────────────────────────────────────────────
--  21. QUICK_TEMPLATES
-- ─────────────────────────────────────────────
CREATE TABLE Quick_Templates (
    template_id    INT           NOT NULL AUTO_INCREMENT,
    user_id        INT           NOT NULL,
    name           VARCHAR(100)  NOT NULL,
    icon_name      VARCHAR(50)   NOT NULL,
    default_amount DECIMAL(10,2)     NULL,
    default_time   TIME          NOT NULL DEFAULT '09:00:00',
    group_id       INT               NULL,
    category_id    INT           NOT NULL,
    subcategory_id INT               NULL,
    split_type     ENUM('equal','custom') NOT NULL DEFAULT 'equal',
    split_config   JSON              NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_quick_templates PRIMARY KEY (template_id),
    CONSTRAINT fk_qt_user         FOREIGN KEY (user_id)        REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_qt_group        FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE SET NULL,
    CONSTRAINT fk_qt_category     FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_qt_subcategory  FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_qt_amount      CHECK (default_amount IS NULL OR default_amount > 0),
    INDEX idx_qt_user (user_id)
);


-- ─────────────────────────────────────────────
--  22. RECURRING_BILLS
-- ─────────────────────────────────────────────
CREATE TABLE Recurring_Bills (
    bill_id        INT           NOT NULL AUTO_INCREMENT,
    user_id        INT           NOT NULL,
    name           VARCHAR(100)  NOT NULL,
    icon_name      VARCHAR(50)   NOT NULL,
    group_id       INT               NULL,
    category_id    INT           NOT NULL,
    subcategory_id INT               NULL,
    cron_day       TINYINT       NOT NULL
        COMMENT 'Day of month (1-31); app must clamp for short months',
    split_type     ENUM('equal','custom') NOT NULL DEFAULT 'equal',
    split_config   JSON              NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_recurring_bills PRIMARY KEY (bill_id),
    CONSTRAINT fk_rb_user         FOREIGN KEY (user_id)        REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_rb_group        FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE SET NULL,
    CONSTRAINT fk_rb_category     FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_rb_subcategory  FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_rb_cron_day    CHECK (cron_day BETWEEN 1 AND 31),
    INDEX idx_rb_user (user_id)
);


-- ─────────────────────────────────────────────
--  23. PENDING_BILLS
-- ─────────────────────────────────────────────
CREATE TABLE Pending_Bills (
    pending_id                    INT         NOT NULL AUTO_INCREMENT,
    bill_id                       INT         NOT NULL,
    user_id                       INT         NOT NULL,
    status                        ENUM('pending','paid','dismissed') NOT NULL DEFAULT 'pending',
    generated_for_month           DATE        NOT NULL
        COMMENT 'Stored as the 1st of the target month, e.g. 2026-08-01',
    resulting_expense_id          INT             NULL,
    resulting_personal_expense_id INT             NULL,
    paid_at                       TIMESTAMP       NULL,
    last_reminded_date            DATE            NULL
        COMMENT 'Last calendar date a push reminder was sent for this pending bill. NULL = never reminded.',
    created_at                    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_pending_bills PRIMARY KEY (pending_id),
    CONSTRAINT fk_pb_bill       FOREIGN KEY (bill_id)  REFERENCES Recurring_Bills(bill_id)      ON DELETE CASCADE,
    CONSTRAINT fk_pb_user       FOREIGN KEY (user_id)  REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_pb_resulting_expense          FOREIGN KEY (resulting_expense_id)          REFERENCES Expenses(expense_id)          ON DELETE SET NULL,
    CONSTRAINT fk_pb_resulting_personal_expense FOREIGN KEY (resulting_personal_expense_id) REFERENCES Personal_Expenses(expense_id) ON DELETE SET NULL,
    CONSTRAINT uq_pb_bill_month UNIQUE (bill_id, generated_for_month),
    INDEX idx_pb_user_status (user_id, status)
);


-- ─────────────────────────────────────────────
--  24. ROUTINES
-- ─────────────────────────────────────────────
CREATE TABLE Routines (
    routine_id          INT          NOT NULL AUTO_INCREMENT,
    user_id             INT          NOT NULL,
    name                VARCHAR(100) NOT NULL,
    icon_name           VARCHAR(50)  NOT NULL,
    active_days         VARCHAR(20)  NOT NULL DEFAULT '1,2,3,4,5'
        COMMENT '1=Mon..7=Sun, comma-separated. UI hint only, routine is always manually triggered.',
    last_reminded_date  DATE             NULL
        COMMENT 'Last calendar date (IST) a "routine not run" push was sent. NULL = never.',
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_routines     PRIMARY KEY (routine_id),
    CONSTRAINT fk_routine_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_routine_user (user_id)
);


-- ─────────────────────────────────────────────
--  25. ROUTINE_ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE Routine_Items (
    item_id           INT        NOT NULL AUTO_INCREMENT,
    routine_id        INT        NOT NULL,
    template_id       INT        NOT NULL,
    sort_order        INT        NOT NULL DEFAULT 0,
    default_included  TINYINT(1) NOT NULL DEFAULT 1,
    modifier_schema   JSON           NULL
        COMMENT 'Array of execution-time modifier definitions (toggle/counter), applied at log time before the final amount is computed.',
    visible_days      JSON           NULL
        COMMENT 'Array of 1-7 (Mon-Sun). NULL/empty = item always shown.',
    CONSTRAINT pk_routine_items PRIMARY KEY (item_id),
    CONSTRAINT fk_ri_routine  FOREIGN KEY (routine_id)  REFERENCES Routines(routine_id)         ON DELETE CASCADE,
    CONSTRAINT fk_ri_template FOREIGN KEY (template_id) REFERENCES Quick_Templates(template_id) ON DELETE CASCADE,
    CONSTRAINT uq_ri_routine_template UNIQUE (routine_id, template_id)
);


-- ─────────────────────────────────────────────
--  26. ROUTINE_RUNS
-- ─────────────────────────────────────────────
CREATE TABLE Routine_Runs (
    run_id     INT  NOT NULL AUTO_INCREMENT,
    routine_id INT  NOT NULL,
    user_id    INT  NOT NULL,
    run_date   DATE NOT NULL
        COMMENT 'Calendar date (IST) the routine was executed on.',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_routine_runs PRIMARY KEY (run_id),
    CONSTRAINT fk_rr_routine FOREIGN KEY (routine_id) REFERENCES Routines(routine_id) ON DELETE CASCADE,
    CONSTRAINT uq_rr_routine_date UNIQUE (routine_id, run_date),
    INDEX idx_rr_user_date (user_id, run_date)
);


-- ─────────────────────────────────────────────
--  27. ROUTINE_SKIPS
-- ─────────────────────────────────────────────
CREATE TABLE Routine_Skips (
    skip_id    INT  NOT NULL AUTO_INCREMENT,
    routine_id INT  NOT NULL,
    skip_date  DATE NOT NULL
        COMMENT 'A date the routine was marked "not required" (e.g. holiday) — excluded from catch-up and reminders.',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_routine_skips PRIMARY KEY (skip_id),
    CONSTRAINT fk_rskip_routine FOREIGN KEY (routine_id) REFERENCES Routines(routine_id) ON DELETE CASCADE,
    CONSTRAINT uq_rskip_routine_date UNIQUE (routine_id, skip_date)
);


-- ============================================================
--  ADDITIONAL PERFORMANCE INDEXES (from migration 0002)
-- ============================================================
CREATE INDEX idx_expenses_group_id   ON Expenses(group_id);
CREATE INDEX idx_expenses_payer_id   ON Expenses(payer_id);
CREATE INDEX idx_expenses_group_date ON Expenses(group_id, expense_date DESC);
CREATE INDEX idx_splits_expense_id   ON Expense_Splits(expense_id);
CREATE INDEX idx_splits_user_id      ON Expense_Splits(user_id);
CREATE INDEX idx_payments_group_id   ON Payments(group_id);
CREATE INDEX idx_payments_payer_id   ON Payments(payer_id);
CREATE INDEX idx_payments_payee_id   ON Payments(payee_id);
CREATE INDEX idx_group_members_user  ON Group_Members(user_id);
CREATE INDEX idx_reset_tokens_hash   ON PasswordResetTokens(token);
CREATE INDEX idx_personal_exp_user   ON Personal_Expenses(user_id, expense_date DESC);
CREATE INDEX idx_notifications_full  ON Notifications(user_id, is_read, created_at DESC);


-- ============================================================
--  STORED PROCEDURE — Calculate_Settlements
-- ============================================================
DELIMITER $$

CREATE PROCEDURE Calculate_Settlements(IN input_group_id INT)
BEGIN
    SELECT
        u.user_id                                  AS user_id,
        u.name                                     AS user_name,
        u.upi_id                                   AS upi_id,
        IFNULL(paid.total_paid,        0.00)       AS total_paid,
        IFNULL(owed.total_owed,        0.00)       AS total_owed,
        IFNULL(psent.payments_sent,    0.00)       AS payments_sent,
        IFNULL(prec.payments_received, 0.00)       AS payments_received,
        (
              IFNULL(paid.total_paid,        0.00)
            - IFNULL(owed.total_owed,        0.00)
            + IFNULL(psent.payments_sent,    0.00)
            - IFNULL(prec.payments_received, 0.00)
        )                                          AS net_balance
    FROM Group_Members gm
    JOIN Users u ON u.user_id = gm.user_id
    LEFT JOIN (SELECT payer_id, SUM(total_amount) AS total_paid FROM Expenses WHERE group_id = input_group_id GROUP BY payer_id) paid ON paid.payer_id = u.user_id
    LEFT JOIN (SELECT es.user_id, SUM(es.amount_owed) AS total_owed FROM Expense_Splits es JOIN Expenses e ON e.expense_id = es.expense_id WHERE e.group_id = input_group_id GROUP BY es.user_id) owed ON owed.user_id = u.user_id
    LEFT JOIN (SELECT payer_id, SUM(amount) AS payments_sent FROM Payments WHERE group_id = input_group_id GROUP BY payer_id) psent ON psent.payer_id = u.user_id
    LEFT JOIN (SELECT payee_id, SUM(amount) AS payments_received FROM Payments WHERE group_id = input_group_id GROUP BY payee_id) prec ON prec.payee_id = u.user_id
    WHERE  gm.group_id = input_group_id
    ORDER  BY net_balance DESC;
END$$

DELIMITER ;


-- ============================================================
--  SEED DATA — Categories & Subcategories
-- ============================================================
INSERT INTO Categories (category_name) VALUES
    ('Travel'), ('Accommodation'), ('Food & Dining'), ('Activities'),
    ('Utilities'), ('Groceries'), ('Shopping'), ('Entertainment'),
    ('Health & Medical'), ('Education'), ('Miscellaneous');

INSERT INTO Subcategories (category_id, subcategory_name) VALUES
    (1, 'Train'), (1, 'Flight'), (1, 'Cab / Taxi'), (1, 'Bus'), (1, 'Metro'), (1, 'Auto / E-Rickshaw'),
    (2, 'Hotel'), (2, 'Hostel'), (2, 'Airbnb'), (2, 'Flat'),
    (3, 'Restaurant'), (3, 'Street Food'), (3, 'Cafe'), (3, 'Canteen'), (3, 'Tiffin Service'),
    (4, 'Water Sports'), (4, 'Sightseeing'), (4, 'Adventure'),
    (5, 'Electricity'), (5, 'Internet'), (5, 'Water'), (5, 'Rent'),
    (7, 'Clothing'), (7, 'Electronics'), (7, 'Personal Care'),
    (8, 'Movies'), (8, 'Subscriptions'), (8, 'Events'),
    (9, 'Pharmacy'), (9, 'Doctor'), (9, 'Fitness'),
    (10, 'Books'), (10, 'Stationery'), (10, 'Fees'),
    (11, 'Quick Entry');