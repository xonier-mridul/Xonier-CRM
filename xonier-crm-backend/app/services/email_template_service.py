
import re
from typing import Dict, Any, List, Optional
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from jinja2 import Environment, BaseLoader, TemplateSyntaxError
from datetime import datetime, timezone
from app.db.models.communications.email_history_model import EmailHistoryModel

from app.repositories.email_template_repository import EmailTemplateRepository
from app.db.models.email_template_model import TemplateStatus
from app.utils.custom_exception import AppException


class EmailTemplateService:
    def __init__(self):
        self.repo = EmailTemplateRepository()
        self.jinja_env = Environment(loader=BaseLoader())

    
    async def create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            
            existing = await self.repo.find_by_name(payload["name"])
            if existing:
                raise AppException(400, "Template with this name already exists")

            
            self._validate_syntax(payload["html_body"])
            self._validate_syntax(payload["subject"])

            # Auto extract variables if not provided
            if not payload.get("variables"):
                extracted = self._extract_variables(payload["html_body"])
                payload["variables"] = [
                    {
                        "key": var,
                        "label": var.replace("_", " ").title(),
                        "is_required": False
                    }
                    for var in extracted
                ]

            # Auto generate slug
            payload["slug"] = self._generate_slug(payload["name"])
            payload["created_by"] = PydanticObjectId(user["_id"])

            template = await self.repo.create(payload)
            if not template:
                raise AppException(400, "Failed to create template")

            return jsonable_encoder(template)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            query: Dict[str, Any] = {"deleted_at": None}

            
            query["$or"] = [
                {"is_global": True},
                {"created_by.$id": PydanticObjectId(user["_id"])}
            ]

            if "status" in filters:
                query["status"] = filters["status"]

            if "category" in filters:
                query["category"] = filters["category"]

            if "search" in filters:
                search = re.escape(filters["search"])
                query["$or"] = [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"tags": {"$regex": search, "$options": "i"}},
                ]

            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["created_by", "updated_by"],
                sort=["-created_at"]
            )

            if not result:
                raise AppException(404, "No templates found")

            return jsonable_encoder(result)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

   
    async def get_by_id(self, id: str, user: Dict[str, Any]):
        try:
            query = {
                "_id": PydanticObjectId(id),
                "deleted_at": None,
                "$or": [
                    {"is_global": True},
                    {"created_by.$id": PydanticObjectId(user["_id"])}
                ]
            }

            template = await self.repo.find_one(
                filter=query,
                populate=["created_by", "updated_by"]
            )

            if not template:
                raise AppException(404, "Template not found or access denied")

            return jsonable_encoder(template)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

   
    async def update(self, id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            
            existing = await self.repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "deleted_at": None,
                    "created_by.$id": PydanticObjectId(user["_id"])
                }
            )

            if not existing:
                raise AppException(404, "Template not found or access denied")

           
            if "html_body" in payload:
                self._validate_syntax(payload["html_body"])

            if "subject" in payload:
                self._validate_syntax(payload["subject"])

            
            if "name" in payload:
               
                name_exists = await self.repo.find_by_name(payload["name"])
                if name_exists and str(name_exists.id) != id:
                    raise AppException(400, "Template with this name already exists")
                payload["slug"] = self._generate_slug(payload["name"])

            payload["updated_by"] = PydanticObjectId(user["_id"])
            payload["updated_at"] = datetime.now(timezone.utc)

            updated = await self.repo.update(
                id=PydanticObjectId(id),
                data=payload
            )

            if not updated:
                raise AppException(400, "Failed to update template")

            return jsonable_encoder(updated)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
    async def soft_delete(self, id: str, user: Dict[str, Any]):
        try:
            existing = await self.repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "deleted_at": None,
                    "created_by.$id": PydanticObjectId(user["_id"])
                }
            )

            if not existing:
                raise AppException(404, "Template not found or access denied")

            deleted = await self.repo.update(
                id=PydanticObjectId(id),
                data={
                    "deleted_at": datetime.now(timezone.utc),
                    "deleted_by": PydanticObjectId(user["_id"]),
                    "status": TemplateStatus.ARCHIVED
                }
            )

            if not deleted:
                raise AppException(400, "Failed to delete template")

            return {"message": "Template deleted successfully"}

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

   
    async def render_preview(self, id: str, variables: Dict[str, Any], user: Dict[str, Any]):
        try:
            template = await self.get_by_id(id, user)

            rendered_subject = self._render(template["subject"], variables)
            rendered_html = self._render(template["html_body"], variables)
            rendered_text = self._render(template["text_body"], variables) if template.get("text_body") else None

            return {
                "subject": rendered_subject,
                "html_body": rendered_html,
                "text_body": rendered_text,
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")
        

   
    async def bulk_delete(self, ids: List[str], user: Dict[str, Any]):
        try:
            object_ids = [PydanticObjectId(id) for id in ids]

            
            templates = await self.repo.find(
                {
                    "_id": {"$in": object_ids},
                    "deleted_at": None,
                    "created_by.$id": PydanticObjectId(user["_id"])
                }
            ).to_list()

            if not templates:
                raise AppException(404, "No templates found or access denied")

            found_ids = [template.id for template in templates]
            not_found_ids = [id for id in ids if PydanticObjectId(id) not in found_ids]

            
            await self.repo.find(
                {"_id": {"$in": found_ids}}
            ).update(
                {
                    "$set": {
                        "deleted_at": datetime.now(timezone.utc),
                        "deleted_by": PydanticObjectId(user["_id"]),
                        "status": TemplateStatus.ARCHIVED,
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )

            return {
                "deleted_count": len(found_ids),
                "deleted_ids": [str(id) for id in found_ids],
                
                "skipped_ids": not_found_ids,
                "skipped_count": len(not_found_ids)
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
    def _render(self, template_str: str, variables: Dict[str, Any]) -> str:
        template = self.jinja_env.from_string(template_str)
        return template.render(**variables)

    def _validate_syntax(self, template_str: str):
        try:
            self.jinja_env.parse(template_str)
        except TemplateSyntaxError as e:
            raise AppException(400, f"Invalid template syntax: {str(e)}")

    def _extract_variables(self, template_str: str) -> List[str]:
        pattern = r"\{\{\s*(\w+)\s*\}\}"
        return list(set(re.findall(pattern, template_str)))

    def _generate_slug(self, name: str) -> str:
        slug = name.lower().strip()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_-]+", "-", slug)
        return slug
    

