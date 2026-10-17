from collections import Counter

from beanie import PydanticObjectId

from app.core.crypto import Encryption
from app.db.models.campaign_model import CampaignModel
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel


class AgentService:
    async def get_breakdown(self, user):
        company_id = PydanticObjectId(user["companyId"])
        scope = {"companyId": company_id, "deletedAt": None}
        campaigns = await CampaignModel.get_pymongo_collection().find(
            {**scope, "status": {"$ne": "deleted"}}, {"agents": 1}
        ).to_list(length=None)
        campaign_counts = Counter()
        for campaign in campaigns:
            ids = {str(getattr(ref, "id", ref)) for ref in campaign.get("agents", [])}
            campaign_counts.update(ids)

        pipeline = [
            {"$match": scope},
            {"$unwind": "$assignedTo"},
            {"$addFields": {"agentId": {"$ifNull": ["$assignedTo.$id", "$assignedTo"]}}},
            # Count each lead once per agent, including legacy duplicate assignments.
            {"$group": {"_id": {"agent": "$agentId", "lead": "$_id"},
                        "contact": {"$first": "$connectStatus"},
                        "meeting": {"$first": "$meetingScheduled"}}},
            {"$group": {
                "_id": "$_id.agent",
                "totalLeads": {"$sum": 1},
                **{name: {"$sum": {"$cond": [
                    {"$eq": ["$contact", status]}, 1, 0
                ]}} for name, status in {
                    "notReached": "not_reached", "connected": "connected",
                    "interested": "interested", "callBack": "call_back",
                    "notInterested": "not_interested",
                }.items()},
                "meetings": {"$sum": {"$cond": [{"$or": [
                    {"$eq": ["$meeting", "yes"]},
                    {"$eq": ["$contact", "meeting_scheduled"]}
                ]}, 1, 0]}},
            }},
        ]
        stats = await LeadsModel.get_pymongo_collection().aggregate(pipeline).to_list(length=None)
        by_agent = {str(item.pop("_id")): item for item in stats}
        agent_ids = set(campaign_counts) | set(by_agent)
        users = await UserModel.get_pymongo_collection().find(
            {**scope, "status": {"$ne": "deleted"},
             "_id": {"$in": [PydanticObjectId(uid) for uid in agent_ids]}},
            {"firstName": 1, "lastName": 1, "email": 1, "phone": 1, "status": 1},
        ).sort([("firstName", 1), ("lastName", 1)]).to_list(length=None)
        encryption = Encryption()
        rows = []
        for agent in users:
            uid = str(agent.pop("_id"))
            for field in ("email", "phone"):
                if agent.get(field):
                    agent[field] = encryption.decrypt_data(agent[field])
            rows.append({**agent, "id": uid, "campaigns": campaign_counts[uid],
                         **{key: 0 for key in ("totalLeads", "notReached", "connected",
                                               "interested", "callBack", "notInterested", "meetings")},
                         **by_agent.get(uid, {})})
        return {"agents": rows}
