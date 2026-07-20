from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.security import admin_required
from app.core.security import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse
)
from app.models.user import User

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

# Create Employee
@router.post(
    "/",
    response_model=EmployeeResponse
)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    linked_user = db.query(User).filter(
        User.id == employee.user_id,
        User.is_deleted == False
    ).first()

    if not linked_user:
        raise HTTPException(
            status_code=404,
            detail="Linked user account not found"
        )

    new_employee = Employee(
        user_id=employee.user_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        phone=employee.phone,
        department=employee.department,
        designation=employee.designation,
        joining_date=employee.joining_date
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


# Get All Employees
@router.get(
    "/",
    response_model=list[EmployeeResponse]
)
def get_employees(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    department: str | None = None,
    status: str | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    limit = min(max(limit, 1), 100)
    page = max(page, 1)
    offset = (page - 1) * limit

    query = db.query(Employee).filter(
        Employee.is_deleted == False
    )

    # Employees may only see their own record; admins see everyone
    if current_user.role != "admin":
        query = query.filter(
            Employee.user_id == current_user.id
        )

    # Search
    if search:
        query = query.filter(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.phone.ilike(f"%{search}%"),
                Employee.department.ilike(f"%{search}%")
            )
        )

    # Department Filter
    if department:
        query = query.filter(
            Employee.department == department
        )

    # Status Filter
    if status:
        query = query.filter(
            Employee.status == status
        )

    # Sorting (whitelist to avoid arbitrary attribute access)
    ALLOWED_SORT_FIELDS = {
        "created_at", "first_name", "last_name",
        "department", "designation", "joining_date"
    }

    if sort_by in ALLOWED_SORT_FIELDS and hasattr(Employee, sort_by):

        column = getattr(Employee, sort_by)

        if order.lower() == "desc":
            query = query.order_by(column.desc())
        else:
            query = query.order_by(column.asc())

    employees = (
        query
        .offset(offset)
        .limit(limit)
        .all()
    )

    return employees

# Get Single Employee
@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    employee = db.query(Employee).filter(
    Employee.id == employee_id,
    Employee.is_deleted == False
    ).first()


    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    if current_user.role != "admin" and employee.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this employee record"
        )

    return employee



# Update Employee
@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    db_employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.is_deleted == False
    ).first()

    if not db_employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db_employee.first_name = employee.first_name
    db_employee.last_name = employee.last_name
    db_employee.phone = employee.phone
    db_employee.department = employee.department
    db_employee.designation = employee.designation
    db_employee.status = employee.status

    db.commit()
    db.refresh(db_employee)

    return db_employee


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.is_deleted == False
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee.is_deleted = True

    db.commit()

    return {
        "message": "Employee deleted successfully"
    }