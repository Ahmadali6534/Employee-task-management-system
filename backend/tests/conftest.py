"""
Shared pytest fixtures for the Employee Task Management System backend.

These tests run against an isolated in-memory SQLite database (not your
real PostgreSQL DB), so it's safe to run any time without touching real
data. Each test function gets a fresh, empty database.

Setup:
    pip install pytest httpx --break-system-packages   (if not already installed)

Run:
    cd backend
    pytest -v
"""

import os

# Make sure app.core.config has something to load even if a real .env
# isn't present in the test environment. Real .env values (if present)
# still take priority via load_dotenv(), these are just safe fallbacks.
os.environ.setdefault(
    "SECRET_KEY",
    "test-only-secret-key-0123456789-not-for-production-use-abcdefgh",
)
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest # type: ignore
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient # type: ignore

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.employee import Employee  # noqa: F401  (registers the table)
from app.models.task import Task
from app.models.task_file import TaskFile  # noqa: F401  (registers the table)
from app.core.security import hash_password, create_access_token


# ---------------------------------------------------------------------------
# Test database (fresh SQLite in-memory DB per test function)
# ---------------------------------------------------------------------------

@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session):
    # The login rate limiter and token revocation blacklist are in-memory
    # module-level state (by design -- see their docstrings), which means
    # they'd otherwise leak between test functions in the same pytest
    # process. Reset both per test so tests stay independent.
    from app.core.rate_limit import _attempts
    from app.core.security import _revoked_jtis
    _attempts.clear()
    _revoked_jtis.clear()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def admin_user(db_session: Session) -> User:
    user = User(
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        password_hash=hash_password("admin12345"),
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def employee_user(db_session: Session) -> User:
    user = User(
        first_name="Ali",
        last_name="Khan",
        email="employee@test.com",
        password_hash=hash_password("employee12345"),
        role="employee",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def other_employee_user(db_session: Session) -> User:
    user = User(
        first_name="Sara",
        last_name="Ahmed",
        email="employee2@test.com",
        password_hash=hash_password("employee12345"),
        role="employee",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_token(admin_user: User) -> str:
    return create_access_token(
        {"sub": str(admin_user.id), "email": admin_user.email, "role": admin_user.role}
    )


@pytest.fixture()
def employee_token(employee_user: User) -> str:
    return create_access_token(
        {
            "sub": str(employee_user.id),
            "email": employee_user.email,
            "role": employee_user.role,
        }
    )


@pytest.fixture()
def other_employee_token(other_employee_user: User) -> str:
    return create_access_token(
        {
            "sub": str(other_employee_user.id),
            "email": other_employee_user.email,
            "role": other_employee_user.role,
        }
    )


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Task fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def sample_task(db_session: Session, admin_user: User, employee_user: User) -> Task:
    from datetime import datetime, timedelta

    task = Task(
        assigned_to=employee_user.id,
        created_by=admin_user.id,
        title="Prepare report",
        description="Prepare the monthly report",
        priority="Medium",
        status="Pending",
        due_date=datetime.utcnow() + timedelta(days=3),
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task