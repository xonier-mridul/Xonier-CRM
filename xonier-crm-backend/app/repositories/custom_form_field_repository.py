from app.repositories.base_repository import BaseRepository
from app.db.models.custom_form_field_model import UserCustomFieldModel

class CustomFormFieldRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserCustomFieldModel)