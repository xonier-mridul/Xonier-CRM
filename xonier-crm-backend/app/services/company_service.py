from typing import Dict, Any
from app.utils.custom_exception import AppException
from pymongo.errors import DuplicateKeyError
from app.repositories.company_repository import CompanyRepository

class CompanyService:
    def __init__(self):
        self.repo = CompanyRepository()


    async def create(self, payload:Dict[str, Any], user:Dict[str, Any]):
        try:
            isExist = await self.repo.find_one(filter={"companyName": payload["companyName"]})

            if isExist:
                raise AppException(400, "Company already exist")


        except AppException as e:
            raise e
        
        except DuplicateKeyError as e:
            raise AppException(409, "Company already exist")
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")