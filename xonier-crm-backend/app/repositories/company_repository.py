
from app.repositories.base_repository import BaseRepository
from app.db.models.company_model import CompanyModel

class CompanyRepository(BaseRepository):
    def __init__(self):
        super().__init__(CompanyModel)

    
