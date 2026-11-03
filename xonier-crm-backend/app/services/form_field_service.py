from app.services.lead_status_service import LeadStatusService
from app.utils.custom_exception import AppException
from app.repositories.form_field_repository import FormFieldRepository
from app.db.models.form_field_model import CustomFieldModel
from app.core.enums import FORM_FIELD_MODULES, FORM_INPUT_TYPE


DEFAULT_LINKEDIN_FIELD = {
    "name": "linkedin link",
    "key": "linkedin",
    "type": FORM_INPUT_TYPE.TEXT.value,
    "required": False,
    "isActive": True,
    "placeholder": "LinkedIn Link",
    "module": [FORM_FIELD_MODULES.LEAD.value],
}


async def ensure_linkedin_form_field():
    try:
        existing = await CustomFieldModel.find_one(CustomFieldModel.key == "linkedin")
        if not existing:
            existing = await CustomFieldModel(**DEFAULT_LINKEDIN_FIELD).insert()
        return existing
    except Exception:
        return None


class FormFieldService:
    def __init__(self):
       self.repo = FormFieldRepository()

    async def get_all(self):
        try:
            await ensure_linkedin_form_field()
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
            await ensure_linkedin_form_field()
            result = await self.repo.get_all_without_pagination({"module": {"$in": ["lead"]}})

            if not result:
                raise AppException(404, "Form field data fetch failed")

            options = [{"label": s["name"], "value": s["key"]} for s in await LeadStatusService().statuses()]
            for item in result:
                if isinstance(item, dict):
                    if item.get("key") == "status":
                        item["options"] = options
                    if "required" in item:
                        item["required"] = False
                else:
                    if getattr(item, "key", None) == "status":
                        item.options = options
                    if hasattr(item, "required"):
                        item.required = False

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