from datetime import datetime, timezone
import uuid

def generate_enquiry_id(prefix: str = "ENQ") -> str:

    year = datetime.now(timezone.utc).year
    unique_part = uuid.uuid4().int % 1_000_000 
    return f"{prefix}-{year}-{unique_part:06d}"
