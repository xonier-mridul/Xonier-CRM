from pydantic import BaseModel, StringConstraints, Field
from typing import Annotated, Optional, List
from app.db.models.user_model import UserModel



class TeamRegisterSchema(BaseModel):
    name: str = Field(...)
    category: str
    description: Optional[str] = None
    manager: List[str]
    members: List[str]
    

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

    