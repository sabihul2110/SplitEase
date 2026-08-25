# backend/migrations/versions/0021_add_tos_acceptance.py


"""add tos_accepted_at/tos_version to Users

Signup now requires an explicit "I agree" checkbox. This stores *when*
and *which version* of the Terms/Privacy Policy the user accepted, so
there's an actual record — not just a link nobody has to click.

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0021'
down_revision = '0020'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'Users',
        sa.Column('tos_accepted_at', sa.DateTime(), nullable=True,
                   comment='UTC timestamp of when the user accepted the Terms/Privacy Policy at signup.')
    )
    op.add_column(
        'Users',
        sa.Column('tos_version', sa.String(20), nullable=True,
                   comment='Version string of the Terms/Privacy Policy the user accepted (matches the "Last updated" date on the doc).')
    )


def downgrade():
    op.drop_column('Users', 'tos_version')
    op.drop_column('Users', 'tos_accepted_at')