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

    total_tasks = db.query(Task).filter(
        Task.is_deleted == False
    ).count()

    pending_tasks = db.query(Task).filter(
        Task.status == "Pending",
        Task.is_deleted == False
    ).count()

    in_progress_tasks = db.query(Task).filter(
        Task.status == "In Progress",
        Task.is_deleted == False
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.status == "Completed",
        Task.is_deleted == False
    ).count()

    high_priority_tasks = db.query(Task).filter(
        Task.priority == "High",
        Task.is_deleted == False
    ).count()

    medium_priority_tasks = db.query(Task).filter(
        Task.priority == "Medium",
        Task.is_deleted == False
    ).count()

    low_priority_tasks = db.query(Task).filter(
        Task.priority == "Low",
        Task.is_deleted == False
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