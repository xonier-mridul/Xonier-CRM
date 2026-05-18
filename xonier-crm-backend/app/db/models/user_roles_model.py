from beanie import Document, Link, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field, field_validator
from typing import List, TYPE_CHECKING
from app.db.models.base_model import BaseDocument
from app.utils.custom_exception import AppException


from datetime import datetime, timezone
from typing import Optional


class UserRoleModel(BaseDocument):
     name:str = Field(..., unique=True)
     code:str = Field(..., unique=True, pattern=r"^[A-Z]+(_[A-Z]+)*$", description="Role code must be uppercase and use underscores only")
     permissions: List[Link["PermissionModel"]] = Field(default_factory=list)

     power: int = Field(default=10, ge=1, le=100)
     canManageBelow: bool = False
     
     status: bool = True
     isSystemRole: bool = False
     createdBy: Optional[Link["UserModel"]] = None
     updatedBy: Optional[Link["UserModel"]] = None
     createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
     updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
     deletedAt: Optional[datetime] = None

     class Settings: 
        name = "userroles"
        use_state_management = True

     @before_event(Save, Replace)
     def update_time_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)

     

     def can_manage(self, targetedRole: "UserRoleModel")->bool:
         return self.canManageBelow and self.power > targetedRole.power

from app.db.models.permissions_model import PermissionModel
from app.db.models.user_model import UserModel
UserRoleModel.model_rebuild()
