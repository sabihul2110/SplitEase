"""add performance indexes

Revision ID: 0002_perf_indexes
Revises: 1647b52f9f0d
Create Date: 2026-06-08
"""
from alembic import op
from sqlalchemy import text

revision = '0002_perf_indexes'
down_revision = '1647b52f9f0d'
branch_labels = None
depends_on = None


def _index_exists(name: str, table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.STATISTICS "
            "WHERE table_schema = DATABASE() "
            "AND table_name = :t AND index_name = :n"
        ),
        {"t": table, "n": name},
    )
    rows = result.fetchall()
    if not rows:
        return False
    return (rows[0][0] or 0) > 0


def _create(name: str, table: str, cols: str) -> None:
    if not _index_exists(name, table):
        op.execute(f"CREATE INDEX {name} ON {table}({cols})")


def _drop(name: str, table: str) -> None:
    if _index_exists(name, table):
        op.execute(f"DROP INDEX {name} ON {table}")


def upgrade() -> None:
    # Expenses
    _create("idx_expenses_group_id",   "Expenses",          "group_id")
    _create("idx_expenses_payer_id",   "Expenses",          "payer_id")
    _create("idx_expenses_group_date", "Expenses",          "group_id, expense_date DESC")

    # Expense_Splits
    _create("idx_splits_expense_id",   "Expense_Splits",    "expense_id")
    _create("idx_splits_user_id",      "Expense_Splits",    "user_id")

    # Payments
    _create("idx_payments_group_id",   "Payments",          "group_id")
    _create("idx_payments_payer_id",   "Payments",          "payer_id")
    _create("idx_payments_payee_id",   "Payments",          "payee_id")

    # Group_Members
    _create("idx_group_members_user",  "Group_Members",     "user_id")

    # PasswordResetTokens
    _create("idx_reset_tokens_hash",   "PasswordResetTokens", "token")

    # Personal_Expenses, Income, Loans, Borrows, Notifications
    # These already have inline indexes in schema.sql under different names.
    # We create additional compound indexes only where the schema ones differ.
    _create("idx_personal_exp_user",   "Personal_Expenses", "user_id, expense_date DESC")
    _create("idx_income_user_date",    "Income",            "user_id, income_date DESC")
    _create("idx_loans_lender_date",   "Loans",             "lender_user_id, loan_date DESC")
    _create("idx_borrows_user_date",   "Borrows",           "borrower_user_id, borrow_date DESC")
    _create("idx_notifications_full",  "Notifications",     "user_id, is_read, created_at DESC")


def downgrade() -> None:
    for name, table in [
        ("idx_expenses_group_id",   "Expenses"),
        ("idx_expenses_payer_id",   "Expenses"),
        ("idx_expenses_group_date", "Expenses"),
        ("idx_splits_expense_id",   "Expense_Splits"),
        ("idx_splits_user_id",      "Expense_Splits"),
        ("idx_payments_group_id",   "Payments"),
        ("idx_payments_payer_id",   "Payments"),
        ("idx_payments_payee_id",   "Payments"),
        ("idx_group_members_user",  "Group_Members"),
        ("idx_reset_tokens_hash",   "PasswordResetTokens"),
        ("idx_personal_exp_user",   "Personal_Expenses"),
        ("idx_income_user_date",    "Income"),
        ("idx_loans_lender_date",   "Loans"),
        ("idx_borrows_user_date",   "Borrows"),
        ("idx_notifications_full",  "Notifications"),
    ]:
        _drop(name, table)