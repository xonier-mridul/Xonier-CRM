from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.custom_form_field_repository import CustomFormFieldRepository
from app.utils.key_generator import key_generator
from fastapi.encoders import jsonable_encoder
from beanie import PydanticObjectId


class CustomFormFieldService:
    def __init__(self):
        self.repo = CustomFormFieldRepository()


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

