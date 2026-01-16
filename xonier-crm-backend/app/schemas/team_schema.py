from pydantic import BaseModel, StringConstraints, Field
from typing import Annotated, Optional, List
from app.db.models.user_model import UserModel



class TeamRegisterSchema(BaseModel):
    name: str = Field(...)
    category: str
    description: Optional[str]
    members: List[str]
    

class TeamUpdateSchema(BaseModel):
    name: str = Field(...)
    category: str
    description: Optional[str]
    isActive: bool
    members: List[str]
    
    
class TeamCategoryCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    