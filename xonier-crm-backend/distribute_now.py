import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.db.models.campaign_model import CampaignModel
from app.db.models.lead_model import LeadsModel
from app.db.models.campaign_lead_model import CampaignLeadModel
from app.db.models.user_model import UserModel
from app.db.models.calender_event_model import CalenderEventModel
from app.db.models.activity_model import ActivityModel
from app.services.campaign_service import CampaignService

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    await init_beanie(database=client.xoniercrm, document_models=[CampaignModel, LeadsModel, CampaignLeadModel, UserModel, CalenderEventModel, ActivityModel])
    
    svc = CampaignService()
    # Find the latest campaign
    camp = await CampaignModel.find().sort("-createdAt").first_or_none()
    if camp:
        res = await svc.distribute_equal(str(camp.id), {"_id": "65bfa22f5c78f8b8e0e6c3d4", "name": "admin"})
        print(f"Distributed leads: {res}")
    else:
        print("No campaign found")

if __name__ == "__main__":
    asyncio.run(run())
