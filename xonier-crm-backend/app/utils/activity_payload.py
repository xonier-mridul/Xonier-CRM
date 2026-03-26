from beanie import PydanticObjectId
from typing import Optional, Dict
def activity_payload(userId: PydanticObjectId, entityType: str,  action: str, title: str, metadata: Optional[Dict] = None, description: Optional[str] = None, entityId: Optional[PydanticObjectId] = None, perform: int = 1, ipAddress:Optional[str] = None, userAgent: Optional[str] = None ):
    return {
         "userId": userId,
         "entityType": entityType,
          "entityId": entityId,

          "perform": perform,

          "action": action,
          "title": title,                   
          "description": description,
          "ipAddress": ipAddress,
          "userAgent": userAgent,

          "metadata": metadata


    }