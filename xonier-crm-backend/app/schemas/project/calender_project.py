CALENDER_LOOKUPS = [
  
  
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
    }
]

CALENDER_PROJECT = {
    "_id": 1,
    "companyId": 1,
    "title": 1,
    "description": 1,
"eventType": 1,
"start": 1,
"end":1,
"isAllDay":1,
"meetingLink": 1,
"priority": 1,
"createdAt": 1,
"updatedAt": 1,
    "createdBy._id": 1,
    "createdBy.firstName": 1,
    "createdBy.lastName": 1,
    "updatedBy._id": 1,
    "updatedBy.firstName": 1,
    "updatedBy.lastName": 1,
}