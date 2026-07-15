-- SplitEase/sql/schema.sql


-- ============================================================
--  SplitEase - Complete Group & Personal Expense Manager 
--
--  Tables
--    1.  Users
--    2.  Groups
--    3.  Group_Members
--    4.  Categories
--    5.  Subcategories
--    6.  Expenses
--    7.  Expense_Splits
--    8.  Payments
--    9.  Invites
--    10. Notifications
--    11. Personal_Expenses
--    12. Income
--    13. Loans
--    14. Borrows
--    15. Payment_Allocations
--    16. PasswordResetTokens
--    17. People
--    18. Ledger_Entries
--    19. EmailVerificationTokens
--    20. Ledger_Notifications
--    21. Ledger_Repayments
--    22. Ledger_Settlement_Requests
--    23. Quick_Templates
--    24. Recurring_Bills
--    25. Pending_Bills
--
--  Stored Procedures
--    SP1. Calculate_Settlements
--
--  Seed Data
--    Categories, Subcategories
-- ============================================================

DROP DATABASE IF EXISTS splitease_db;
CREATE DATABASE splitease_db;
USE splitease_db;


-- ─────────────────────────────────────────────
--  1. USERS
-- ─────────────────────────────────────────────
CREATE TABLE Users (
    user_id        INT                  NOT NULL AUTO_INCREMENT,
    name           VARCHAR(100)         NOT NULL,
    email          VARCHAR(150)         NOT NULL,
    password_hash  VARCHAR(255)             NULL,
    upi_id         VARCHAR(100)             NULL,
    role           ENUM('user','admin') NOT NULL DEFAULT 'user',
    token_version  INT                  NOT NULL DEFAULT 0
        COMMENT 'Incremented on every password change to invalidate old JWTs',
    email_verified TINYINT(1)           NOT NULL DEFAULT 0,
    expo_push_token VARCHAR(200)            NULL
        COMMENT 'SYNC-FIX (migration 0004): Expo push token for mobile notifications',
    created_at     TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_email UNIQUE      (email)
);


-- ─────────────────────────────────────────────
--  2. GROUPS
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
--  3. GROUP_MEMBERS
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
--  4. CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE Categories (
    category_id   INT          NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_categories    PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name UNIQUE      (category_name)
);


-- ─────────────────────────────────────────────
--  5. SUBCATEGORIES
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
--  6. EXPENSES
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
--  7. EXPENSE_SPLITS
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
    CONSTRAINT fk_split_user     FOREIGN KEY (user_id)    REFERENCES Users(user_id)        ON DELETE CASCADE,
    CONSTRAINT chk_split_owed    CHECK (amount_owed >= 0),
    CONSTRAINT chk_split_pct     CHECK (share_pct IS NULL OR (share_pct >= 0 AND share_pct <= 100))
);


-- ─────────────────────────────────────────────
--  8. PAYMENTS
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
--  9. INVITES
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
--  10. NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE Notifications (
    notification_id INT          NOT NULL AUTO_INCREMENT,
    user_id         INT          NOT NULL,
    from_user_id    INT              NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'reminder',
    message         VARCHAR(500) NOT NULL,
    group_id        INT              NULL,
    is_read         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_notifications   PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_user      FOREIGN KEY (user_id)      REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT fk_notif_from_user FOREIGN KEY (from_user_id) REFERENCES Users(user_id)     ON DELETE SET NULL,
    CONSTRAINT fk_notif_group     FOREIGN KEY (group_id)     REFERENCES `Groups`(group_id) ON DELETE SET NULL,
    INDEX idx_notif_user_read (user_id, is_read)
);


-- ─────────────────────────────────────────────
--  11. PERSONAL_EXPENSES
--
--  NOTE (flagged, not changed): this table stores BOTH a free-text
--  `category` column AND a normalised `subcategory_id` FK. The two
--  can drift out of sync (e.g. category='Food' while subcategory_id
--  points at 'Movies'). Left as-is here since I don't know which
--  code paths depend on the free-text column — see chat reply.
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
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_personal_expenses PRIMARY KEY (expense_id),
    CONSTRAINT fk_pe_user           FOREIGN KEY (user_id)        REFERENCES Users(user_id)          ON DELETE CASCADE,
    CONSTRAINT fk_pe_subcategory    FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_pe_amount        CHECK (amount > 0),
    INDEX idx_pe_user_date (user_id, expense_date DESC)
);


