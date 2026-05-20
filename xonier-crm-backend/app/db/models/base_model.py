

from contextvars import ContextVar
from beanie import Document, PydanticObjectId, Link

from bson import ObjectId, DBRef
from typing import Optional,  List
from pydantic import Field
from app.core.tenant import current_company, is_admin_context, bypass_scope
from app.utils.custom_exception import AppException



class BaseDocument(Document):
    companyId: Optional[PydanticObjectId] = Field(default=None)
    
    @classmethod
    def _is_admin(cls) -> bool:
        return is_admin_context.get()

    @classmethod
    def _get_company_id(cls) -> Optional[ObjectId]:
        cid = current_company.get()
        return ObjectId(cid) if cid else None

    @classmethod
    def _inject_scope(cls, user_filter: dict = {}) -> dict:
        
        if bypass_scope.get():
            return user_filter

        if cls._is_admin():
            return user_filter


        cid = cls._get_company_id()

        if cid is None:
            raise AppException(403, "Company context missing")
     
        return {"companyId": PydanticObjectId(cid), **user_filter}

    @classmethod
    def _resolve_filter(cls, args: tuple) -> dict:
        if not args:
            return {}
        f = args[0]
        return f if isinstance(f, dict) else {}
    

    @classmethod
    def find(cls, *args, **kwargs):
        resolved = cls._resolve_filter(args)
        scoped = cls._inject_scope(resolved)
        remaining_args = args[1:] if args else ()
      
        return super().find(scoped, *remaining_args, **kwargs)
    

    @classmethod
    def find_one(cls, *args, **kwargs):

        resolved = cls._resolve_filter(args)
        scoped = cls._inject_scope(resolved)
        remaining_args = args[1:] if args else ()
      
        return super().find_one(scoped, *remaining_args, **kwargs)
    

    @classmethod
    async def get(cls, document_id: PydanticObjectId, *args, **kwargs):
        return await super().find_one(
            cls._inject_scope({"_id": ObjectId(document_id)}),
            *args,
            **kwargs,
        )


    async def insert(self, *args, **kwargs):
        
        if not self._is_admin() and not bypass_scope.get():
            cid = self._get_company_id()
            if cid is None:
                raise AppException(403, "Company context missing on insert")
            self.companyId = cid
        return await super().insert(*args, **kwargs)

    @classmethod
    async def insert_many(cls, documents: List, *args, **kwargs):
        
        if not cls._is_admin() and not bypass_scope.get():
            cid = cls._get_company_id()
            if cid is None:
                raise AppException(403, "Company context missing on bulk insert")
            for doc in documents:
                if isinstance(doc, cls) and doc.companyId is None:
                    doc.companyId = PydanticObjectId(cid)
        return await super().insert_many(documents, *args, **kwargs)
    
    async def save(self, *args, **kwargs):
        if not self._is_admin() and not bypass_scope.get() and self.companyId is None:
            cid = self._get_company_id()
            if cid:
                self.companyId = cid
        return await super().save(*args, **kwargs)

    class Settings:
        use_state_management = True