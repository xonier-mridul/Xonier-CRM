
from app.repositories.base_repository import BaseRepository
from app.db.models.company_model import CompanyModel
from typing import List, Any, Optional, Dict
from app.utils.company_code import company_login_filter

class CompanyRepository(BaseRepository):
    def __init__(self):
        super().__init__(CompanyModel)


    async def find_company_by_companyId(self, companyId: str, populate: Optional[List[str]] = None, projections: Optional[Dict[str, int]] = None, session=None):
        if not isinstance(companyId, str) or not companyId.strip():
            return None
        company = await self.find_one(filter=company_login_filter(companyId), populate=populate, projections=projections, session=session)
        return company
        

    
