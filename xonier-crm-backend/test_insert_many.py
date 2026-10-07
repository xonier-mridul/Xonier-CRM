import asyncio
from app.db.models.lead_model import LeadsModel
from app.db.db import init_db
from app.core.config import settings

async def run():
    await init_db()
    lead1 = LeadsModel(lead_id="test-1234", fullName="test", email="enc1", hashedEmail="hash1", createdBy="65bfa22f5c78f8b8e0e6c3d4")
    lead2 = LeadsModel(lead_id="test-5678", fullName="test2", email="enc2", hashedEmail="hash2", createdBy="65bfa22f5c78f8b8e0e6c3d4")
    leads = [lead1, lead2]
    await LeadsModel.insert_many(leads)
    print(f"Lead 1 ID: {lead1.id}")
    print(f"Lead 2 ID: {lead2.id}")
    
    # cleanup
    await LeadsModel.find({"lead_id": {"$in": ["test-1234", "test-5678"]}}).delete()

if __name__ == "__main__":
    asyncio.run(run())
