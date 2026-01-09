
from pydantic import BaseModel
from beanie import PydanticObjectId
from typing import List

class UserRoleRegistrationSchema(BaseModel):
    name: str
    permissions: List[PydanticObjectId]

    