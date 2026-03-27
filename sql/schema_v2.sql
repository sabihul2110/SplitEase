-- --- schema_v2.sql ---

-- ============================================================
--  College Expense Splitter — expense_splitter_react
--  Complete schema v2 — adds Invites table
--
--  CHANGES FROM v1:
--  - Added Invites table for invite-link system
--  - No other structural changes
--
--  HOW TO USE:
--  If you already have the database running with data,
--  run ONLY the "ADD INVITES TABLE" section below.
--  If starting fresh, run the full script.
-- ============================================================


-- ─────────────────────────────────────────────
--  OPTION A: Already have the DB? Run only this.
-- ─────────────────────────────────────────────

/*
USE expense_splitter_react;

CREATE TABLE IF NOT EXISTS Invites (
    invite_id   INT           NOT NULL AUTO_INCREMENT,
    token       VARCHAR(64)   NOT NULL,
    group_id    INT           NOT NULL,
    created_by  INT           NOT NULL,
    expires_at  TIMESTAMP         NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_invites       PRIMARY KEY (invite_id),
    CONSTRAINT uq_invite_token  UNIQUE      (token),
    CONSTRAINT fk_inv_group     FOREIGN KEY (group_id)    REFERENCES `Groups`(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_creator   FOREIGN KEY (created_by)  REFERENCES Users(user_id)     ON DELETE CASCADE
);
*/

-- ─────────────────────────────────────────────
--  OPTION B: Fresh install — full schema below
-- ─────────────────────────────────────────────

DROP DATABASE IF EXISTS expense_splitter_react;
CREATE DATABASE expense_splitter_react;
USE expense_splitter_react;


-- ─────────────────────────────────────────────
--  1. USERS
-- ─────────────────────────────────────────────
CREATE TABLE Users (
    user_id       INT           NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL,
    password_hash VARCHAR(255)      NULL,
    upi_id        VARCHAR(100)      NULL,
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users  PRIMARY KEY (user_id),
    CONSTRAINT uq_email  UNIQUE      (email)
);


