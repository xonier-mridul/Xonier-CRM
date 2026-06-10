from typing import Optional, Dict, Any, List, Tuple, Type
from motor.motor_asyncio import AsyncIOMotorClientSession
from beanie import PydanticObjectId
import math
from app.db.models.user_roles_model import UserRoleModel
from app.db.models.user_model import UserModel
from app.core.tenant import system_query
from pydantic import BaseModel
from app.utils.mongo_serializer import serialize_mongo
from app.core.tenant import bypass_scope




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
        documents = [self.model(**doc) for doc in docs]

        result = await self.model.insert_many(documents, session=session)
        return result.inserted_ids

    async def find_by_id(
        self,
        id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        populate = populate or []

        # with system_query():
        doc = await self.model.get(id, session=session)

        if not doc:
            return None

        for field in populate:
            value = getattr(doc, field, None)

            if value is None:
                continue

            if hasattr(value, "fetch"):
                # with system_query():
                fetched = await value.fetch()
                setattr(doc, field, fetched)

            elif isinstance(value, list):
                fetched_items = []
                for item in value:
                    if hasattr(item, "fetch"):
                        # with system_query():
                        fetched_items.append(await item.fetch())
                    else:
                        fetched_items.append(item)
                setattr(doc, field, fetched_items)

        return doc
    
    async def find_by_id_with_project(
    self,
    id: PydanticObjectId,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    project: Optional[Dict[str, Any]] = None,
    lookups: Optional[List[Dict[str, Any]]] = None,
):
        populate = populate or []
        lookups = lookups or []

        if project or lookups:
            collection = self.model.get_pymongo_collection()

            pipeline: List[Dict[str, Any]] = [{"$match": {"_id": id}}]

            for lookup in lookups:
                unwind = lookup.get("unwind", False)
                lookup_def = lookup["lookup"]
                pipeline.append({"$lookup": lookup_def})
                if unwind:
                    pipeline.append({
                        "$unwind": {
                            "path": f"${lookup_def['as']}",
                            "preserveNullAndEmptyArrays": True,
                        }
                    })

            if project:
                pipeline.append({"$project": project})

            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=1)
            if not results:
                return None
            return serialize_mongo(results[0])

        doc = await self.model.get(id, session=session)

        if not doc:
            return None

        token = bypass_scope.set(True)
        try:
            for field in populate:
                if "." in field:
                    parent_field, child_field = field.split(".", 1)
                    parent_value = getattr(doc, parent_field, None)

                    if parent_value is None:
                        continue

                    if isinstance(parent_value, list):
                        for item in parent_value:
                            child_value = getattr(item, child_field, None)
                            if child_value is None:
                                continue
                            if hasattr(child_value, "fetch"):
                                fetched = await child_value.fetch()
                                item.__dict__[child_field] = fetched
                    else:
                        child_value = getattr(parent_value, child_field, None)
                        if child_value is not None and hasattr(child_value, "fetch"):
                            fetched = await child_value.fetch()
                            parent_value.__dict__[child_field] = fetched
                    continue

                value = getattr(doc, field, None)
                if value is None:
                    continue

                if hasattr(value, "fetch"):
                    fetched = await value.fetch()
                    doc.__dict__[field] = fetched
                elif isinstance(value, list):
                    fetched_items = []
                    for item in value:
                        if hasattr(item, "fetch"):
                            fetched_items.append(await item.fetch())
                        else:
                            fetched_items.append(item)
                    doc.__dict__[field] = fetched_items

        finally:
            bypass_scope.reset(token)

        return doc
            

    async def find_by_id_nested(
    self,
    id: PydanticObjectId,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    ):
        populate = populate or []

        with system_query():
            doc = await self.model.get(id, session=session)

        if not doc:
            return None

        await self._populate_fields(doc, populate, session)
        return doc


    async def _fetch_value(self, value, session=None):
        if hasattr(value, "fetch"):
            with system_query():
                return await value.fetch()
        return value


    async def _fetch_list(self, items, session=None):
        result = []
        for item in items:
            if hasattr(item, "fetch"):
                with system_query():
                    result.append(await item.fetch())
            else:
                result.append(item)
        return result


    async def _populate_fields(self, doc, populate: list, session=None):
        if not populate or doc is None:
            return

        top_level_fields = set()
        nested_fields: dict[str, list[str]] = {}

        for field in populate:
            if "." in field:
                parts = field.split(".", 1)
                parent, child_path = parts[0], parts[1]
                top_level_fields.add(parent)
                nested_fields.setdefault(parent, []).append(child_path)
            else:
                top_level_fields.add(field)

        for field in top_level_fields:
            value = getattr(doc, field, None)

            if value is None:
                continue

            if isinstance(value, list):
                fetched = []
                for item in value:
                    if hasattr(item, "fetch"):
                        with system_query():
                            fetched.append(await item.fetch())
                    else:
                        fetched.append(item)
                setattr(doc, field, fetched)

            elif hasattr(value, "fetch"):
                with system_query():
                    fetched = await value.fetch()
                setattr(doc, field, fetched)

        for parent_field, child_paths in nested_fields.items():
            parent_value = getattr(doc, parent_field, None)
            if parent_value is None:
                continue

            if isinstance(parent_value, list):
                for item in parent_value:
                    if item is not None:
                        # ✅ Handle both Beanie documents AND plain Pydantic models
                        if hasattr(item, "__fields__") or hasattr(item, "model_fields"):
                            await self._populate_fields(item, child_paths, session)
            else:
                if hasattr(parent_value, "__fields__") or hasattr(parent_value, "model_fields"):
                    await self._populate_fields(parent_value, child_paths, session)

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
    

    async def find_one_with_project(
    self,
    filter: Dict[str, Any] = {},
    projections: Optional[Dict[str, int]] = None,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    lookups: Optional[List[Dict[str, Any]]] = None,
    project: Optional[Dict[str, Any]] = None,
    ):
        populate = populate or []
        lookups = lookups or []

        if project or lookups:
            collection = self.model.get_pymongo_collection()

            pipeline: List[Dict[str, Any]] = [{"$match": filter}]

            for lookup in lookups:
                unwind = lookup.get("unwind", False)
                lookup_def = lookup["lookup"]
                pipeline.append({"$lookup": lookup_def})
                if unwind:
                    pipeline.append({
                        "$unwind": {
                            "path": f"${lookup_def['as']}",
                            "preserveNullAndEmptyArrays": True,
                        }
                    })

            if project:
                pipeline.append({"$project": project})

            pipeline.append({"$limit": 1})

            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=1)
            if not results:
                return None
            return serialize_mongo(results[0])

        query = self.model.find_one(filter, session=session)

        if projections:
            query = query.project(projections)

        doc = await query

        if not doc:
            return None

        token = bypass_scope.set(True)
        try:
            for field in populate:
                if "." in field:
                    parent_field, child_field = field.split(".", 1)
                    parent_value = getattr(doc, parent_field, None)

                    if parent_value is None:
                        continue

                    if isinstance(parent_value, list):
                        for item in parent_value:
                            child_value = getattr(item, child_field, None)
                            if child_value is None:
                                continue
                            if hasattr(child_value, "fetch"):
                                fetched = await child_value.fetch()
                                item.__dict__[child_field] = fetched
                    else:
                        child_value = getattr(parent_value, child_field, None)
                        if child_value is not None and hasattr(child_value, "fetch"):
                            fetched = await child_value.fetch()
                            parent_value.__dict__[child_field] = fetched

                    continue

                value = getattr(doc, field, None)

                if value is None:
                    continue

                if hasattr(value, "fetch"):
                    fetched = await value.fetch()
                    doc.__dict__[field] = fetched

                elif isinstance(value, list):
                    fetched_items = []
                    for item in value:
                        if hasattr(item, "fetch"):
                            fetched_items.append(await item.fetch())
                        else:
                            fetched_items.append(item)
                    doc.__dict__[field] = fetched_items

        finally:
            bypass_scope.reset(token)

        return doc
        

    async def find(
        self,
        filter: Dict[str, Any] = None,
        projections: Optional[Dict[str, int]] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
        skip: int = 0,
        limit: int = 0,
        sort: Optional[List[tuple]] = None,
    ):
        populate = populate or []
        filter = filter or {}

        query = self.model.find(filter, session=session)

        if projections:
            query = query.project(projections)

        if sort:
            query = query.sort(sort)

        if skip:
            query = query.skip(skip)

        if limit:
            query = query.limit(limit)

        docs = await query.to_list()

        if not docs:
            return []

        
        for doc in docs:
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

        return docs
    

    async def find_with_project(
        self,
        filter: Dict[str, Any] = None,
        projections: Optional[Dict[str, int]] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
        skip: int = 0,
        limit: int = 0,
        sort: Optional[List[tuple]] = None,
        lookups: Optional[List[Dict[str, Any]]] = None,
        project: Optional[Dict[str, Any]] = None,
    ):
        populate = populate or []
        lookups = lookups or []
        filter = filter or {}

        if project or lookups:
            collection = self.model.get_pymongo_collection()

            pipeline: List[Dict[str, Any]] = [{"$match": filter}]

            for lookup in lookups:
                unwind = lookup.get("unwind", False)
                lookup_def = lookup["lookup"]
                pipeline.append({"$lookup": lookup_def})
                if unwind:
                    pipeline.append({
                        "$unwind": {
                            "path": f"${lookup_def['as']}",
                            "preserveNullAndEmptyArrays": True,
                        }
                    })

            if sort:
                sort_doc = {}
                for item in sort:
                    if isinstance(item, tuple):
                        sort_doc[item[0]] = item[1]
                    elif isinstance(item, str):
                        sort_doc[item[1:]] = -1 if item.startswith("-") else 1
                if sort_doc:
                    pipeline.append({"$sort": sort_doc})

            if skip:
                pipeline.append({"$skip": skip})

            if limit:
                pipeline.append({"$limit": limit})

            if project:
                pipeline.append({"$project": project})

            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit if limit else None)
            return [serialize_mongo(doc) for doc in results]

        query = self.model.find(filter, session=session)

        if projections:
            query = query.project(projections)

        if sort:
            query = query.sort(sort)

        if skip:
            query = query.skip(skip)

        if limit:
            query = query.limit(limit)

        docs = await query.to_list()

        if not docs:
            return []

        token = bypass_scope.set(True)
        try:
            for doc in docs:
                for field in populate:
                    if "." in field:
                        parent_field, child_field = field.split(".", 1)
                        parent_value = getattr(doc, parent_field, None)

                        if parent_value is None:
                            continue

                        if isinstance(parent_value, list):
                            for item in parent_value:
                                child_value = getattr(item, child_field, None)
                                if child_value is None:
                                    continue
                                if hasattr(child_value, "fetch"):
                                    fetched = await child_value.fetch()
                                    item.__dict__[child_field] = fetched
                        else:
                            child_value = getattr(parent_value, child_field, None)
                            if child_value is not None and hasattr(child_value, "fetch"):
                                fetched = await child_value.fetch()
                                parent_value.__dict__[child_field] = fetched

                        continue

                    value = getattr(doc, field, None)

                    if value is None:
                        continue

                    if hasattr(value, "fetch"):
                        fetched = await value.fetch()
                        doc.__dict__[field] = fetched

                    elif isinstance(value, list):
                        fetched_items = []
                        for item in value:
                            if hasattr(item, "fetch"):
                                fetched_items.append(await item.fetch())
                            else:
                                fetched_items.append(item)
                        doc.__dict__[field] = fetched_items

        finally:
            bypass_scope.reset(token)

        return docs


    async def get_all_without_pagination(
        self,
        filters: Optional[Dict[str, Any]] = {},
        populate: Optional[List[str]] = None,
        projection: Optional[str] = "",
        session: Optional[AsyncIOMotorClientSession] = None,
        sort: Optional[List[str]] = None
    ):

        filters = filters or {}
        populate = populate or []
        query = self.model.find(filters)

        if projection:
            query = query.project(projection)

        if session:
            query = query.session(session)

        if sort:
            query.sort(sort)

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

        return [doc.model_dump(mode="json") for doc in items]

    async def get_all(
    self,
    page: int = 1,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    sort: Optional[List[str]] = None,

    ):
        filters = filters or {}
        populate = populate or []

        skip = (page - 1) * limit

        query = self.model.find(filters).skip(skip).limit(limit)

        if sort:
            query.sort(sort)

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


    async def get_all_nested(
    self,
    page: int = 1,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None,
    populate: Optional[List[str]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
    sort: Optional[List[str]] = None,
):
        filters = filters or {}
        populate = populate or []

        skip = (page - 1) * limit
        query = self.model.find(filters).skip(skip).limit(limit)

        if sort:
            query.sort(sort)

        if session:
            query = query.session(session)

        results = await query.to_list()

        token = bypass_scope.set(True)
        try:
            for doc in results:
                for field in populate:

                    # ── nested field e.g. "features.feature" ──────────
                    if "." in field:
                        parent_field, child_field = field.split(".", 1)
                        parent_value = getattr(doc, parent_field, None)

                        if parent_value is None:
                            continue

                        if isinstance(parent_value, list):
                            for item in parent_value:
                                child_value = getattr(item, child_field, None)
                                if child_value is None:
                                    continue
                                if hasattr(child_value, "fetch"):
                                    fetched = await child_value.fetch()
                                    item.__dict__[child_field] = fetched
                        else:
                            child_value = getattr(parent_value, child_field, None)
                            if child_value is not None and hasattr(child_value, "fetch"):
                                fetched = await child_value.fetch()
                                parent_value.__dict__[child_field] = fetched

                        continue

                    # ── top-level field ────────────────────────────────
                    value = getattr(doc, field, None)

                    if value is None:
                        continue

                    if hasattr(value, "fetch"):
                        fetched = await value.fetch()
                        doc.__dict__[field] = fetched

                    elif isinstance(value, list):
                        fetched_items = []
                        for item in value:
                            if hasattr(item, "fetch"):
                                fetched_items.append(await item.fetch())
                            else:
                                fetched_items.append(item)
                        doc.__dict__[field] = fetched_items

        finally:
            bypass_scope.reset(token)

        count = await self.model.find(filters).count()
        total_pages = math.ceil(count / limit)

        return {
            "data": [doc.model_dump(mode="json") for doc in results],
            "page": page,
            "totalPages": total_pages,
            "limit": limit,
        }


    async def get_all_with_lookup(
    self,
    page: int = 1,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None,
    lookups: Optional[List[Dict[str, Any]]] = None,
    project: Optional[Dict[str, Any]] = None,
    sort: Optional[List[Any]] = None,
    session: Optional[AsyncIOMotorClientSession] = None,
) -> Dict[str, Any]:
        filters = filters or {}
        lookups = lookups or []
        skip = (page - 1) * limit

        pipeline: List[Dict[str, Any]] = [{"$match": filters}]

        for lookup in lookups:
            unwind = lookup.get("unwind", False)
            pipeline.append({"$lookup": lookup["lookup"]})
            if unwind:
                pipeline.append({
                    "$unwind": {
                        "path": f"${lookup['lookup']['as']}",
                        "preserveNullAndEmptyArrays": True,
                    }
                })

        if sort:
            sort_doc = {}
            for item in sort:
                if isinstance(item, tuple):
                    sort_doc[item[0]] = item[1]
                elif isinstance(item, str):
                    sort_doc[item[1:]] = -1 if item.startswith("-") else 1
            if sort_doc:
                pipeline.append({"$sort": sort_doc})

        if project:
            pipeline.append({"$project": project})

        count_pipeline = [{"$match": filters}, {"$count": "total"}]

        collection = self.model.get_pymongo_collection()

        count_result = await collection.aggregate(count_pipeline).to_list(length=1)
        total = count_result[0]["total"] if count_result else 0
        total_pages = math.ceil(total / limit) if total > 0 else 1

        pipeline.append({"$skip": skip})
        pipeline.append({"$limit": limit})

        cursor = collection.aggregate(pipeline)        
        results = await cursor.to_list(length=limit)

        return {
            "data": [serialize_mongo(doc) for doc in results],
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
    
    async def bulk_update(
    self,
    filters: Dict[str, Any],
    data: Dict[str, Any],
    session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
        
        result = await self.model.find(filters).update(
            {"$set": data}, session=session
        )
        return result.modified_count


    async def bulk_update_by_ids(
    self,
    ids: List[PydanticObjectId],
    data: Dict[str, Any],
    session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
       
        result = await self.model.find(
            {"_id": {"$in": ids}}
        ).update(
            {"$set": data}, session=session
        )
        return result.modified_count


    async def update_with_encryption(
        self,
        user_id: PydanticObjectId,
        data: Dict[str, Any],
        session : Optional[AsyncIOMotorClientSession] = None,
    ):
        user = await self.model.get(user_id, session=session)
        if not user:
            return None


        if "updatedBy" in data and data["updatedBy"]:
            updater = await UserModel.get(
                PydanticObjectId(data["updatedBy"]),
                session=session
            )
            user.updatedBy = updater
            del data["updatedBy"]


        if "userRole" in data:
            roles = []
            for role_id in data["userRole"]:
                role = await UserRoleModel.get(PydanticObjectId(role_id), session=session)
                if role:
                    roles.append(role)
            user.userRole = roles
            del data["userRole"]

        for key, value in data.items():
            setattr(user, key, value)

        await user.save(session=session)
        return user
    

    async def find_many(
        self,
        filters: Dict[str, Any],
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
        sort: Optional[List[str]] = None
    ):
        populate = populate or []
 
        query = self.model.find(filters, session=session)

        if sort:
          query = query.sort(sort)
 
        docs = await query.to_list()
 
        if not docs:
            return []
 
        for doc in docs:
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
 
        return docs


    async def delete_by_id(
        self, id: PydanticObjectId, session: Optional[AsyncIOMotorClientSession] = None
    ):
        user = await self.model.find_one({"_id": id})
        if not user:
            return None

        await user.delete()
        return True


    async def count(
    self,
    filter: Dict[str, Any] = None,
    ) -> int:
        filter = filter or {}
        return await self.model.find(filter).count()