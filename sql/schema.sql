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
    user_id       INT                  NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100)         NOT NULL,
    email         VARCHAR(150)         NOT NULL,
    password_hash VARCHAR(255)             NULL,
    upi_id        VARCHAR(100)             NULL,
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    token_version INT                  NOT NULL DEFAULT 0
        COMMENT 'Incremented on every password change to invalidate old JWTs',
    created_at    TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
--  FIX #19: Added subcategory_id and merchant_name which were present
--  in the live DB (via ALTER TABLE) but missing from this schema file.
--  subcategory_id links to the normalised Subcategories table.
--  merchant_name is populated by the AI receipt scanner.
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
--  SP1. STORED PROCEDURE: Calculate_Settlements
--
--  FIX #9: Now returns user_id and upi_id alongside user_name so
--  the frontend can match by ID and build UPI links without
--  a secondary name-based lookup.
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
    ('Groceries');


-- ─────────────────────────────────────────────
--  SEED DATA — Subcategories
-- ─────────────────────────────────────────────
INSERT INTO Subcategories (category_id, subcategory_name) VALUES
    (1, 'Train'), (1, 'Flight'), (1, 'Cab / Taxi'), (1, 'Bus'),
    (2, 'Hotel'), (2, 'Hostel'), (2, 'Airbnb'),
    (3, 'Restaurant'), (3, 'Street Food'), (3, 'Cafe'),
    (4, 'Water Sports'), (4, 'Sightseeing'), (4, 'Adventure'),
    (5, 'Electricity'), (5, 'Internet'), (5, 'Water'), (5, 'Rent');