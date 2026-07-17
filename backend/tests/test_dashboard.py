"""
Tests for the Dashboard module (SRS section 3 / README):
    GET /dashboard/stats
"""

from tests.conftest import auth_header # type: ignore


def test_dashboard_stats_requires_auth(client):
    response = client.get("/dashboard/stats")
    assert response.status_code == 401


def test_dashboard_stats_counts(client, admin_token, employee_user):
    # create a couple of tasks with different statuses/priorities
    from datetime import datetime, timedelta

    due = (datetime.utcnow() + timedelta(days=2)).isoformat()

    client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Task A",
            "priority": "High",
            "due_date": due,
        },
    )
    task_b = client.post(
        "/tasks/",
        headers=auth_header(admin_token),
        json={
            "assigned_to": employee_user.id,
            "title": "Task B",
            "priority": "Low",
            "due_date": due,
        },
    ).json()

    client.patch(
        f"/tasks/{task_b['id']}/status",
        headers=auth_header(admin_token),
        json={"status": "Completed"},
    )

    response = client.get("/dashboard/stats", headers=auth_header(admin_token))
    assert response.status_code == 200
    body = response.json()

    assert body["total_tasks"] == 2
    assert body["pending_tasks"] == 1
    assert body["completed_tasks"] == 1
    assert body["high_priority_tasks"] == 1
    assert body["low_priority_tasks"] == 1