-- ─────────────────────────────────────────────
--  2. GROUPS
-- ─────────────────────────────────────────────
CREATE TABLE `Groups` (
    group_id   INT           NOT NULL AUTO_INCREMENT,
    group_name VARCHAR(150)  NOT NULL,
    created_by INT               NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_groups   PRIMARY KEY (group_id),
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
--
--  split_type:
--    'equal'  — divide evenly among participants in Expense_Splits
--    'custom' — per-member amounts in Expense_Splits
--
--  NOTE: payer_id may or may not be in Expense_Splits.
--  Example: A pays ₹300, but only B and C are in splits.
--  This is VALID — A fronted the money but isn't a participant.
-- ─────────────────────────────────────────────
CREATE TABLE Expenses (
    expense_id     INT                  NOT NULL AUTO_INCREMENT,
    group_id       INT                  NOT NULL,
    payer_id       INT                  NOT NULL,
    category_id    INT                  NOT NULL,
    subcategory_id INT                      NULL,
    total_amount   DECIMAL(10,2)        NOT NULL,
    description    VARCHAR(255)         NOT NULL,
    split_type     VARCHAR(10)          NOT NULL DEFAULT 'equal',
    expense_date   DATE                 NOT NULL,
    created_at     TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_expenses        PRIMARY KEY (expense_id),
    CONSTRAINT fk_exp_group       FOREIGN KEY (group_id)       REFERENCES `Groups`(group_id)            ON DELETE CASCADE,
    CONSTRAINT fk_exp_payer       FOREIGN KEY (payer_id)       REFERENCES Users(user_id)                ON DELETE CASCADE,
    CONSTRAINT fk_exp_category    FOREIGN KEY (category_id)    REFERENCES Categories(category_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_exp_subcategory FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL,
    CONSTRAINT chk_exp_amount     CHECK (total_amount > 0),
    CONSTRAINT chk_split_type     CHECK (split_type IN ('equal','custom'))
);


-- ─────────────────────────────────────────────
--  7. EXPENSE_SPLITS
--
--  One row per (expense, participant).
--  Participants can be any subset of group members.
--  Payer does NOT have to be in splits.
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
    CONSTRAINT fk_split_expense  FOREIGN KEY (expense_id) REFERENCES Expenses(expense_id)  ON DELETE CASCADE,
    CONSTRAINT fk_split_user     FOREIGN KEY (user_id)    REFERENCES Users(user_id)         ON DELETE CASCADE,
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
    CONSTRAINT fk_pay_group   FOREIGN KEY (group_id)  REFERENCES `Groups`(group_id)  ON DELETE CASCADE,
    CONSTRAINT fk_pay_payer   FOREIGN KEY (payer_id)  REFERENCES Users(user_id)      ON DELETE CASCADE,
    CONSTRAINT fk_pay_payee   FOREIGN KEY (payee_id)  REFERENCES Users(user_id)      ON DELETE CASCADE,
    CONSTRAINT chk_pay_amount CHECK (amount > 0),
    CONSTRAINT chk_pay_self   CHECK (payer_id <> payee_id)
);


-- ─────────────────────────────────────────────
--  9. INVITES
--
--  Used for invite-link system.
--  Only group members can generate invite links.
--  Token is a random UUID/hex string.
--  expires_at NULL = never expires.
-- ─────────────────────────────────────────────
CREATE TABLE Invites (
    invite_id   INT          NOT NULL AUTO_INCREMENT,
    token       VARCHAR(64)  NOT NULL,
    group_id    INT          NOT NULL,
    created_by  INT          NOT NULL,
    expires_at  TIMESTAMP        NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_invites      PRIMARY KEY (invite_id),
    CONSTRAINT uq_invite_token UNIQUE      (token),
    CONSTRAINT fk_inv_group    FOREIGN KEY (group_id)   REFERENCES `Groups`(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_creator  FOREIGN KEY (created_by) REFERENCES Users(user_id)     ON DELETE CASCADE
);


-- ─────────────────────────────────────────────
--  10. STORED PROCEDURE: Calculate_Settlements
--
--  Returns one row per group member:
--    net_balance = total_paid - total_owed - payments_sent + payments_received
--
--  Sign convention:
--    net_balance > 0  → member is owed money
--    net_balance < 0  → member owes money
--    net_balance = 0  → fully settled
-- ─────────────────────────────────────────────
DELIMITER $$

CREATE PROCEDURE Calculate_Settlements(IN input_group_id INT)
BEGIN
    SELECT
        u.name                                     AS user_name,
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

    LEFT JOIN (
        SELECT payer_id, SUM(total_amount) AS total_paid
        FROM   Expenses WHERE group_id = input_group_id
        GROUP  BY payer_id
    ) paid ON paid.payer_id = u.user_id

    LEFT JOIN (
        SELECT es.user_id, SUM(es.amount_owed) AS total_owed
        FROM   Expense_Splits es
        JOIN   Expenses e ON e.expense_id = es.expense_id
        WHERE  e.group_id = input_group_id
        GROUP  BY es.user_id
    ) owed ON owed.user_id = u.user_id

    LEFT JOIN (
        SELECT payer_id, SUM(amount) AS payments_sent
        FROM   Payments WHERE group_id = input_group_id
        GROUP  BY payer_id
    ) psent ON psent.payer_id = u.user_id

    LEFT JOIN (
        SELECT payee_id, SUM(amount) AS payments_received
        FROM   Payments WHERE group_id = input_group_id
        GROUP  BY payee_id
    ) prec ON prec.payee_id = u.user_id

    WHERE  gm.group_id = input_group_id
    ORDER  BY net_balance DESC;
END$$

DELIMITER ;


-- ─────────────────────────────────────────────
--  11. SEED DATA — Categories
-- ─────────────────────────────────────────────
INSERT INTO Categories (category_name) VALUES
    ('Travel'),
    ('Accommodation'),
    ('Food & Dining'),
    ('Activities'),
    ('Utilities'),
    ('Groceries');


-- ─────────────────────────────────────────────
--  12. SEED DATA — Subcategories
-- ─────────────────────────────────────────────
INSERT INTO Subcategories (category_id, subcategory_name) VALUES
    (1, 'Train'), (1, 'Flight'), (1, 'Cab / Taxi'), (1, 'Bus'),
    (2, 'Hotel'), (2, 'Hostel'), (2, 'Airbnb'),
    (3, 'Restaurant'), (3, 'Street Food'), (3, 'Cafe'),
    (4, 'Water Sports'), (4, 'Sightseeing'), (4, 'Adventure'),
    (5, 'Electricity'), (5, 'Internet'), (5, 'Water'), (5, 'Rent');
    
    
-- ─────────────────────────────────────────────
--  NOTIFICATIONS TABLE
--  Run this in MySQL Workbench to add notifications.
--
--  type values:
--    'reminder'  — sent by creditor to debtor
--    'payment'   — someone recorded a payment
--    'join'      — someone joined a group
-- ─────────────────────────────────────────────


CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INT           NOT NULL AUTO_INCREMENT,
    user_id         INT           NOT NULL,   -- who receives this notification
    from_user_id    INT               NULL,   -- who triggered it (NULL = system)
    type            VARCHAR(30)   NOT NULL DEFAULT 'reminder',
    message         VARCHAR(500)  NOT NULL,
    group_id        INT               NULL,   -- related group (for deep-link)
    is_read         TINYINT(1)    NOT NULL DEFAULT 0,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notifications    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_user       FOREIGN KEY (user_id)      REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_from_user  FOREIGN KEY (from_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_notif_group      FOREIGN KEY (group_id)     REFERENCES `Groups`(group_id) ON DELETE SET NULL
);

-- Index for fast unread count query
CREATE INDEX idx_notif_user_read ON Notifications (user_id, is_read);