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
    # NOTE: All performance indexes are now created when the tables are created
    # in their respective migrations. This migration is kept for migration history
    # continuity but performs no operations.
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # NOTE: All performance indexes are dropped when tables are dropped
    # in their respective migration downgrades.
    pass
