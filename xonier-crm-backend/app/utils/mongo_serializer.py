
from bson import ObjectId
from datetime import datetime
from typing import Any


def serialize_mongo(obj: Any) -> Any:
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        result = {k: serialize_mongo(v) for k, v in obj.items()}
        if "_id" in result:
            result["id"] = result.pop("_id")
        return result
    if isinstance(obj, list):
        return [serialize_mongo(i) for i in obj]
    return obj