from datetime import datetime, timezone
import re
import uuid
from typing import List


def generate_enquiry_id(prefix: str = "ENQ") -> str:
    now = datetime.now(timezone.utc)
    timestamp = int(now.timestamp() * 1000)  
    random_part = uuid.uuid4().hex[:6]

    return f"{prefix}{now.month}-{now.year}-{timestamp}-{random_part}"


def get_lead_year_span(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    start_yy = now.year % 100
    end_yy = (now.year + 1) % 100
    return f"{start_yy:02d}-{end_yy:02d}"


async def generate_lead_ids(count: int = 1, session=None) -> List[str]:
    if count <= 0:
        return []

    from app.db.models.lead_model import LeadsModel

    year_span = get_lead_year_span()
    prefix = f"LD|{year_span}|"
    pattern = re.compile(rf"^LD\|{re.escape(year_span)}\|(\d+)$")

    collection = LeadsModel.get_pymongo_collection()
    cursor = collection.find(
        {"lead_id": {"$regex": rf"^LD\|{re.escape(year_span)}\|\d+$"}},
        {"lead_id": 1, "_id": 0},
        session=session,
    )
    docs = await cursor.to_list(length=None)

    max_seq = 0
    for doc in docs:
        lid = doc.get("lead_id") or ""
        match = pattern.match(lid)
        if match:
            seq = int(match.group(1))
            if seq > max_seq:
                max_seq = seq

    return [f"{prefix}{max_seq + i:04d}" for i in range(1, count + 1)]


async def generate_lead_id(session=None) -> str:
    ids = await generate_lead_ids(count=1, session=session)
    return ids[0]

