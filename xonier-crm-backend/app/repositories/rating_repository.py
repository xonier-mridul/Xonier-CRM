from app.repositories.base_repository import BaseRepository
from app.db.models.task_model import TaskModel
from bson import ObjectId


class RatingRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskModel)

    async def _run_aggregate(self, pipeline: list):
        cursor = self.model.get_pymongo_collection().aggregate(pipeline)
        return await cursor.to_list(length=None)

    async def get_all_user_ratings(self, companyId: str):
        pipeline = [
            {"$match": {"completedAt": {"$ne": None}, "rating": {"$ne": None}}},
            {"$unwind": "$assignedTo"},
            {
                "$group": {
                    "_id": "$assignedTo.$id",
                    "avgRating": {"$avg": "$rating"},
                    "totalReviews": {"$sum": 1},
                    "lastRated": {"$max": "$completedAt"},
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "user",
                }
            },
            {"$unwind": "$user"},
            {"$match": {"user.companyId": ObjectId(companyId)}},
            {
                "$lookup": {
                    "from": "userroles",
                    "localField": "user.userRole.$id",
                    "foreignField": "_id",
                    "as": "roles",
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "userId": "$_id",
                    "firstName": "$user.firstName",
                    "lastName": "$user.lastName",
                    "email": "$user.email",
                    "hashedEmail": "$user.hashedEmail",
                    "roles": "$roles.name",
                    "designation": "$user.designation",  
                    "department": "$user.department",     
                    "rating": "$avgRating",
                    "reviews": "$totalReviews",
                    "lastRated": "$lastRated",
                }
            },
        ]

        return await self._run_aggregate(pipeline)