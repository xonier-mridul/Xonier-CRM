from typing import Dict, Any
from app.utils.custom_exception import AppException
from bson import ObjectId
from beanie import PydanticObjectId
from app.repositories.user_form_repository import UserFormRepository
from app.core.enums import FORM_FIELD_MODULES
from app.db.models.custom_form_field_model import UserCustomFieldModel
from app.db.models.form_field_model import CustomFieldModel

class UserFormService:
    def __init__(self):
        self.repo = UserFormRepository()

    async def create(self, payload: Dict[str, Any], userId: str):
        try:
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user Id")
           
            
            is_exist = await self.repo.find_by_user_id(userId=PydanticObjectId(userId), module=payload["module"])

            if is_exist:
                raise AppException(400, "Form already exist for this user")
            
            new_payload: Dict[str, Any] = {
                
                **payload,
                "userId": userId
            }


            create = await self.repo.create(new_payload)


            if not create:
                raise AppException(400, "Form creation failed")
            
            return create.model_dump(mode="json")


        except AppException:
            raise

        except Exception as e:
            print("e: ", e)
            raise AppException(500, f"Internal server error: {e}")
        



    async def get_lead_by_user_id(self, userId: str):
        try:
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user id")

            result = await self.repo.find_by_user_id(
                userId=PydanticObjectId(userId),
                module=FORM_FIELD_MODULES.LEAD,
                populate=["userId", "selectedFormFields"],
            )

            if not result:
                raise AppException(
                    404,
                    "You haven’t created any form fields yet. Please create form fields to continue"
                )

            
            hydrated_fields = []

            for field in result.selectedFormFields:
                
                if isinstance(field, CustomFieldModel):
                    hydrated_fields.append(field)
                    continue

                
                field_id = None

                if hasattr(field, "id") and field.id:
                    field_id = field.id
                elif hasattr(field, "ref") and field.ref:
                    field_id = field.ref.id

                if field_id:
                    custom_field = await UserCustomFieldModel.get(field_id)
                    if custom_field:
                        hydrated_fields.append(custom_field)

            result.selectedFormFields = hydrated_fields

            return result.model_dump(mode="json")

        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

        

    async def get_deal_by_user_id(self, userId: str):
        try:

            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user id")
            
            result = await self.repo.find_by_user_id(userId=PydanticObjectId(userId), module=FORM_FIELD_MODULES.DEAL, populate=["userId", "selectedFormFields"])

            if not result:
                raise AppException(404, 'You haven’t created any form fields yet. Please create form fields to continue')
            
            return result.model_dump(mode="json")


        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update(self, userId: str, id:str, payload: Dict[str, Any])->bool:
        try:
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user id")
            
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid form field document id")

            is_exist = await self.repo.find_one({"_id": PydanticObjectId(id), "userId.$id": PydanticObjectId(userId)})

            if not is_exist:
                raise AppException(403, "Unauthorized for this request")
            

            update = await self.repo.update(id=PydanticObjectId(id), data=payload)
            if not update:
                raise AppException(400, "Document updation failed")
            
            return True


        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