-- ─────────────────────────────────────────────
--  12. INCOME
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
--  13. LOANS
--  NOTE (flagged, not changed): overlaps conceptually with
--  People + Ledger_Entries (added in migration 0003). Confirm
--  whether Loans/Borrows are still the active tables for the
--  mobile Loans screens, or legacy — see chat reply.
-- ─────────────────────────────────────────────
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
);


-- ─────────────────────────────────────────────
--  14. BORROWS
-- ─────────────────────────────────────────────
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
);


-- ─────────────────────────────────────────────
--  15. PAYMENT_ALLOCATIONS
-- ─────────────────────────────────────────────
CREATE TABLE Payment_Allocations (
    allocation_id  INT           NOT NULL AUTO_INCREMENT,
    payment_id     INT           NOT NULL,
    expense_id     INT           NOT NULL,
    allocated_amt  DECIMAL(10,2) NOT NULL,
    CONSTRAINT pk_alloc         PRIMARY KEY (allocation_id),
    CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id)  REFERENCES Payments(payment_id)  ON DELETE CASCADE,
    CONSTRAINT fk_alloc_expense FOREIGN KEY (expense_id)  REFERENCES Expenses(expense_id)  ON DELETE CASCADE,
    CONSTRAINT uq_alloc         UNIQUE (payment_id, expense_id),
    CONSTRAINT chk_alloc_amt    CHECK (allocated_amt > 0)
);


-- ─────────────────────────────────────────────
-- 16. PASSWORD RESET TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    token_id   INT PRIMARY KEY AUTO_INCREMENT,
    user_id    INT NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used       TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);


-- ─────────────────────────────────────────────
--  17. PEOPLE
-- ─────────────────────────────────────────────
CREATE TABLE People (
    person_id       INT           NOT NULL AUTO_INCREMENT,
    owner_user_id   INT           NOT NULL,
    display_name    VARCHAR(150)  NOT NULL,
    linked_user_id  INT               NULL
        COMMENT 'FK to Users for registered user linking — NULL for custom persons (Phase 1)',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_people          PRIMARY KEY (person_id),
    CONSTRAINT uq_person_per_user UNIQUE      (owner_user_id, display_name),
    CONSTRAINT fk_people_owner    FOREIGN KEY (owner_user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    CONSTRAINT fk_people_linked   FOREIGN KEY (linked_user_id) REFERENCES Users(user_id)  ON DELETE SET NULL,
    INDEX idx_people_owner (owner_user_id)
);


-- ─────────────────────────────────────────────
--  18. LEDGER_ENTRIES
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Entries (
    entry_id         INT           NOT NULL AUTO_INCREMENT,
    person_id        INT           NOT NULL,
    created_by       INT           NOT NULL,
    direction        ENUM('lent','borrowed','settlement') NOT NULL
        COMMENT 'SYNC-FIX (migration 0006): added ''settlement''',
    amount           DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    note             VARCHAR(255)      NULL,
    entry_date       DATE          NOT NULL,
    status           ENUM('pending','active','repaid','rejected') NOT NULL DEFAULT 'active'
        COMMENT 'SYNC-FIX (migration 0004): added ''pending'',''rejected''',
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ledger          PRIMARY KEY (entry_id),
    CONSTRAINT fk_ledger_person   FOREIGN KEY (person_id)  REFERENCES People(person_id)  ON DELETE CASCADE,
    CONSTRAINT fk_ledger_creator  FOREIGN KEY (created_by) REFERENCES Users(user_id)     ON DELETE CASCADE,
    CONSTRAINT chk_ledger_amt     CHECK (amount > 0),
    CONSTRAINT chk_ledger_remain  CHECK (remaining_amount >= 0),
    INDEX idx_ledger_person (person_id, status)
);


-- ─────────────────────────────────────────────
-- 19. EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────
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
);


