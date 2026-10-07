import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    camp = await db.campaigns.find_one({"name": "C-3"})
    agents = camp.get("agents", [])
    print(f"Agents raw type: {type(agents[0]) if agents else 'none'}")
    print(f"Agents[0]: {agents[0]}")
    print(f"Is dict: {isinstance(agents[0], dict)}")
    if hasattr(agents[0], 'id'):
        print(f"DBRef .id: {agents[0].id}")
    
    # Also check campaign_leads status after distribution
    leads = await db.campaign_leads.find({"campaignId.$id": camp["_id"]}).to_list(5)
    for l in leads:
        print(f"  Status: {l.get('campaignStatus')}, assignedTo: {l.get('assignedTo')}")

if __name__ == "__main__":
    asyncio.run(run())
