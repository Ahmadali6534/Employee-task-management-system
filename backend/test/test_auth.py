"""
Tests for the Authentication module (SRS section 4):
    POST /auth/register  (admin-only, extra endpoint)
    POST /auth/login
    GET  /auth/me
    POST /auth/logout
"""

from tests.conftest import auth_header # type: ignore


def test_login_success(client, employee_user):
    response = client.post(
        "/auth/login",
        data={"username": "employee@test.com", "password": "employee12345"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, employee_user):
    response = client.post(
        "/auth/login",
        data={"username": "employee@test.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_unknown_email(client):
    response = client.post(
        "/auth/login",
        data={"username": "nobody@test.com", "password": "whatever123"},
    )
    assert response.status_code == 404


def test_get_me_requires_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_get_me_returns_current_user(client, employee_user, employee_token):
    response = client.get("/auth/me", headers=auth_header(employee_token))
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "employee@test.com"
    assert body["role"] == "employee"


def test_logout_requires_token(client):
    response = client.post("/auth/logout")
    assert response.status_code == 401


def test_logout_success(client, employee_token):
    response = client.post("/auth/logout", headers=auth_header(employee_token))
    assert response.status_code == 200
    assert response.json()["message"] == "Logout successful"


def test_register_requires_admin(client, employee_token):
    """Non-admins must not be able to create new users via /auth/register."""
    response = client.post(
        "/auth/register",
        headers=auth_header(employee_token),
        json={
            "first_name": "New",
            "last_name": "Guy",
            "email": "newguy@test.com",
            "password": "somepassword1",
            "role": "employee",
        },
    )
    assert response.status_code == 403


def test_register_by_admin_succeeds(client, admin_token):
    response = client.post(
        "/auth/register",
        headers=auth_header(admin_token),
        json={
            "first_name": "New",
            "last_name": "Guy",
            "email": "newguy@test.com",
            "password": "somepassword1",
            "role": "employee",
        },
    )
    assert response.status_code == 200
    assert response.json()["email"] == "newguy@test.com"


def test_register_duplicate_email_rejected(client, admin_token, employee_user):
    response = client.post(
        "/auth/register",
        headers=auth_header(admin_token),
        json={
            "first_name": "Dup",
            "last_name": "Licate",
            "email": employee_user.email,
            "password": "somepassword1",
            "role": "employee",
        },
    )
    assert response.status_code == 400