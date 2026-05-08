from beanie import Document, Link
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Literal, List
from pymongo import IndexModel
from app.core.enums import FEATURE_STATUS
from datetime import datetime, timezone
from app.db.models.user_model import UserModel



class FeatureModel(Document):
    name: str
    sortDescription: str
    description: str
    feature_key: str
    status: FEATURE_STATUS = FEATURE_STATUS.ACTIVE.value
    system: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    


    class Settings:
        name = "features"
        indexes = [
            IndexModel([("feature_key", 1)], unique=True, name="unique_feature_key")
        ]



