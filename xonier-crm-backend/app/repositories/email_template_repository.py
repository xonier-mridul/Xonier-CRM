# app/repositories/email_template_repository.py
from app.repositories.base_repository import BaseRepository
from app.db.models.email_template_model import EmailTemplateModel
from typing import Optional, Dict, Any
from beanie import PydanticObjectId


class EmailTemplateRepository(BaseRepository):
    def __init__(self):
        super().__init__(EmailTemplateModel)

    async def find_by_slug(self, slug: str) -> Optional[EmailTemplateModel]:
        return await EmailTemplateModel.find_one(
            {"slug": slug, "deleted_at": None}
        )

    async def find_by_name(self, name: str) -> Optional[EmailTemplateModel]:
        return await EmailTemplateModel.find_one(
            {"name": name, "deleted_at": None}
        )

    async def increment_usage(self, id: PydanticObjectId):
        from datetime import datetime, timezone
        await EmailTemplateModel.find_one(
            {"_id": id}
        ).update({"$inc": {"usage_count": 1}, "$set": {"last_used_at": datetime.now(timezone.utc)}})