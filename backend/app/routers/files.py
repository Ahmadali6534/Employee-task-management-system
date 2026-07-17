import os
import uuid

from fastapi import ( # type: ignore
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException
)

from sqlalchemy.orm import Session
from fastapi.responses import FileResponse # type: ignore
from app.database import get_db
from app.models.task import Task
from app.models.task_file import TaskFile
from app.models.employee import Employee
from app.models.user import User

from app.core.security import get_current_user


# Router for endpoints nested under a task (upload / list files for a task)
router = APIRouter(
    prefix="/tasks",
    tags=["Files"]
)

# Router for standalone file endpoints, matches SRS: GET /files/{id}/download, DELETE /files/{id}
files_router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


UPLOAD_DIR = "uploads/tasks"

# Make sure the upload directory exists (it is gitignored, so a fresh
# checkout of the repository will not have it on disk).
os.makedirs(UPLOAD_DIR, exist_ok=True)


ALLOWED_EXTENSIONS = [
    "pdf",
    "docx",
    "xlsx",
    "png",
    "jpg",
    "txt"
]


MAX_FILE_SIZE = 10 * 1024 * 1024


def _get_task_or_404(task_id: int, db: Session) -> Task:
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return task


def _ensure_task_access(task: Task, current_user: User, db: Session):
    """
    Admins can access files for any task. Employees may only access
    files belonging to tasks assigned to them.
    """

    if current_user.role == "admin":
        return

    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.is_deleted == False
    ).first()

    if not employee or task.employee_id != employee.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this task's files"
        )


@router.post("/{task_id}/files")
async def upload_file(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task = _get_task_or_404(task_id, db)

    _ensure_task_access(task, current_user, db)

    # Check extension

    extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed"
        )


    # Read file

    contents = await file.read()


    # Check size

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB"
        )


    # Generate unique filename

    stored_filename = (
        f"{uuid.uuid4()}.{extension}"
    )


    file_path = os.path.join(
        UPLOAD_DIR,
        stored_filename
    )


    # Save file

    with open(file_path, "wb") as buffer:
        buffer.write(contents)



    # Save database record

    task_file = TaskFile(
        task_id=task_id,
        original_file_name=file.filename,
        stored_file_name=stored_filename,
        content_type=file.content_type,
        file_size=len(contents),
        file_path=file_path,
        uploaded_by=current_user.id
    )


    db.add(task_file)
    db.commit()
    db.refresh(task_file)


    return {
        "message": "File uploaded successfully",
        "file_id": task_file.id
    }

@router.get("/{task_id}/files")
def get_task_files(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task = _get_task_or_404(task_id, db)

    _ensure_task_access(task, current_user, db)

    files = db.query(TaskFile).filter(
        TaskFile.task_id == task_id
    ).all()


    return files

@files_router.get("/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task_file = db.query(TaskFile).filter(
        TaskFile.id == file_id
    ).first()


    if not task_file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    task = _get_task_or_404(task_file.task_id, db)
    _ensure_task_access(task, current_user, db)


    if not os.path.exists(task_file.file_path):
        raise HTTPException(
            status_code=404,
            detail="File missing from server"
        )


    return FileResponse(
        path=task_file.file_path,
        filename=task_file.original_file_name,
        media_type=task_file.content_type
    )

@files_router.delete("/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task_file = db.query(TaskFile).filter(
        TaskFile.id == file_id
    ).first()


    if not task_file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    task = _get_task_or_404(task_file.task_id, db)
    _ensure_task_access(task, current_user, db)


    # Delete physical file

    if os.path.exists(task_file.file_path):
        os.remove(task_file.file_path)


    # Delete database record

    db.delete(task_file)
    db.commit()


    return {
        "message": "File deleted successfully"
    }