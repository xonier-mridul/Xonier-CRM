from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.custom_form_field_repository import CustomFormFieldRepository
from app.repositories.user_form_repository import UserFormRepository
from app.utils.key_generator import key_generator
from fastapi.encoders import jsonable_encoder
from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from app.utils.validate_admin import validate_admin
from bson import ObjectId


class CustomFormFieldService:
    def __init__(self):
        self.repo = CustomFormFieldRepository()
        self.userFormRepo = UserFormRepository()


    async def create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:

            key = key_generator(payload["name"])

            if not key:
                raise AppException(500, "Key generation failed")

            is_exist = await self.repo.find(filter={"key": key, "name": payload["name"]})

            if is_exist:
                raise AppException(400, f"{payload["name"]} field already exist")
            
            new_payload = {
                **payload,
                "key": key,
                "userId": user["_id"],
                "createdBy": user["_id"]
            }

            field = await self.repo.create(data=new_payload)

            if not field:
                raise AppException(400, "Field creation failed")

        except AppException as e:
            raise e
        
        except DuplicateKeyError:
                raise AppException(409, "key already exist")
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_by_creator(self, user:Dict[str, Any]):
        try:

            result = await self.repo.get_all_without_pagination(filters={"userId.$id": PydanticObjectId(user["_id"])}, populate=["userId"])

            if not result:
                raise AppException(400, "Field not found against current user")
            
            return jsonable_encoder(result)
            


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def delete(self, id:str, user: Dict[str, Any])->bool:
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "invalid field Object Id")
            
            print("id: ", id)
            is_admin = validate_admin(user["userRole"])
            is_creator = False

            is_used = await self.userFormRepo.find_one({"selectedFormFields.$id": PydanticObjectId(id)})


            if is_used:
                raise AppException(400, "Operation denied, Field are used in forms")


            field = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])
            print("feidl data: ", field)
            if str(field.createdBy.id) == str(user["_id"]):
                is_creator = True


            if not is_admin and not is_creator:
                raise AppException(403, "Permission denied, Only admin or creator perform this task")
            
            delete = await self.repo.delete_by_id(id=PydanticObjectId(id))

            if not delete:
                raise AppException(400, "Field deletion failed")
            
            return True

            




        except AppException as e:
            print("err: ", e)
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


