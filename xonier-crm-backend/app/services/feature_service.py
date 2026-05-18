from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.feature_repository import FeatureRepository
from app.core.enums import FEATURE_STATUS


class FeatureService:
    def __init__(self):
        self.repo = FeatureRepository()

    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
  
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            query = {}

            
            if filters.get("search") and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}
                query["$or"] = [
                    {"name": regex_data},
                    {"feature_key": regex_data},
                ]

           
            if filters.get("status") and filters["status"].strip():
                valid_statuses = [s.value for s in FEATURE_STATUS]
                if filters["status"].strip() not in valid_statuses:
                    raise AppException(
                        422,
                        f"Invalid status. Allowed values are: {', '.join(valid_statuses)}"
                    )
                if filters["status"].strip() == FEATURE_STATUS.DELETED.value:
                    raise AppException(422, "Cannot filter by deleted status")

                query["status"] = filters["status"].strip()

            
            if "status" not in query:
                query["status"] = {"$ne": FEATURE_STATUS.DELETED.value}

            
            if filters.get("system") is not None:
                raw = filters["system"]
                if isinstance(raw, str):
                    if raw.lower() == "true":
                        query["system"] = True
                    elif raw.lower() == "false":
                        query["system"] = False
                elif isinstance(raw, bool):
                    query["system"] = raw

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                sort=[("createdAt", -1)],
            )

            return result

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")