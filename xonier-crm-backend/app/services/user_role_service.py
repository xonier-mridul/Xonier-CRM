from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.user_role_repository import UserRoleRepository
from app.utils.code_generator import code_generator
from app.db.db import Client
from beanie import PydanticObjectId
from app.repositories.user_repository import UserRepository



class UserRoleService:
    def __init__(self):
        self.repository = UserRoleRepository()
        self.user_repo = UserRepository()
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

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
        
    
    async def get_all_active(self):
        try:

            result = await self.repository.get_all_without_pagination(filters={"status": True}, populate=["createdBy", "permissions"])

            if not result:
                raise AppException(status_code=404, message="No active roles found")
            
            return result
        
        except AppException:
            raise 
        
        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
        

    async def get_by_id(self, id:str):
        try:
            result = await self.repository.find_by_id(PydanticObjectId(id))

            if not result:
                raise AppException(404, "Role not found")
            
            return result.model_dump(mode="json")


        except AppException:
            raise 
        
        except Exception as e:
            raise AppException(status_code=500, message="internal server error")



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
        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")
        finally:
            await session.end_session()


    async def update(self, data: Dict[str, Any], roleId: str, updatedBy: str)->bool:
        try:

            is_exist = await self.repository.find_by_id(PydanticObjectId(roleId))
            
            if not is_exist:
                raise AppException(404, "Role data not found")
            
            code = code_generator(data["name"])
            
            new_payload: Dict[str, Any] = {
                 **data,
                 "updatedBy": updatedBy,
                 "code": code
            }

            print("new: ", new_payload, roleId)

            update = await self.repository.update(id=PydanticObjectId(roleId),data=new_payload)


            if not update:
                raise AppException(400, "Failed to update role. Please try again")
            
            return True



        except Exception:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    

    async def delete(self, id: PydanticObjectId):
        try:
            is_Exist = await self.repository.find_by_id(id)

            if not is_Exist:
                raise AppException(404, "Role not found")
            
            is_used = await self.user_repo.find_by_role(roleId=str(id), populate=["userRole"])

            if is_used["data"]:
                raise AppException(400, f"Delete request denied, user role used by {len(is_used)} users, please change the user role first")
            

            result = await self.repository.delete_by_id(PydanticObjectId(id))
            if not result:
                raise AppException(400, "Role not deleted")
            
            return is_Exist.model_dump(mode="json")
        
        except Exception as e:
            raise

        except Exception as e:
                    raise AppException(status_code=500, message="internal server error")