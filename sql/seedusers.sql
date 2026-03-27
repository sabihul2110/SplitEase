USE expense_splitter_react;

-- ============================================================
--  College Expense Splitter — seed_data.sql
--  Scope : Users table only
--  Hashing: bcrypt $2b$12$ (passlib-compatible)
--
--  LOGIN CREDENTIALS:
--  ┌──────────────────────────────────────┬─────────────────────────┐
--  │ Email                                │ Password                │
--  ├──────────────────────────────────────┼─────────────────────────┤
--  │ afzalamanul2009@gmail.com            │ afzal@splitease         │
--  │ farnaaz1974@gmail.com                │ farnaaz@splitease       │
--  │ sharyaashraf45@gmail.com             │ sharya@splitease        │
--  │ khanadnan8910@icloud.com             │ adnan@splitease         │
--  │ umarmahtab10@gmail.com               │ umar@splitease          │
--  │ jatinkumar@gmail.com                 │ jatin@splitease         │
--  │ abhinavrana@gmail.com                │ abhinav@splitease       │
--  │ shahmerirfan@gmail.com               │ shahmer@splitease       │
--  └──────────────────────────────────────┴─────────────────────────┘
--
--  Generated : 2026-03-27
-- ============================================================

USE expense_splitter_react;

-- ─────────────────────────────────────────────
--  USERS
--  All roles: user
--  Passwords hashed with bcrypt, cost factor 12
-- ─────────────────────────────────────────────

INSERT INTO Users (name, email, password_hash, upi_id, role) VALUES

-- 1. Mohammad Afzal Amanul Haque | password: afzal@splitease
(
    'Mohammad Afzal Amanul Haque',
    'afzalamanul2009@gmail.com',
    '$2b$12$HACsWLG.pfbys0Fk5sOLaei1f6nsLc4E0UaN6fbNq8ehU0eQ1qrSq',
    'afzal09@fam',
    'user'
),

-- 2. Baby Farnaaz | password: farnaaz@splitease
(
    'Baby Farnaaz',
    'farnaaz1974@gmail.com',
    '$2b$12$0tQhMNA6WcqOJ4T0NIItxu4prItKxMBEM3Z356ufN0gKVXLkTJDgK',
    NULL,
    'user'
),

-- 3. Sharya Haider | password: sharya@splitease
(
    'Sharya Haider',
    'sharyaashraf45@gmail.com',
    '$2b$12$Zhx2L3ni4vW6o/FPwyuTl.wG72K7yfzkv5tMdMEdppcqyDmwcqEZa',
    '8210751712@ptsbi',
    'user'
),

-- 4. Adnan Ahmad | password: adnan@splitease
(
    'Adnan Ahmad',
    'khanadnan8910@icloud.com',
    '$2b$12$r30oyKQah4GqX0PGrPMCAOtYgLTY8ofzqd.jddePq3h4y.DptiO6O',
    '9905012268@upi',
    'user'
),

-- 5. Umar Mahtab | password: umar@splitease
(
    'Umar Mahtab',
    'umarmahtab10@gmail.com',
    '$2b$12$Yk/j1sxP/jw9y4LvQNYRYeDYtjM0zpLbXVOpQwXus1ggcZSFmtjlq',
    'umarmahtab75-1@okhdfcbank',
    'user'
),

-- 6. Jatin Kumar | password: jatin@splitease  [placeholder email]
(
    'Jatin Kumar',
    'jatinkumar@gmail.com',
    '$2b$12$tIywztRIvSYPmt2/FdX58.1JDb/IX4r0ATk0CUTQ/g0zM2nrEJhTG',
    'jatinthors@ybl',
    'user'
),

-- 7. Abhinav Rana | password: abhinav@splitease  [placeholder email]
(
    'Abhinav Rana',
    'abhinavrana@gmail.com',
    '$2b$12$Ewt6miR3R8tpzKGcbvgGLuxcQKcwIZe8TOUs2jmhfow8asyETSdKG',
    '9241079089@nyes',
    'user'
),

-- 8. Shahmer Irfan Ahmad | password: shahmer@splitease  [placeholder email + upi]
(
    'Shahmer Irfan Ahmad',
    'shahmerirfan@gmail.com',
    '$2b$12$315n.IZU4ovuNEViqYcf0uG.kAUtk763m00KjYmLeka.JB9bEaoLm',
    'shahmerirfan@upi',
    'user'
);

-- ─────────────────────────────────────────────
--  END OF SEED
-- ─────────────────────────────────────────────