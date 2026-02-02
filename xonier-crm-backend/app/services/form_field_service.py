from app.utils.custom_exception import AppException
from app.repositories.form_field_repository import FormFieldRepository


class FormFieldService:
    def __init__(self):
       self.repo = FormFieldRepository()

    async def get_all(self):
        try:

            result = await self.repo.get_all_without_pagination()

            if not result:
                raise AppException(404, "Form field data fetch failed")
            
            return result


        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def get_leads_fields(self):
        try:

            result = await self.repo.get_all_without_pagination({"module": {"$in": ["lead"]}})

            if not result:
                raise AppException(404, "Form field data fetch failed")
            
            return result


        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_deal_fields(self):
        try:

            result = await self.repo.get_all_without_pagination({"module": {"$in": ["deal"]}})

            if not result:
                raise AppException(404, "Form field data fetch failed")
            
            return result


        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")