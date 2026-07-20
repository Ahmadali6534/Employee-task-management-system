"""add indexes on tasks filter/sort columns

Revision ID: 7a1c9e2f4d3b
Revises: 4beeae927269
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1c9e2f4d3b'
down_revision: Union[str, Sequence[str], None] = '4beeae927269'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Every /tasks list query filters on is_deleted (always) and, for
    employees, on assigned_to; it commonly filters on status/priority
    too and always sorts on one of created_at/due_date/priority/status.
    None of these had indexes, so every list call was a full table
    scan. Add them.
    """
    op.create_index('ix_tasks_assigned_to', 'tasks', ['assigned_to'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_priority', 'tasks', ['priority'])
    op.create_index('ix_tasks_due_date', 'tasks', ['due_date'])
    op.create_index('ix_tasks_is_deleted', 'tasks', ['is_deleted'])
    op.create_index('ix_tasks_created_at', 'tasks', ['created_at'])
    # Composite index matching the most common query shape: an employee's
    # non-deleted tasks, newest first.
    op.create_index(
        'ix_tasks_assigned_to_is_deleted_created_at',
        'tasks',
        ['assigned_to', 'is_deleted', 'created_at'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_tasks_assigned_to_is_deleted_created_at', table_name='tasks')
    op.drop_index('ix_tasks_created_at', table_name='tasks')
    op.drop_index('ix_tasks_is_deleted', table_name='tasks')
    op.drop_index('ix_tasks_due_date', table_name='tasks')
    op.drop_index('ix_tasks_priority', table_name='tasks')
    op.drop_index('ix_tasks_status', table_name='tasks')
    op.drop_index('ix_tasks_assigned_to', table_name='tasks')
