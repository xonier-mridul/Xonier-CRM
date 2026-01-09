from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.user_role_repository import UserRoleRepository
from app.utils.code_generator import code_generator
from app.db.db import Client
from beanie import PydanticObjectId



class UserRoleService:
    def __init__(self):
        self.repository = UserRoleRepository()
        self.client = Client

    async def get_all(self, page:int = 1, limit: int = 10, filters: Dict[str, Any] = {}):
        try:
            query = {}

            if "name" in filters:
                query.update("title", filters["name"])


            if "code" in filters:
                query.update("code", filters["code"])

            if "action" in filters:
                query.update("action", filters["action"])
     
            result = await self.repository.get_all(page, limit, filters=query, populate=["createdBy", "permissions"])

            if not result:
                raise AppException(404, "Roles data not found")
            
            return result
                
        except AppException:
            raise


    async def create_role(self, user: Dict[str, any], data:Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            payload = {**data}

            code = code_generator(data["name"])
            payload.update(code=code, createdBy=user["_id"])

            new_role = await self.repository.create(data=payload, session=session)

            if not new_role:
                raise AppException(400, "Role creation failed")
            
            await session.commit_transaction()
            return new_role.model_dump(mode="json")

        except AppException:
            await session.abort_transaction()
            raise 
        finally:
            await session.end_session()

    async def delete(self, id: PydanticObjectId):
        try:
            is_Exist = await self.repository.find_by_id(id)

            if not is_Exist:
                raise AppException(404, "Role not found")
            
            result = await self.repository.delete_by_id(id)
            if not result:
                raise AppException(400, "Role not deleted")
            
            return is_Exist.model_dump(mode="json")
        except Exception as e:
            raise