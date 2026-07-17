from app.database import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.task import Task
from datetime import datetime, timedelta
from app.core.security import hash_password


db = SessionLocal()


def create_seed_data():

    # Check admin exists

    admin = db.query(User).filter(
        User.email == "admin@test.com"
    ).first()


    if not admin:

        admin = User(
            first_name="Admin",
            last_name="User",
            email="admin@test.com",
            password_hash=hash_password("admin123"),
            role="admin"
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)



    # Check employee user exists

    employee_user = db.query(User).filter(
        User.email == "employee@test.com"
    ).first()


    if not employee_user:

        employee_user = User(
            first_name="Ali",
            last_name="Khan",
            email="employee@test.com",
            password_hash=hash_password("employee123"),
            role="employee"
        )

        db.add(employee_user)
        db.commit()
        db.refresh(employee_user)



    # Create employee profile

    employee = db.query(Employee).filter(
        Employee.user_id == employee_user.id
    ).first()


    if not employee:

        employee = Employee(
            user_id=employee_user.id,
            first_name="Ali",
            last_name="Khan",
            phone="03001234567",
            department="Software",
            designation="Developer"
        )

        db.add(employee)
        db.commit()
        db.refresh(employee)



    # Create sample task

    task = db.query(Task).filter(
        Task.title == "Complete Backend API"
    ).first()


    if not task:

        task = Task(
        employee_id=employee.id,
        created_by=admin.id,
        title="Complete Backend API",
        description="Finish Employee Task Management backend",
        priority="High",
        status="Pending",
        due_date=datetime.utcnow() + timedelta(days=7)
)

        db.add(task)
        db.commit()



    print("Seed data created successfully")



if __name__ == "__main__":
    create_seed_data()

    db.close()