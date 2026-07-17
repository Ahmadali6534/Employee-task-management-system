"""
Tests for the Task Management module (SRS section 7):
    CRUD, search/filter/pagination/sorting, status transitions,
    priority/status enum validation, and assignment-based access control.
"""

from datetime import datetime, timedelta

from tests.conftest import auth_header # type: ignore


def _due_date():
    return (datetime.utcnow() + timedelta(days=5)).isoformat()


def test_create_task_requires_admin(client, employee_token, employee_user):
    response = client.post(
        "/tasks/",
        headers=auth_header(employee_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Test task",
            "priority": "Medium",
            "due_date": _due_date(),
        },
    )
    assert response.status_code == 403


def test_create_task_success(client, admin_token, employee_user):
    response = client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Prepare slides",
            "priority": "High",
            "due_date": _due_date(),
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["assigned_to"] == employee_user.id
    assert body["status"] == "Pending"
    assert body["priority"] == "High"


def test_create_task_unknown_user_rejected(client, admin_token):
    response = client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": 99999,
            "title": "Ghost task",
            "priority": "Low",
            "due_date": _due_date(),
        },
    )
    assert response.status_code == 404


def test_create_task_invalid_priority_rejected(client, admin_token, employee_user):
    """Priority must be one of Low/Medium/High (SRS section 7)."""
    response = client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Bad priority",
            "priority": "urgent",
            "due_date": _due_date(),
        },
    )
    assert response.status_code == 422


def test_update_task_invalid_status_rejected(client, admin_token, sample_task):
    """Status must be one of Pending/In Progress/Completed (SRS section 7)."""
    response = client.put(
        f"/tasks/{sample_task.id}",
        headers=auth_header(admin_token),
        json={"status": "Doing"},
    )
    assert response.status_code == 422


def test_get_tasks_pagination_and_search(client, admin_token, employee_user):
    for i in range(5):
        client.post(
            "/tasks/",
            headers=auth_header(admin_token),
            json={
                "assigned_to": employee_user.id,
                "title": f"Task number {i}",
                "priority": "Low",
                "due_date": _due_date(),
            },
        )

    response = client.get(
        "/tasks/?page=1&limit=2", headers=auth_header(admin_token)
    )
    assert response.status_code == 200
    assert len(response.json()) == 2

    search_response = client.get(
        "/tasks/?search=number 3", headers=auth_header(admin_token)
    )
    assert search_response.status_code == 200
    assert any("number 3" in t["title"] for t in search_response.json())


def test_get_tasks_filter_by_priority(client, admin_token, employee_user):
    client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "High prio task",
            "priority": "High",
            "due_date": _due_date(),
        },
    )
    client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Low prio task",
            "priority": "Low",
            "due_date": _due_date(),
        },
    )

    response = client.get(
        "/tasks/?priority=High", headers=auth_header(admin_token)
    )
    assert response.status_code == 200
    assert all(t["priority"] == "High" for t in response.json())


def test_my_tasks_only_returns_own_tasks(
    client, employee_token, other_employee_token, sample_task
):
    # sample_task is assigned to employee_user, not other_employee_user
    own_response = client.get("/tasks/my-tasks", headers=auth_header(employee_token))
    assert own_response.status_code == 200
    assert len(own_response.json()) == 1
    assert own_response.json()[0]["id"] == sample_task.id

    other_response = client.get(
        "/tasks/my-tasks", headers=auth_header(other_employee_token)
    )
    assert other_response.status_code == 200
    assert len(other_response.json()) == 0


def test_employee_cannot_access_task_not_assigned_to_them(
    client, other_employee_token, sample_task
):
    response = client.get(
        f"/tasks/{sample_task.id}", headers=auth_header(other_employee_token)
    )
    assert response.status_code == 403


def test_employee_can_access_own_task(client, employee_token, sample_task):
    response = client.get(
        f"/tasks/{sample_task.id}", headers=auth_header(employee_token)
    )
    assert response.status_code == 200
    assert response.json()["id"] == sample_task.id


def test_employee_can_update_own_task_status(client, employee_token, sample_task):
    response = client.patch(
        f"/tasks/{sample_task.id}/status",
        headers=auth_header(employee_token),
        json={"status": "In Progress"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"


def test_employee_cannot_update_status_of_others_task(
    client, other_employee_token, sample_task
):
    response = client.patch(
        f"/tasks/{sample_task.id}/status",
        headers=auth_header(other_employee_token),
        json={"status": "Completed"},
    )
    assert response.status_code == 403


def test_employee_cannot_update_task_details(client, employee_token, sample_task):
    """Only admins may PUT full task details (title/priority/etc)."""
    response = client.put(
        f"/tasks/{sample_task.id}",
        headers=auth_header(employee_token),
        json={"title": "Hacked title"},
    )
    assert response.status_code == 403


def test_delete_task_soft_deletes(client, admin_token, sample_task, db_session):
    response = client.delete(
        f"/tasks/{sample_task.id}", headers=auth_header(admin_token)
    )
    assert response.status_code == 200

    from app.models.task import Task

    db_row = db_session.query(Task).filter(Task.id == sample_task.id).first()
    assert db_row is not None
    assert db_row.is_deleted is True

    get_response = client.get(
        f"/tasks/{sample_task.id}", headers=auth_header(admin_token)
    )
    assert get_response.status_code == 404