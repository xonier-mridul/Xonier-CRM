import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
from app.db.models.calender_event_model import CalenderEventModel
from app.db.models.activity_model import ActivityModel
from app.core.config import settings

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client.xonier_crm_db, document_models=[LeadsModel, UserModel, CalenderEventModel, ActivityModel])
    
    count = await LeadsModel.find().count()
    print(f"Total leads in DB: {count}")
    
    docs = await LeadsModel.find().to_list()
    for doc in docs:
        print(doc.email)

if __name__ == "__main__":
    asyncio.run(run())
