"""
Tests for the File Management module (SRS section 8):
    upload/list/download/delete, allowed extensions, 10MB size limit,
    and assignment-based access control.
"""

import io

import pytest # type: ignore

from tests.conftest import auth_header # type: ignore


@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path, monkeypatch):
    """
    Redirect the module's UPLOAD_DIR to a temp folder for the duration of
    each test, so tests never touch the real uploads/tasks/ directory.
    """
    import app.routers.files as files_module

    test_upload_dir = tmp_path / "uploads_test"
    test_upload_dir.mkdir()
    monkeypatch.setattr(files_module, "UPLOAD_DIR", str(test_upload_dir))
    yield


def _upload(client, token, task_id, filename, content, content_type="text/plain"):
    return client.post(
        f"/tasks/{task_id}/files",
        headers=auth_header(token),
        files={"file": (filename, io.BytesIO(content), content_type)},
    )


def test_upload_file_success(client, admin_token, sample_task):
    response = _upload(client, admin_token, sample_task.id, "notes.txt", b"hello world")
    assert response.status_code == 200
    assert "file_id" in response.json()


def test_upload_rejects_disallowed_extension(client, admin_token, sample_task):
    response = _upload(
        client, admin_token, sample_task.id, "malware.exe", b"binarydata",
        content_type="application/octet-stream",
    )
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()


def test_upload_rejects_oversized_file(client, admin_token, sample_task):
    oversized_content = b"x" * (10 * 1024 * 1024 + 1)  # 10MB + 1 byte
    response = _upload(client, admin_token, sample_task.id, "big.txt", oversized_content)
    assert response.status_code == 400
    assert "10mb" in response.json()["detail"].lower()


def test_upload_requires_task_access(client, other_employee_token, sample_task):
    """sample_task is assigned to employee_user, not other_employee_user."""
    response = _upload(
        client, other_employee_token, sample_task.id, "notes.txt", b"hello"
    )
    assert response.status_code == 403


def test_employee_can_upload_to_own_task(client, employee_token, sample_task):
    response = _upload(client, employee_token, sample_task.id, "notes.txt", b"hello")
    assert response.status_code == 200


def test_list_task_files(client, admin_token, sample_task):
    _upload(client, admin_token, sample_task.id, "a.txt", b"aaa")
    _upload(client, admin_token, sample_task.id, "b.txt", b"bbb")

    response = client.get(
        f"/tasks/{sample_task.id}/files", headers=auth_header(admin_token)
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_download_file(client, admin_token, sample_task):
    upload_response = _upload(
        client, admin_token, sample_task.id, "download_me.txt", b"file content"
    )
    file_id = upload_response.json()["file_id"]

    response = client.get(
        f"/files/{file_id}/download", headers=auth_header(admin_token)
    )
    assert response.status_code == 200
    assert response.content == b"file content"


def test_download_requires_task_access(client, admin_token, other_employee_token, sample_task):
    upload_response = _upload(
        client, admin_token, sample_task.id, "secret.txt", b"secret content"
    )
    file_id = upload_response.json()["file_id"]

    response = client.get(
        f"/files/{file_id}/download", headers=auth_header(other_employee_token)
    )
    assert response.status_code == 403


def test_delete_file(client, admin_token, sample_task, db_session):
    upload_response = _upload(
        client, admin_token, sample_task.id, "to_delete.txt", b"bye"
    )
    file_id = upload_response.json()["file_id"]

    response = client.delete(
        f"/files/{file_id}", headers=auth_header(admin_token)
    )
    assert response.status_code == 200

    from app.models.task_file import TaskFile

    assert db_session.query(TaskFile).filter(TaskFile.id == file_id).first() is None