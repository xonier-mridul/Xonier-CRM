from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime
from app.utils.custom_exception import AppException
from typing import List, Any


class CreateTaskSchema(BaseModel):
    title: str
    isCompleted: bool = False
    dueDate: Optional[datetime] = None
    startDate: Optional[datetime] = None
    
    actualHours: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, data: Any):
        due = data.get("dueDate")
        start = data.get("startDate")
        hours = data.get("actualHours")

        if due and start and (due < start):
            raise AppException(422, "Dua date must be greater then start date")
        
        if hours and hours<0:
            raise AppException(422, "Hours field must be equal to and grater then 0")

        
        return data


