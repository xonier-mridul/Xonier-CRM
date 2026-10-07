import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
from app.db.models.calender_event_model import CalenderEventModel
from app.db.models.activity_model import ActivityModel

async def run():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client.test_db, document_models=[LeadsModel, UserModel, CalenderEventModel, ActivityModel])
    
    lead1 = LeadsModel(lead_id="test-1234", fullName="test", email="enc1", hashedEmail="hash1", createdBy="65bfa22f5c78f8b8e0e6c3d4")
    lead2 = LeadsModel(lead_id="test-5678", fullName="test2", email="enc2", hashedEmail="hash2", createdBy="65bfa22f5c78f8b8e0e6c3d4")
    leads = [lead1, lead2]
    res = await LeadsModel.insert_many(leads)
    print("res type:", type(res))
    print("res dir:", dir(res))
    print(f"Lead 1 ID: {lead1.id}")
    print(f"Lead 2 ID: {lead2.id}")
    if hasattr(res, 'inserted_ids'):
        print("inserted_ids:", res.inserted_ids)
    
    # cleanup
    await LeadsModel.find({"lead_id": {"$in": ["test-1234", "test-5678"]}}).delete()

if __name__ == "__main__":
    asyncio.run(run())
