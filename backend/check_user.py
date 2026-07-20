"""
One-off diagnostic script -- run from backend\ with:
    python check_user.py

Prints whether admin@test.com / employee@test.com exist in whatever
database DATABASE_URL currently points to, and verifies the seeded
passwords actually match the stored hash.
"""

from app.database import SessionLocal
# Import every model module so SQLAlchemy has all classes registered
# before any relationship() gets resolved (this is what app.main does
# implicitly by importing all the routers).
from app.models.user import User
from app.models.employee import Employee
from app.models.task import Task
from app.models.task_file import TaskFile
from app.core.security import verify_password
from app.core.config import DATABASE_URL

print(f"Connected to: {DATABASE_URL}")
print()

db = SessionLocal()

for email, expected_password in [
    ("admin@test.com", "admin123"),
    ("employee@test.com", "employee123"),
]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"{email}: NOT FOUND in this database")
        continue

    matches = verify_password(expected_password, user.password_hash)
    print(
        f"{email}: found, role={user.role}, is_deleted={user.is_deleted}, "
        f"password '{expected_password}' matches hash: {matches}"
    )

db.close()