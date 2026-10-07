import asyncio
from app.db.models.lead_model import LeadsModel
from app.schemas.lead_schema import LeadsCreateSchema
from app.core.enums import PRIORITY

lead_data = {
    "fullName": "Ojasvi Borra",
    "email": "abeer@example.com",
    "phone": "9559447224",
    "priority": "Medium",
    "source": "Referral",
    "status": "New",
    "projectType": ""
}

try:
    print("Testing LeadsCreateSchema:")
    lead_for_validation = {
        "priority": lead_data.get("priority") or "medium",
        "meetingScheduled": lead_data.get("meetingScheduled") or "no",
        **lead_data,
    }
    schema = LeadsCreateSchema(**lead_for_validation)
    print("Schema passed:", schema)
except Exception as e:
    print("Schema failed:", repr(e))

print("---")
from app.core.security import hash_value
hashed_email = hash_value(lead_data["email"])
lead_doc_data = {
    "lead_id": "LEAD-1234",
    "fullName": lead_data["fullName"],
    "email": "encrypted",
    "hashedEmail": hashed_email,
    "priority": lead_data.get("priority") or "medium",
    "source": lead_data.get("source") or "other",
    "status": lead_data.get("status") or "new",
    "createdBy": "65bfa22f5c78f8b8e0e6c3d4",
    "leadSource": "bulk_imported"
}
try:
    print("Testing LeadsModel:")
    model = LeadsModel(**lead_doc_data)
    print("Model passed:", model)
except Exception as e:
    print("Model failed:", repr(e))

