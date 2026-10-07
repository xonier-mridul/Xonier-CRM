from app.schemas.lead_schema import LeadsCreateSchema

lead = {
    "fullName": "Ojasvi Borra",
    "email": "abeerkhare@sarris.com",
    "phone": "9559447224",
    "companyName": "Nath PLC",
    "source": "Referral",
    "status": "New",
    "city": "Pune"
}

raw_priority = str(lead.get("priority") or "medium").strip().lower()
raw_source = str(lead.get("source") or "other").strip().lower().replace(" ", "_")
raw_status = str(lead.get("status") or "new").strip().lower().replace(" ", "_")
raw_project_type = lead.get("projectType")
if raw_project_type:
    raw_project_type = str(raw_project_type).strip().lower().replace(" ", "_")

lead_for_validation = {
    **lead,
    "priority": raw_priority,
    "source": raw_source,
    "status": raw_status,
    "projectType": raw_project_type,
    "meetingScheduled": lead.get("meetingScheduled") or "no",
}

try:
    LeadsCreateSchema(**lead_for_validation)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {repr(e)}")
