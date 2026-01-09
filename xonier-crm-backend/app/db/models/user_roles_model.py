from beanie import Document, Link, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field
from typing import List, TYPE_CHECKING


from datetime import datetime, timezone
from typing import Optional


class UserRoleModel(Document):
     name:str = Field(..., unique=True)
     code:str = Field(..., unique=True, pattern=r"^[A-Z]+(_[A-Z]+)*$", description="Role code must be uppercase and use underscores only")
     permissions: List[Link["PermissionModel"]] = Field(default_factory=list)
     
     
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

from app.db.models.permissions_model import PermissionModel
from app.db.models.user_model import UserModel
UserRoleModel.model_rebuild()
