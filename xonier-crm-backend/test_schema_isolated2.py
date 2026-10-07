from app.db.models.lead_model import LeadsModel
from app.core.security import hash_value

try:
    lead_doc_data = {
        "lead_id": "LEAD-1234",
        "fullName": "Ojasvi",
        "email": "enc",
        "hashedEmail": hash_value("a@a.com"),
        "priority": "medium",
        "source": "Referral",
        "status": "New", 
        "createdBy": "65bfa22f5c78f8b8e0e6c3d4",
        "leadSource": "bulk_imported"
    }
    LeadsModel(**lead_doc_data)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {repr(e)}")
