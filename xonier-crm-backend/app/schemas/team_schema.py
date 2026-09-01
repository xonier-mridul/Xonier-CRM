from pydantic import BaseModel, StringConstraints, Field, field_validator
from typing import Annotated, Optional, List
from app.db.models.user_model import UserModel
from app.utils.custom_exception import AppException
import re

NAME_PATTERN = re.compile(r"^[A-Za-z\s]+$") 
class TeamRegisterSchema(BaseModel):
    name: str = Field(...)
    category: str
    description: Optional[str] = None
    manager: List[str]
    members: List[str]


    @field_validator("name", mode="before")
    @classmethod
    def validate_name_slug(cls, v):
        if not v.strip():
            raise AppException(422, "Name field must required")

        cleaned = v.strip()

        if not NAME_PATTERN.fullmatch(cleaned):
            raise AppException(422, "Name must contain only valid alphabets and space allowed, not have any special characters and number")

        return cleaned

        
    

class TeamUpdateSchema(BaseModel):
    name: str = Field(...)
    category: str
    description: Optional[str]
    isActive: bool
    manager: List[str]
    members: List[str]
    
    
class TeamCategoryCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class TeamCategoryUpdateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class TeamCatStatusUpdateSchema(BaseModel):
    isActive: bool

    