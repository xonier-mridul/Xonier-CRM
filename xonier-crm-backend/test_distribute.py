import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    # Find all campaigns
    campaigns = await db.campaigns.find().to_list(10)
    for c in campaigns:
        print(f"Campaign: {c.get('name')} | id: {c['_id']} | agents: {len(c.get('agents', []))}")
    
    # Find unassigned campaign leads
    unassigned = await db.campaign_leads.find({"campaignStatus": "unassigned"}).to_list(100)
    print(f"\nUnassigned campaign leads: {len(unassigned)}")
    
    # Check what a campaign doc agents field looks like
    if campaigns:
        c = campaigns[0]
        print(f"\nAgents field raw: {c.get('agents', [])}")

if __name__ == "__main__":
    asyncio.run(run())
