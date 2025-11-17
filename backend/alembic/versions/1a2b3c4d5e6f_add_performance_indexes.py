"""Add performance indexes for availability, matches, and notifications

Revision ID: 1a2b3c4d5e6f
Revises: 9f4a5b6c7d8e
Create Date: 2025-11-17 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e6f'
down_revision: Union[str, Sequence[str], None] = '9f4a5b6c7d8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Availability blocks: overlap queries
    op.create_index(
        'idx_availability_blocks_user_time',
        'availability_blocks',
        ['user_id', 'start_time']
    )

    op.create_index(
        'idx_availability_blocks_time_range',
        'availability_blocks',
        ['start_time', 'end_time']
    )

    # Matches: conflict detection for player A
    op.create_index(
        'idx_matches_player_a_time',
        'matches',
        ['player_a_id', 'start_time', 'end_time'],
        postgresql_where=sa.text("status IN ('pending', 'confirmed')")
    )

    # Matches: conflict detection for player B
    op.create_index(
        'idx_matches_player_b_time',
        'matches',
        ['player_b_id', 'start_time', 'end_time'],
        postgresql_where=sa.text("status IN ('pending', 'confirmed')")
    )

    # Notifications: queue processing
    op.create_index(
        'idx_notification_queue_pending',
        'notification_queue',
        ['scheduled_for'],
        postgresql_where=sa.text('sent_at IS NULL AND failed_at IS NULL')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_notification_queue_pending', table_name='notification_queue')
    op.drop_index('idx_matches_player_b_time', table_name='matches')
    op.drop_index('idx_matches_player_a_time', table_name='matches')
    op.drop_index('idx_availability_blocks_time_range', table_name='availability_blocks')
    op.drop_index('idx_availability_blocks_user_time', table_name='availability_blocks')