-- ─────────────────────────────────────────────
--  20. LEDGER_NOTIFICATIONS  (SYNC-FIX: migration 0004 — was
--  missing from schema.sql entirely)
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Notifications (
    notif_id      INT           NOT NULL AUTO_INCREMENT,
    entry_id      INT               NULL,
    recipient_id  INT           NOT NULL,
    sender_id     INT           NOT NULL,
    type          ENUM('entry_request','entry_accepted','entry_rejected','repayment_recorded',
                        'entry_deleted','repayment_request','repayment_confirmed','repayment_declined',
                        'settlement_request','settlement_confirmed','settlement_declined') NOT NULL,
    message       VARCHAR(500)  NOT NULL,
    is_read       TINYINT(1)    NOT NULL DEFAULT 0,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notif_id),
    CONSTRAINT fk_ln_entry     FOREIGN KEY (entry_id)     REFERENCES Ledger_Entries(entry_id) ON DELETE SET NULL,
    CONSTRAINT fk_ln_recipient FOREIGN KEY (recipient_id) REFERENCES Users(user_id)           ON DELETE CASCADE,
    CONSTRAINT fk_ln_sender    FOREIGN KEY (sender_id)    REFERENCES Users(user_id)           ON DELETE CASCADE,
    INDEX idx_ln_recipient (recipient_id, is_read)
);


-- ─────────────────────────────────────────────
--  21. LEDGER_REPAYMENTS  (SYNC-FIX: migrations 0007 + 0009 —
--  was missing from schema.sql entirely; repayment_date is
--  folded in here rather than as a later ALTER)
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
    resolved_at    TIMESTAMP     NULL,
    CONSTRAINT pk_ledger_repayments PRIMARY KEY (repayment_id),
    CONSTRAINT fk_lr_entry    FOREIGN KEY (entry_id)    REFERENCES Ledger_Entries(entry_id) ON DELETE CASCADE,
    CONSTRAINT fk_lr_proposer FOREIGN KEY (proposed_by) REFERENCES Users(user_id)           ON DELETE CASCADE,
    CONSTRAINT chk_lr_amount  CHECK (amount > 0),
    INDEX idx_lr_entry (entry_id, status),
    INDEX idx_lr_status_date (status, repayment_date)
);


-- ─────────────────────────────────────────────
--  22. LEDGER_SETTLEMENT_REQUESTS  (SYNC-FIX: migration 0008 —
--  was missing from schema.sql entirely)
-- ─────────────────────────────────────────────
CREATE TABLE Ledger_Settlement_Requests (
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
);


-- ─────────────────────────────────────────────
--  23. QUICK_TEMPLATES  (Phase 1, today)
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
--  24. RECURRING_BILLS  (Phase 1, today)
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
--  25. PENDING_BILLS  (Phase 1, today)
-- ─────────────────────────────────────────────
CREATE TABLE Pending_Bills (
    pending_id          INT         NOT NULL AUTO_INCREMENT,
    bill_id             INT         NOT NULL,
    user_id             INT         NOT NULL,
    status              ENUM('pending','paid','dismissed') NOT NULL DEFAULT 'pending',
    generated_for_month DATE        NOT NULL
        COMMENT 'Stored as the 1st of the target month, e.g. 2026-08-01',
    created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_pending_bills PRIMARY KEY (pending_id),
    CONSTRAINT fk_pb_bill       FOREIGN KEY (bill_id) REFERENCES Recurring_Bills(bill_id) ON DELETE CASCADE,
    CONSTRAINT fk_pb_user       FOREIGN KEY (user_id) REFERENCES Users(user_id)           ON DELETE CASCADE,
    CONSTRAINT uq_pb_bill_month UNIQUE (bill_id, generated_for_month),
    INDEX idx_pb_user_status (user_id, status)
);


-- ─────────────────────────────────────────────
--  SP1. STORED PROCEDURE: Calculate_Settlements
-- ─────────────────────────────────────────────
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


-- ─────────────────────────────────────────────
--  SEED DATA — Categories
-- ─────────────────────────────────────────────
INSERT INTO Categories (category_name) VALUES
    ('Travel'),
    ('Accommodation'),
    ('Food & Dining'),
    ('Activities'),
    ('Utilities'),
    ('Groceries'),
    ('Shopping'),
    ('Entertainment'),
    ('Health & Medical'),
    ('Education'),
    ('Miscellaneous');


-- ─────────────────────────────────────────────
--  SEED DATA — Subcategories
-- ─────────────────────────────────────────────
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