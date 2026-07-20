from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.task import Task
from app.core.security import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    is_admin = current_user.role == "admin"

    # Employee counts are org-wide numbers — only meaningful for admins
    total_employees = None
    active_employees = None
    inactive_employees = None

    if is_admin:
        total_employees = db.query(Employee).filter(
            Employee.is_deleted == False
        ).count()

        active_employees = db.query(Employee).filter(
            Employee.status == "active",
            Employee.is_deleted == False
        ).count()

        inactive_employees = db.query(Employee).filter(
            Employee.status == "inactive",
            Employee.is_deleted == False
        ).count()

    # Base task query: admin sees all tasks, employee sees only their own
    task_query = db.query(Task).filter(Task.is_deleted == False)

    if not is_admin:
        task_query = task_query.filter(
            Task.assigned_to == current_user.id
        )

    total_tasks = task_query.count()

    pending_tasks = task_query.filter(
        Task.status == "Pending"
    ).count()

    in_progress_tasks = task_query.filter(
        Task.status == "In Progress"
    ).count()

    completed_tasks = task_query.filter(
        Task.status == "Completed"
    ).count()

    high_priority_tasks = task_query.filter(
        Task.priority == "High"
    ).count()

    medium_priority_tasks = task_query.filter(
        Task.priority == "Medium"
    ).count()

    low_priority_tasks = task_query.filter(
        Task.priority == "Low"
    ).count()

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "inactive_employees": inactive_employees,
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "high_priority_tasks": high_priority_tasks,
        "medium_priority_tasks": medium_priority_tasks,
        "low_priority_tasks": low_priority_tasks
    }