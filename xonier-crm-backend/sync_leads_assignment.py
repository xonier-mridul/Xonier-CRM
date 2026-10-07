import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

async def run():
    client = AsyncIOMotorClient("mongodb+srv://mridul:EwLk96USGL8MCghU@cluster0.mif1iug.mongodb.net/?appName=Cluster0")
    db = client.xoniercrm
    
    # Find all assigned campaign_leads that have an assignedTo
    assigned = await db.campaign_leads.find({
        "campaignStatus": "assigned",
        "assignedTo": {"$exists": True, "$ne": None}
    }).to_list(None)
    
    print(f"Total assigned campaign_leads: {len(assigned)}")
    
    bulk_ops = []
    for cl in assigned:
        assigned_to = cl.get("assignedTo")
        lead_ref = cl.get("leadId")
        
        # Extract lead ID
        lead_oid = None
        if hasattr(lead_ref, "id"):
            lead_oid = lead_ref.id
        elif isinstance(lead_ref, dict) and "$id" in lead_ref:
            lead_oid = lead_ref["$id"]
        
        # Extract agent ID
        agent_oid = None
        if hasattr(assigned_to, "id"):
            agent_oid = assigned_to.id
        elif isinstance(assigned_to, dict) and "$id" in assigned_to:
            agent_oid = assigned_to["$id"]
        
        if lead_oid and agent_oid:
            bulk_ops.append(
                UpdateOne(
                    {"_id": lead_oid},
                    {"$addToSet": {
                        "assignedTo": {"$ref": "users", "$id": agent_oid}
                    }}
                )
            )
    
    if bulk_ops:
        result = await db.leads.bulk_write(bulk_ops)
        print(f"Updated {result.modified_count} leads in global leads table")
    else:
        print("No updates needed")

if __name__ == "__main__":
    asyncio.run(run())
