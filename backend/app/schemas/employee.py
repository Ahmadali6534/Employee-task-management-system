from pydantic import BaseModel # type: ignore
from datetime import datetime


# Data received when creating employee profile
class EmployeeCreate(BaseModel):

    user_id: int
    first_name: str
    last_name: str
    phone: str | None = None
    department: str
    designation: str
    joining_date: datetime | None = None


# Data returned from API
class EmployeeResponse(BaseModel):

    id: int
    user_id: int
    first_name: str
    last_name: str
    phone: str | None
    department: str
    designation: str
    joining_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime


    class Config:
        from_attributes = True

class EmployeeUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    department: str
    designation: str
    status: str