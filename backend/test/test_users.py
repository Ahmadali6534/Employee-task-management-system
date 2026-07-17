"""
Tests for the User Management module (SRS section 6):
    CRUD users, unique email, soft delete, field/password validation.
"""

from tests.conftest import auth_header # type: ignore
 

def test_list_users_requires_admin(client, employee_token):
    response = client.get("/users/", headers=auth_header(employee_token))
    assert response.status_code == 403


def test_list_users_as_admin(client, admin_token, admin_user, employee_user):
    response = client.get("/users/", headers=auth_header(admin_token))
    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert "admin@test.com" in emails
    assert "employee@test.com" in emails


def test_create_user_success(client, admin_token):
    response = client.post(
        "/users/",
        headers=auth_header(admin_token),
        json={
            "first_name": "Bilal",
            "last_name": "Tariq",
            "email": "bilal@test.com",
            "password": "password123",
            "role": "employee",
        },
    )
    assert response.status_code == 200
    assert response.json()["email"] == "bilal@test.com"


def test_create_user_duplicate_email(client, admin_token, employee_user):
    response = client.post(
        "/users/",
        headers=auth_header(admin_token),
        json={
            "first_name": "Dup",
            "last_name": "Email",
            "email": employee_user.email,
            "password": "password123",
            "role": "employee",
        },
    )
    assert response.status_code == 400


def test_create_user_password_too_short(client, admin_token):
    response = client.post(
        "/users/",
        headers=auth_header(admin_token),
        json={
            "first_name": "Short",
            "last_name": "Pass",
            "email": "shortpass@test.com",
            "password": "123",
            "role": "employee",
        },
    )
    assert response.status_code == 422


def test_create_user_missing_required_field(client, admin_token):
    response = client.post(
        "/users/",
        headers=auth_header(admin_token),
        json={
            "last_name": "NoFirstName",
            "email": "nofirst@test.com",
            "password": "password123",
            "role": "employee",
        },
    )
    assert response.status_code == 422


def test_update_user(client, admin_token, employee_user):
    response = client.put(
        f"/users/{employee_user.id}",
        headers=auth_header(admin_token),
        json={"first_name": "Updated"},
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Updated"


def test_soft_delete_user(client, admin_token, employee_user, db_session):
    response = client.delete(
        f"/users/{employee_user.id}", headers=auth_header(admin_token)
    )
    assert response.status_code == 200

    # Row should still exist in the DB but be flagged is_deleted, and no
    # longer show up in GET /users/{id}
    get_response = client.get(
        f"/users/{employee_user.id}", headers=auth_header(admin_token)
    )
    assert get_response.status_code == 404

    from app.models.user import User

    db_row = db_session.query(User).filter(User.id == employee_user.id).first()
    assert db_row is not None
    assert db_row.is_deleted is True