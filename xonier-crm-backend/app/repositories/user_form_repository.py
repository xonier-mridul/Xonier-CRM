from app.repositories.base_repository import BaseRepository
from app.db.models.user_form_model import UserFormModel
from beanie import BeanieObjectId, PydanticObjectId
from typing import List, Optional

class UserFormRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserFormModel)


    async def find_by_user_id(self, userId:PydanticObjectId, module: str,  populate:Optional[List[str]] = None):
        result = await self.find_one(filter={"userId.$id": userId, "module": module}, populate=populate)
        return result

    
