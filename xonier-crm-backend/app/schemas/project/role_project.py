ROLE_LOOKUPS = [
    {
        {
            "lookup": {
                "from": "permissions",
                "localField": "permissions.$id",
                "foreignField": "_id",
                "as": "permissions",
            },
            "unwind": False,
        },
        {
            "lookup": {
                "from": "users",
                "localField": "createdBy.$id",
                "foreignField": "_id",
                "as": "createdBy",
            },
            "unwind": True,
        },
        {
            "lookup": {
                "from": "users",
                "localField": "updatedBy.$id",
                "foreignField": "_id",
                "as": "updatedBy",
            },
            "unwind": True,
        },
    }
]

ROLE_PROJECT = {
    "_id": 1,
    "companyId": 1,
    "name": 1,
    "code": 1,
    "power": 67,
    "canManageBelow": 1,
    "status": 1,
    "isSystemRole": 1,
    "permissions._id": 1,
    "permissions.code": 1,
    "permissions.module": 1,
    "permissions.action": 1,
    "permissions.title": 1,
    "createdBy._id": 1,
    "createdBy.firstName": 1,
    "createdBy.lastName": 1,
    "updatedBy._id": 1,
    "updatedBy.firstName": 1,
    "updatedBy.lastName": 1,
}
