RATING_LOOKUP =[
   
                # only completed tasks that actually have a rating
                {"$match": {"completedAt": {"$ne": None}, "rating": {"$ne": None}}},
    
                # assignedTo is a Link array -> unwind to get one doc per assignee
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
    
                # scope to company
                {"$match": {"user.companyId": ObjectId(companyId)}},
    
                # userRole is also a Link array -> "$id" lookup pattern (same as find_by_role)
                {
                    "$lookup": {
                        "from": "roles",
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
                        "email": "$user.email",          # still encrypted at this point
                        "roles": "$roles.name",           # ⚠️ confirm role field is "name"
                        "rating": "$avgRating",
                        "reviews": "$totalReviews",
                        "lastRated": "$lastRated",
                    }
                },
            
    
    
]