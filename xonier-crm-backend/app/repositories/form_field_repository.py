
from app.repositories.base_repository import BaseRepository
from app.db.models.form_field_model import CustomFieldModel

class FormFieldRepository(BaseRepository):
    def __init__(self):
        super().__init__(CustomFieldModel)