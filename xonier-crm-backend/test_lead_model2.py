import asyncio
from app.db.models.lead_model import LeadsModel
from app.core.security import hash_value

lead_doc_data = {
    "lead_id": "LEAD-1234",
    "fullName": "Test",
    "email": "encrypted",
    "hashedEmail": hash_value("test@a.com"),
    "priority": "medium",
    "source": "referral",
    "status": "new",
    "createdBy": "65bfa22f5c78f8b8e0e6c3d4",
    "leadSource": "bulk_imported"
}

try:
    print("Testing LeadsModel lowercase:")
    model = LeadsModel(**lead_doc_data)
    print("Model passed:", model.status)
except Exception as e:
    print("Model failed:", repr(e))

lead_doc_data["priority"] = "Medium"
lead_doc_data["status"] = "New"

try:
    print("Testing LeadsModel Titlecase:")
    model = LeadsModel(**lead_doc_data)
    print("Model passed:", model.status)
except Exception as e:
    print("Model failed:", repr(e))
