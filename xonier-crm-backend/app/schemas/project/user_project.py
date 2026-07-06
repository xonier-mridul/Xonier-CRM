
from app.core.lookup_constants import SUBSCRIPTION_LOOKUP, USER_ROLE_LOOKEUP

USER_LOOKUP = [
   {
        "lookup": {
            "from": "subscriptions",
            "localField": "subscription.$id",
            "foreignField": "_id",
            "as": "subscription",
        },
        "unwind": True,
},
   {
        "lookup": {
            "from": "userroles",
            "let": {"roleIds": "$userRole.$id"},
            "pipeline": [
                {"$match": {"$expr": {"$in": ["$_id", "$$roleIds"]}}},
                {
                    "$lookup": {
                        "from": "permissions",
                        "let": {"permRefs": "$permissions"},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$in": [
                                            "$_id",
                                            {
                                                "$map": {
                                                    "input": "$$permRefs",
                                                    "as": "ref",
                                                    "in": {
                                        "$cond": {
                                            "if": {"$eq": [{"$type": "$$ref"}, "objectId"]},
                                            "then": "$$ref",           # plain ObjectId
                                            "else": "$$ref.$id"        # DBRef object
                                        }
                                    }
                                                }
                                            },
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "permissions",
                    }
                },
            ],
            "as": "userRole",
        },
        "unwind": False,
    },
]





USER_GET_ME_PROJECT = {
    "_id": 1,
    "companyId": 1,
    "firstName": 1,
    "lastName": 1,
    "email": 1,
    "phone": 1,
    "isEmailVerified": 1,
    "status": 1,
    "isActive": 1,
    "lastLogin": 1,
    "subscription._id": 1,
    "subscription.subscriptionId": 1,
    "subscription.billingCycle": 1,
    "subscription.basePrice": 1,
    "subscription.discountAmount": 1,
    "subscription.finalPrice": 1,
    "subscription.status": 1,
    "subscription.startSubscriptionDate": 1,
    "subscription.endSubscriptionDate": 1,
    "subscription.trialStartDate": 1,
    "subscription.trialEndDate": 1,
    "userRole._id": 1,
    "userRole.name": 1,
    "userRole.code": 1,
    "userRole.power": 1,
    "userRole.canManageBelow": 1,
    "userRole.status": 1,
    "userRole.permissions._id": 1,
    "userRole.permissions.code": 1,
    "userRole.permissions.title": 1,
    # "userRole.permissions.module": 1,
}

USER_GET_RATING_PROJECT = {
    "_id": 1,
    "companyId": 1,
    "firstName": 1,
    "lastName": 1,
    "email": 1,
    "phone": 1,
    "isEmailVerified": 1,
    "status": 1,
    "isActive": 1,
    "lastLogin": 1,
    "userRole._id": 1,
    "userRole.name": 1,
    "userRole.code": 1,
    "userRole.power": 1,
    "userRole.canManageBelow": 1,
    "userRole.status": 1,
    # "userRole.permissions._id": 1,
    # "userRole.permissions.code": 1,
    # "userRole.permissions.title": 1,
    # "userRole.permissions.module": 1,
    
}
