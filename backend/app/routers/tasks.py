from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import or_
from app.models.task import Task
from app.models.employee import Employee
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    TaskStatusUpdate
)

from app.core.security import (
    get_current_user,
    admin_required
)


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


def _ensure_task_access(task: Task, current_user: User, db: Session):
    """
    Admins can access any task. Employees may only access tasks
    that are assigned to them.
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
            detail="You do not have access to this task"
        )

@router.post(
    "/",
    response_model=TaskResponse
)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    employee = db.query(Employee).filter(
        Employee.id == task.employee_id,
        Employee.is_deleted == False
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    new_task = Task(
    employee_id=task.employee_id,
    created_by=current_user.id,
    title=task.title,
    description=task.description,
    priority=task.priority,
    due_date=task.due_date)
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task

@router.get(
    "/",
    response_model=list[TaskResponse]
)
def get_tasks(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    query = db.query(Task).filter(
        Task.is_deleted == False
    )


    # Search
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )


    # Status filter
    if status:
        query = query.filter(
            Task.status == status
        )


    # Priority filter
    if priority:
        query = query.filter(
            Task.priority == priority
        )


    # Sorting
    if hasattr(Task, sort_by):

        column = getattr(Task, sort_by)

        if order == "asc":
            query = query.order_by(
                column.asc()
            )

        else:
            query = query.order_by(
                column.desc()
            )


    # Pagination
    offset = (page - 1) * limit

    tasks = (
        query
        .offset(offset)
        .limit(limit)
        .all()
    )


    return tasks


@router.get(
    "/my-tasks",
    response_model=list[TaskResponse]
)
def my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.is_deleted == False
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    tasks = db.query(Task).filter(
        Task.employee_id == employee.id,
        Task.is_deleted == False
    ).all()

    return tasks



@router.get(
    "/{task_id}",
    response_model=TaskResponse
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    _ensure_task_access(task, current_user, db)

    return task



@router.put(
    "/{task_id}",
    response_model=TaskResponse
)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    
    task = db.query(Task).filter(
    Task.id == task_id,
    Task.is_deleted == False
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
    )
    update_data = task_data.model_dump(
    exclude_unset=True
    )
    for key, value in update_data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)

    return task
    

@router.patch(
    "/{task_id}/status",
    response_model=TaskResponse
)
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    _ensure_task_access(task, current_user, db)

    task.status = status_data.status

    db.commit()
    db.refresh(task)

    return task


@router.delete(
    "/{task_id}"
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    task.is_deleted = True

    db.commit()

    return {
        "message": "Task deleted successfully"
    }