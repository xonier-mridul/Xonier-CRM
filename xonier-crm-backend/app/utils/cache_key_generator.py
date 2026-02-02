import hashlib
import json
from typing import Dict,Any

def cache_key_generator(prefix: str, filters: Dict[str, Any], page: int, limit: int):

    raw = {
        "filters": filters,
        "page": page,
        "limit": limit
    }

    data = json.dumps(raw, sort_keys=True)
    hashed = hashlib.sha256(data.encode()).hexdigest()

    return f"{prefix}:{hashed}"


def cache_key_generator_with_id(prefix: str, filters: Dict[str, Any], page: int, limit: int, userId: str):

    raw = {
        "filters": filters,
        "page": page,
        "limit": limit,
        "userId": userId
    }

    data = json.dumps(raw, sort_keys=True)
    hashed = hashlib.sha256(data.encode()).hexdigest()

    return f"{prefix}:{hashed}"



def cache_key_generator_by_id(prefix: str, id: str):
    
    hash = hashlib.sha256(id.encode()).hexdigest()

    return f"{prefix}:{hash}"
