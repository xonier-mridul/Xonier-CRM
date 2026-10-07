import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
from datetime import datetime, timezone

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    # Find all campaigns with agents
    campaigns = await db.campaigns.find({"agents": {"$exists": True, "$ne": []}}).to_list(10)
    
    total_distributed = 0
    for camp in campaigns:
        camp_id = camp["_id"]
        agent_refs = camp.get("agents", [])
        if not agent_refs:
            continue
        
        agent_ids = [ref.id for ref in agent_refs]  # DBRef objects
        
        unassigned = await db.campaign_leads.find({
            "campaignId.$id": camp_id,
            "campaignStatus": "unassigned"
        }).sort("importedAt", 1).to_list(None)
        
        if not unassigned:
            print(f"Campaign {camp.get('name')}: No unassigned leads")
            continue
        
        print(f"Campaign {camp.get('name')}: {len(unassigned)} unassigned leads, {len(agent_ids)} agents")
        
        now = datetime.now(timezone.utc)
        num_agents = len(agent_ids)
        bulk_ops = []
        
        for idx, cl_doc in enumerate(unassigned):
            agent_id = agent_ids[idx % num_agents]
            bulk_ops.append(
                UpdateOne(
                    {"_id": cl_doc["_id"]},
                    {"$set": {
                        "assignedTo": {"$ref": "users", "$id": agent_id},
                        "assignedAt": now,
                        "campaignStatus": "assigned",
                        "updatedAt": now,
                    }}
                )
            )
        
        if bulk_ops:
            result = await db.campaign_leads.bulk_write(bulk_ops)
            print(f"  -> Distributed {result.modified_count} leads")
            total_distributed += result.modified_count
            
            # Update campaign assigned count
            await db.campaigns.update_one(
                {"_id": camp_id},
                {"$set": {"assignedLeads": result.modified_count}}
            )
    
    print(f"\nTotal distributed: {total_distributed}")

if __name__ == "__main__":
    asyncio.run(run())
