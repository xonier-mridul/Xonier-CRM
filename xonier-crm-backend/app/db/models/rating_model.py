from beanie import Document,PydanticObjectId
from typing import Optional
from datetime import datetime
from pydantic import Field

class RatingModel(Document):
    ratedUserId: PydanticObjectId
    ratedId:Optional[PydanticObjectId]= None
    taskId:Optional[PydanticObjectId]=None
    rating:float = Field(..., ge=1, le=5)
    createdAt: datetime= Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "ratings"