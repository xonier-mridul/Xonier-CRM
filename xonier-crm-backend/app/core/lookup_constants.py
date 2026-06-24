SUBSCRIPTION_LOOKUP = {
        "lookup": {
            "from": "subscriptions",
            "localField": "subscription.$id",
            "foreignField": "_id",
            "as": "subscription",
        },
        "unwind": True,
}


USER_ROLE_LOOKEUP = {
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
                                                        "$toObjectId": {
                                                            "$toString": "$$ref"
                                                        }
                                                    },
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
    }