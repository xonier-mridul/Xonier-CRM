from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel


class GoogleCalendarConnectionModel(Document):
    """Per-user Google Calendar OAuth credentials, encrypted at rest."""

    companyId: PydanticObjectId
    userId: PydanticObjectId
    accountEmail: str
    encryptedRefreshToken: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "google_calendar_connections"
        indexes = [
            IndexModel(
                [("companyId", 1), ("userId", 1)],
                unique=True,
                name="unique_google_calendar_connection_per_user",
            )
        ]
