
from app.repositories.base_repository import BaseRepository
from app.db.models.communications.telephone_numbers_model import TelephoneNumbersModel

class TelephoneRepository(BaseRepository):
    def __init__(self):
        super().__init__(TelephoneNumbersModel)

    