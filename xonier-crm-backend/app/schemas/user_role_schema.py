
from pydantic import BaseModel, field_validator
from beanie import PydanticObjectId
from typing import List ,Optional
from app.utils.custom_exception import AppException

class UserRoleRegistrationSchema(BaseModel):
    name: str
    permissions: List[PydanticObjectId]
    power: Optional[int] = 10
    canManageBelow: bool = False


    @field_validator("power", mode="before")
    @classmethod
    def validate_power(cls, v:int)->int:
         if v and int(v) < 1 or int(v) > 100:
             raise AppException(422, "Power must be grater then 1 and less then 100")
         
         return v



class UserRoleUpdateSchema(BaseModel):
    name: str
    permissions: List[PydanticObjectId]
    power: Optional[int] = 10
    canManageBelow: bool = False

    @field_validator("power", mode="before")
    @classmethod
    def validate_power(cls, v:int)->int:
         if v and v < 1 or v > 100:
             raise AppException(422, "Power must be grater then 1 and less then 100")
         
         return v


    