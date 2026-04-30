from pydantic import BaseModel
from typing import Optional


class StartTimerSchema(BaseModel):
    """No body needed — task_id comes from the URL."""
    pass


class StopTimerSchema(BaseModel):
    note: Optional[str] = None


class PauseTimerSchema(BaseModel):
    """No body needed — log_id comes from the URL."""
    pass


class ResumeTimerSchema(BaseModel):
    """No body needed — log_id comes from the URL."""
    pass