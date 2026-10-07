import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    # Let's get the companyId for any campaign first
    camp = await db.campaigns.find_one()
    if not camp:
        print("No campaigns found")
        return
        
    company_id = camp.get("companyId")
    
    # Get campaign IDs
    campaigns = await db.campaigns.find(
        {"companyId": company_id, "status": {"$ne": "deleted"}},
        {"_id": 1}
    ).to_list(length=None)
    campaign_ids = [c["_id"] for c in campaigns]
    print(f"Found {len(campaign_ids)} non-deleted campaigns")
    
    if not campaign_ids:
        return
        
    # Check campaign leads
    cl_count = await db.campaign_leads.count_documents({"campaignId.$id": {"$in": campaign_ids}})
    print(f"Found {cl_count} campaign_leads for these campaigns")
    
    # Run the pipeline
    pipeline = [
        {"$match": {"campaignId.$id": {"$in": campaign_ids}}},
        {
            "$addFields": {
                "leadOid": {"$ifNull": ["$leadId.$id", "$leadId"]}
            }
        },
        {"$lookup": {
            "from": "leads",
            "localField": "leadOid",
            "foreignField": "_id",
            "as": "lead",
        }},
        {"$unwind": "$lead"},
        {"$group": {
            "_id": "$lead.connectStatus",
            "count": {"$sum": 1},
        }},
        {"$project": {
            "_id": 0,
            "status": {"$ifNull": ["$_id", "not_reached"]},
            "count": 1,
        }},
        {"$sort": {"count": -1}},
    ]
    
    result = await db.campaign_leads.aggregate(pipeline).to_list(length=None)
    print("Pipeline result:", result)

if __name__ == "__main__":
    asyncio.run(run())
