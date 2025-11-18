"""Add Match model

Revision ID: 7d2e9f3b8c1a
Revises: 4c6f6798749b
Create Date: 2025-11-17 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7d2e9f3b8c1a'
down_revision: Union[str, Sequence[str], None] = '4c6f6798749b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('player_a_id', sa.BigInteger(), nullable=False),
        sa.Column('player_b_id', sa.BigInteger(), nullable=False),
        sa.Column('start_time', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('end_time', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=False),
        sa.Column('canceled_by', sa.BigInteger(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('confirmed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('declined_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('canceled_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.CheckConstraint('start_time < end_time', name='valid_match_time'),
        sa.CheckConstraint('player_a_id != player_b_id', name='different_players'),
        sa.ForeignKeyConstraint(['canceled_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['player_a_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['player_b_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_matches_player_a_time', 'matches', ['player_a_id', 'start_time', 'end_time'],
                    postgresql_where=sa.text("status IN ('pending', 'confirmed')"))
    op.create_index('idx_matches_player_b_time', 'matches', ['player_b_id', 'start_time', 'end_time'],
                    postgresql_where=sa.text("status IN ('pending', 'confirmed')"))
    op.create_index('idx_matches_canceled', 'matches', ['canceled_by', 'canceled_at'],
                    postgresql_where=sa.text("status = 'canceled'"))
    op.create_index(op.f('ix_matches_id'), 'matches', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_matches_id'), table_name='matches')
    op.drop_index('idx_matches_canceled', table_name='matches', postgresql_where=sa.text("status = 'canceled'"))
    op.drop_index('idx_matches_player_b_time', table_name='matches', postgresql_where=sa.text("status IN ('pending', 'confirmed')"))
    op.drop_index('idx_matches_player_a_time', table_name='matches', postgresql_where=sa.text("status IN ('pending', 'confirmed')"))
    op.drop_table('matches')
