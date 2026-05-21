TASK_BOARD_LOOKUPS = [
    {
        "lookup": {
            "from": "task_categories",
            "localField": "category.$id",
            "foreignField": "_id",
            "as": "category",
        },
        "unwind": True,   
    },
    {
        "lookup": {
            "from": "task_statuses",
            "localField": "status.$id",
            "foreignField": "_id",
            "as": "status",
        },
        "unwind": True,   
    },
    {
        "lookup": {
            "from": "users",
            "localField": "assignedTo.$id",
            "foreignField": "_id",
            "as": "assignedTo",
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
]

TASK_BOARD_PROJECT = {
    "_id": 1,
    "task_id": 1,
    "title": 1,
    "description": 1,
    "priority": 1,
    "dueDate": 1,
    "completedAt": 1,
    "tags": 1,
    "rating": 1,
    "actualHours": 1,
    "order": 1,
    "isOverdue": 1,
    "createdAt": 1,
    "parentTask": 1,

    "category._id": 1,
    "category.name": 1,
    "category.color": 1,
    "category.icon": 1,

    "status._id": 1,
    "status.name": 1,
    "status.color": 1,
    "status.icon": 1,
    "status.isFinal": 1,

    "assignedTo._id": 1,
    "assignedTo.firstName": 1,
    "assignedTo.lastName": 1,

    "createdBy._id": 1,
    "createdBy.firstName": 1,
    "createdBy.lastName": 1,
}