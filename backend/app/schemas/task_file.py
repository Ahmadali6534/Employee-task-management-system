from pydantic import BaseModel # type: ignore
from datetime import datetime


class TaskFileResponse(BaseModel):
    id: int
    task_id: int
    original_file_name: str
    stored_file_name: str
    content_type: str
    file_size: int
    file_path: str
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True