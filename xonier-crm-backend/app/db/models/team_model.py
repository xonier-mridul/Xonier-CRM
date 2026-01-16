from beanie import Document, Link, before_event, Save,Insert, Replace, Indexed
from pydantic import Field, StringConstraints
from typing import Optional, List, Annotated
from app.db.models.user_model import UserModel
from datetime import datetime, timezone
from app.db.models.team_category_model import TeamCategoryModel


SLUG = Annotated[str, StringConstraints(pattern=r"^[a-z]+(_[a-z]+)*$", min_length=2, max_length=50)]

class TeamModel(Document):
    name: str = Field(...)
    slug: SLUG = Indexed(unique=True)
    category: Link[TeamCategoryModel]
    description: Optional[str]
    members: List[Link[UserModel]]
    isActive: bool = True
    isDefault: bool = False
    createdBy: Link[UserModel]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedBy: Optional[Link[UserModel]] = None

    class Settings:
        name = "teams"

    @before_event(Save, Insert, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)

    


    