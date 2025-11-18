"""Add notification models

Revision ID: 8e3f4a5b6c7d
Revises: 7d2e9f3b8c1a
Create Date: 2025-11-17 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8e3f4a5b6c7d'
down_revision: Union[str, Sequence[str], None] = '7d2e9f3b8c1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sms_opt_in', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sms_opt_in_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('notify_match_requests', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notify_match_responses', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notify_reminders', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notify_cancellations', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('quiet_hours_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('quiet_hours_start', sa.Time(), nullable=False, server_default="'22:00:00'"),
        sa.Column('quiet_hours_end', sa.Time(), nullable=False, server_default="'07:00:00'"),
        sa.Column('last_sms_failure_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('last_email_failure_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('sms_consecutive_failures', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Create notification_queue table
    op.create_table(
        'notification_queue',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('channel', sa.String(length=10), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('scheduled_for', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('sent_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('failed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('fallback_sent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(
        'idx_notification_queue_pending',
        'notification_queue',
        ['scheduled_for'],
        postgresql_where=sa.text('sent_at IS NULL AND failed_at IS NULL')
    )

    op.create_index(
        'idx_notification_queue_user',
        'notification_queue',
        ['user_id', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_notification_queue_user', table_name='notification_queue')
    op.drop_index('idx_notification_queue_pending', table_name='notification_queue')
    op.drop_table('notification_queue')
    op.drop_table('notification_preferences')
