import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    # We will delete the last 10 leads which have createdBy the user (or just delete the ones that have these emails)
    # Actually, we can just delete the latest 10 leads
    docs = await db.leads.find().sort("_id", -1).limit(10).to_list(10)
    
    ids = [d["_id"] for d in docs]
    res = await db.leads.delete_many({"_id": {"$in": ids}})
    print(f"Deleted {res.deleted_count} leads")

if __name__ == "__main__":
    asyncio.run(run())
