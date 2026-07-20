"""
One-time backfill script.

Fixes existing employee-role users that don't have a matching row in the
`employees` table (this happened because the old create_user endpoint
never created one). Run this ONCE after applying the users.py fix.

Usage (from backend/ folder, with venv activated):
    python backfill_employees.py
"""

from app.database import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.task import Task
from app.models.task_file import TaskFile


def run():
    db = SessionLocal()
    try:
        users = db.query(User).filter(
            User.role == "employee",
            User.is_deleted == False
        ).all()

        created = 0
        for u in users:
            existing = db.query(Employee).filter(
                Employee.user_id == u.id
            ).first()

            if existing:
                continue

            db.add(Employee(
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                department="Unassigned",
                designation="Unassigned",
                status="active"
            ))
            created += 1

        db.commit()
        print(f"Done. Created {created} missing employee record(s).")

        # Sync: employees whose user is already deleted, but the
        # employee row itself was never marked deleted (happened
        # for deletes done before the delete_user fix).
        deleted_users = db.query(User).filter(
            User.role == "employee",
            User.is_deleted == True
        ).all()

        synced = 0
        for u in deleted_users:
            employee = db.query(Employee).filter(
                Employee.user_id == u.id,
                Employee.is_deleted == False
            ).first()

            if employee:
                employee.is_deleted = True
                synced += 1

        db.commit()
        print(f"Synced {synced} employee record(s) for already-deleted users.")
    finally:
        db.close()


if __name__ == "__main__":
    run()