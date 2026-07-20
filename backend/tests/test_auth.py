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
    # SECURITY: must be indistinguishable from a wrong-password response
    # (same status + message), otherwise the endpoint becomes an oracle
    # for enumerating valid employee emails.
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_wrong_password_matches_unknown_email_response(client, employee_user):
    """Wrong password and unknown email must return identical responses."""
    wrong_password_resp = client.post(
        "/auth/login",
        data={"username": "employee@test.com", "password": "wrong-password"},
    )
    unknown_email_resp = client.post(
        "/auth/login",
        data={"username": "somebody-else@test.com", "password": "whatever123"},
    )
    assert wrong_password_resp.status_code == unknown_email_resp.status_code == 401
    assert wrong_password_resp.json() == unknown_email_resp.json()


def test_login_sets_httponly_cookie(client, employee_user):
    response = client.post(
        "/auth/login",
        data={"username": "employee@test.com", "password": "employee12345"},
    )
    assert response.status_code == 200
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "HttpOnly" in set_cookie


def test_logout_revokes_token(client, employee_user):
    login_resp = client.post(
        "/auth/login",
        data={"username": "employee@test.com", "password": "employee12345"},
    )
    token = login_resp.json()["access_token"]

    # Token works before logout
    assert client.get("/auth/me", headers=auth_header(token)).status_code == 200

    logout_resp = client.post("/auth/logout", headers=auth_header(token))
    assert logout_resp.status_code == 200

    # Same token must be rejected after logout, even though it hasn't expired
    assert client.get("/auth/me", headers=auth_header(token)).status_code == 401


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