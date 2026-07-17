from pydantic import BaseModel # type: ignore


class DashboardResponse(BaseModel):
    total_employees: int
    active_employees: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int