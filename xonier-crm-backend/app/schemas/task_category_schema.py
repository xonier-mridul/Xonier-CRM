from pydantic import BaseModel, field_validator
from typing import Optional
from app.core.enums import CATEGORY_VISIBILITY
from app.utils.custom_exception import AppException
 
 
class CreateTaskCategorySchema(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    
    isActive: bool = True
    visibility: CATEGORY_VISIBILITY = CATEGORY_VISIBILITY.GLOBAL
 
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
            raise AppException(422, "color must be a valid hex code e.g. #3B82F6")
        return v
 
 
class UpdateTaskCategorySchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    isActive: Optional[bool] = None
    visibility: Optional[CATEGORY_VISIBILITY] = None
 
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
            raise AppException(422, "color must be a valid hex code e.g. #3B82F6")
        return v
 