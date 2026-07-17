from pydantic import BaseModel  # type: ignore
from datetime import datetime
from typing import Optional
from typing import Literal

class TaskCreate(BaseModel):

    employee_id: int
    title: str
    description: Optional[str] = None
    priority: str
    due_date: datetime

class TaskUpdate(BaseModel):

    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):

    id: int
    employee_id: int
    title: str
    description: Optional[str]
    priority: str
    status: str
    due_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class TaskStatusUpdate(BaseModel):
    status: Literal[
        "Pending",
        "In Progress",
        "Completed"
    ]