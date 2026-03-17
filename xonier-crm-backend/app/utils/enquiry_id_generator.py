from datetime import datetime, timezone
import uuid

def generate_enquiry_id(prefix: str = "ENQ") -> str:
    now = datetime.now(timezone.utc)
    timestamp = int(now.timestamp() * 1000)  
    random_part = uuid.uuid4().hex[:6]

    return f"{prefix}{now.month}-{now.year}-{timestamp}-{random_part}"
