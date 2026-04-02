from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from app.core.enums import TASK_STATUS_TYPE
from app.utils.custom_exception import AppException
 
 
class CreateTaskStatusSchema(BaseModel):
    name: str
    color: Optional[str] = "#6B7280"
    category: str
    order: Optional[int] = 0
    type: TASK_STATUS_TYPE = TASK_STATUS_TYPE.NOT_STARTED
    isFinal: bool = False
    icon: Optional[str] = ""
    
    isActive: bool = True
 
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "name is required")
        return v.strip()
 
    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("#"):
            raise AppException(422, "color must be a valid hex code e.g. #6B7280")
        return v
 
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "category is required")
        return v.strip()
    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.strip():
            raise AppException(422, "icon cannot be empty")
        return v.strip() if v else v
 
 
class UpdateTaskStatusSchema(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    category: str
    type: Optional[TASK_STATUS_TYPE] = None
    isFinal: Optional[bool] = None
    isDefault: Optional[bool] = None
    isActive: Optional[bool] = None
    icon: Optional[str] = None
 
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise AppException(422, "name cannot be empty")
        return v.strip() if v else v
 
    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("#"):
            raise AppException(422, "color must be a valid hex code e.g. #6B7280")
        return v

 
class ReorderTaskStatusSchema(BaseModel):
    statuses: List[dict]
 
    @model_validator(mode="before")
    @classmethod
    def validate_statuses(cls, value):
        statuses = value.get("statuses", [])
        if not statuses:
            raise AppException(422, "statuses list is required")
        for item in statuses:
            if "id" not in item or "order" not in item:
                raise AppException(422, "Each status must have 'id' and 'order' fields")
        return value
    

class BulkCreateTaskStatusSchema(BaseModel):
    category: str
    statuses: List[CreateTaskStatusSchema]
 
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "category is required")
        return v.strip()
 
    @model_validator(mode="before")
    @classmethod
    def validate_statuses(cls, value):
        statuses = value.get("statuses", [])
        if not statuses:
            raise AppException(422, "statuses list is required and cannot be empty")
        if len(statuses) > 20:
            raise AppException(422, "Cannot create more than 20 statuses at once")
        final_count = sum(1 for s in statuses if s.get("isFinal"))
        if final_count > 1:
            raise AppException(422, "Only one status can be marked as final")
        default_count = sum(1 for s in statuses if s.get("isDefault"))
        if default_count > 1:
            raise AppException(422, "Only one status can be marked as default")
        return value
    
 
 