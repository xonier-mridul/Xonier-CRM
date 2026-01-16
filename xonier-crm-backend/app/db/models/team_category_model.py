from beanie import Document, Indexed, Link, before_event, Insert, Save, Replace
from pydantic import Field, StringConstraints
from typing import Optional, Annotated
from datetime import datetime, timezone
from app.db.models.user_model import UserModel


SLUG = Annotated[
    str,
    StringConstraints(
        pattern=r"^[a-z]+(_[a-z]+)*$",
        min_length=2,
        max_length=50
    )
]


class TeamCategoryModel(Document):
    name: str = Field(..., min_length=2, max_length=100)
    slug: SLUG = Indexed(unique=True)
    description: Optional[str] = None

    isActive: bool = True
    isDefault: bool = False

    createdBy: Link[UserModel]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    updatedBy: Optional[Link[UserModel]] = None
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "team_categories"

    @before_event(Insert, Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)
