import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    count = await db.leads.count_documents({})
    print(f"Total leads: {count}")
    
    docs = await db.leads.find().to_list(100)
    for d in docs[-10:]:
        print(d.get("email"), d.get("fullName"))

if __name__ == "__main__":
    asyncio.run(run())
