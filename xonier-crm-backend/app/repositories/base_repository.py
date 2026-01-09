from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClientSession
from beanie import PydanticObjectId
import math


class BaseRepository:
    def __init__(self, model):
        self.model = model

    async def create(
        self, data: dict, session: Optional[AsyncIOMotorClientSession] = None
    ):
        document = self.model(**data)
        await document.insert(session=session)
        return document

    async def bulk_create(
        self,
        docs: List[Dict[str, Any]],
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        result = self.model.insert_many(docs, session=session)
        return result

    async def find_by_id(
        self,
        id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        populate = populate or []

   
        doc = await self.model.get(id, session=session)

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

    async def find_one(
        self,
        filter=Dict[str, Any],
        projections: Optional[Dict[str, int]] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        populate = populate or []

        query = self.model.find_one(filter, session=session)

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

    async def get_all_without_pagination(
        self,
        filters: Optional[Dict[str, Any]] = {},
        populate: Optional[List[str]] = None,
        projection: Optional[str] = "",
        session: Optional[AsyncIOMotorClientSession] = None,
    ):

        filters = filters or {}
        populate = populate or []
        query = self.model.find(filters)

        if projection:
            query = query.project(projection)

        if session:
            query = query.session(session)

        items = await query.to_list()
       
        if items:
            for doc in items:
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

        return items

    async def get_all(
    self,
    page: int = 1,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    ):
        filters = filters or {}
        populate = populate or []

        skip = (page - 1) * limit

        query = self.model.find(filters).skip(skip).limit(limit)

        if session:
            query = query.session(session)

        results = await query.to_list()

       
        for doc in results:
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


        count = await self.model.find(filters).count()
        total_pages = math.ceil(count / limit)

        return {
            "data": [doc.model_dump(mode="json") for doc in results],
            "page": page,
            "totalPages": total_pages,
            "limit": limit,
        }


    async def update(
        self,
        id: PydanticObjectId,
        data: Dict[str, Any],
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        result = await self.model.find_one({"_id": id}).update(
            {"$set": data}, session=session
        )

        return result.modified_count

    async def delete_by_id(
        self, id: PydanticObjectId, session: Optional[AsyncIOMotorClientSession] = None
    ):
        user = await self.model.find_one({"_id": id})
        if not user:
            return None

        await user.delete()
        return True
