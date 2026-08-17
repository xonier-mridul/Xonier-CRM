
from app.repositories.base_repository import BaseRepository
from app.db.models.company_model import CompanyModel
from typing import List, Any, Optional, Dict

class CompanyRepository(BaseRepository):
    def __init__(self):
        super().__init__(CompanyModel)


    async def find_company_by_companyId(self, companyId: str, populate: Optional[List[str]] = None, projections: Optional[Dict[str, int]] = None):
        company = await self.find_one(filter={"companyId": companyId}, populate=populate, projections=projections)
        return company
        

    
