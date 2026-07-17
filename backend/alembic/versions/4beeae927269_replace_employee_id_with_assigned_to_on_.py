"""replace employee_id with assigned_to on tasks

Revision ID: 4beeae927269
Revises: 3f615cf8be19
Create Date: ...
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4beeae927269'
down_revision = '3f615cf8be19'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add the new column as NULLABLE first (so existing rows don't break)
    op.add_column(
        'tasks',
        sa.Column('assigned_to', sa.Integer(), nullable=True)
    )

    # 2. Backfill: for every task, pull the user_id from the employee
    #    that its old employee_id pointed to
    op.execute(
        """
        UPDATE tasks
        SET assigned_to = employees.user_id
        FROM employees
        WHERE tasks.employee_id = employees.id
        """
    )

    # 3. Now that every row has a value, enforce NOT NULL
    op.alter_column('tasks', 'assigned_to', nullable=False)

    # 4. Add the FK constraint to users
    op.create_foreign_key(
        'tasks_assigned_to_fkey',
        'tasks', 'users',
        ['assigned_to'], ['id']
    )

    # 5. Drop the old FK constraint and column
    #    (adjust constraint name below if yours differs — see note under this block)
    op.drop_constraint('tasks_employee_id_fkey', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'employee_id')


def downgrade() -> None:
    op.add_column(
        'tasks',
        sa.Column('employee_id', sa.Integer(), nullable=True)
    )

    op.execute(
        """
        UPDATE tasks
        SET employee_id = employees.id
        FROM employees
        WHERE tasks.assigned_to = employees.user_id
        """
    )

    op.alter_column('tasks', 'employee_id', nullable=False)

    op.create_foreign_key(
        'tasks_employee_id_fkey',
        'tasks', 'employees',
        ['employee_id'], ['id']
    )

    op.drop_constraint('tasks_assigned_to_fkey', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'assigned_to')