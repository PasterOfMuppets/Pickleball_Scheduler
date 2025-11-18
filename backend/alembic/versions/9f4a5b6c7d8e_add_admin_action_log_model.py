"""Add AdminActionLog model for audit trail

Revision ID: 9f4a5b6c7d8e
Revises: 8e3f4a5b6c7d
Create Date: 2025-11-17 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9f4a5b6c7d8e'
down_revision: Union[str, Sequence[str], None] = '8e3f4a5b6c7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create admin_action_log table
    op.create_table(
        'admin_action_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('admin_id', sa.BigInteger(), nullable=False),
        sa.Column('acting_as_user_id', sa.BigInteger(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.BigInteger(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['acting_as_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient querying
    op.create_index(
        'idx_admin_action_log_admin',
        'admin_action_log',
        ['admin_id', 'timestamp'],
        postgresql_ops={'timestamp': 'DESC'}
    )

    op.create_index(
        'idx_admin_action_log_impersonation',
        'admin_action_log',
        ['acting_as_user_id', 'timestamp'],
        postgresql_where=sa.text('acting_as_user_id IS NOT NULL'),
        postgresql_ops={'timestamp': 'DESC'}
    )

    op.create_index(
        'idx_admin_action_log_timestamp',
        'admin_action_log',
        ['timestamp'],
        postgresql_ops={'timestamp': 'DESC'}
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_admin_action_log_timestamp', table_name='admin_action_log')
    op.drop_index('idx_admin_action_log_impersonation', table_name='admin_action_log')
    op.drop_index('idx_admin_action_log_admin', table_name='admin_action_log')
    op.drop_table('admin_action_log')
