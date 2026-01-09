
from app.repositories.base_repository import BaseRepository
from app.db.models.enquiry_management_model import EnquiryModel
from typing import List, Optional, Dict
from motor.motor_asyncio import AsyncIOMotorClientSession

class EnquiryRepository(BaseRepository):
    def __init__(self):
        super().__init__(EnquiryModel)

    
    async def find_by_enquiry_id(self, id: str, projections: Optional[Dict[str, int]] = None, populate :Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
        populate = populate or []

        query = self.model.find_one({"enquiry_id": id}, session=session)

        if projections:
            query = query.project(projections)

        doc = await query

        if not doc:
            return None

       
        for field in populate:
            value = getattr(doc, field, None)

            if value is None:
                continue

            
            if hasattr(value, "fetch"):
                fetched = await value.fetch()
                setattr(doc, field, fetched)

            
            elif isinstance(value, list):
                fetched_items = []
                for item in value:
                    if hasattr(item, "fetch"):
                        fetched_items.append(await item.fetch())
                    else:
                        fetched_items.append(item)

                setattr(doc, field, fetched_items)

        return doc