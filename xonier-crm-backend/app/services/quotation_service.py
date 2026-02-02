from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any
from app.repositories.deal_repository import DealRepository
from bson import ObjectId
from app.db.db import Client
from app.utils.validate_admin import validate_admin
from beanie import PydanticObjectId
from app.utils.get_team_members import GetTeamMembers
from app.repositories.enquiry_repository import EnquiryRepository



class QuotationService:
    def __init__(self):
        self.repo = EnquiryRepository()
        self.dealRepo = DealRepository()
        self.client = Client
        self.getTeamMem = GetTeamMembers()

    async def create(self, user:Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(payload["deal"]):
                        raise AppException(400, "Invalid deal Id")
                    
                    isAdmin = False
                    isCreator = False
                    isManager = False


                    isAdmin = validate_admin(user["userRole"]["code"])

                    if not isAdmin:

                        deal = self.dealRepo.find_by_id(PydanticObjectId(payload["deal"]), populate=["createdBy"])

                        deal = deal.model_dump(mode="json")

                        if deal["createdBy"]["id"] == user["_id"]:
                            isCreator = True
                            

                        if not isCreator:
                             members = await self.getTeamMem.get_team_members(user["_id"])
                             
                             if members:
                                 isManager = deal["createdBy"]["id"] in members

                    if not isAdmin and not isCreator and not isManager:
                        raise AppException(403, "Permission denied, Only Admin, Creator or Manager can perform this")
                    

                    new_payload:Dict[str, Any] = {
                        **payload,
                        "createdBy": user["_id"]
                    }
                    

                    create = await self.repo.create(data=new_payload, session=session)          

                    




                    



                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
