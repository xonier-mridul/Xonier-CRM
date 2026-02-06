from typing import Dict, Any
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder

from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from app.utils.get_team_members import GetTeamMembers

from app.repositories.quotation_history_repository import QuotationHistoryRepository
from app.repositories.quotation_repository import QuotationRepository


class QuotationHistoryService:
    def __init__(self):
        self.repo = QuotationHistoryRepository()
        self.quoteRepo = QuotationRepository()
        self.getTeamMem = GetTeamMembers()

    async def get_history_by_quote(self, quoteId: str, user: Dict[str, Any]):
        try:
            if not PydanticObjectId.is_valid(quoteId):
                raise AppException(400, "Invalid quotation id")

            quotation = await self.quoteRepo.find_by_id(
                PydanticObjectId(quoteId),
                populate=["createdBy"]
            )

            if not quotation:
                raise AppException(404, "Quotation not found")

            isAdmin = validate_admin(user["userRole"])
            isCreator = str(quotation.createdBy.id) == str(user["_id"])
            isManager = False

            if not isAdmin and not isCreator:
                members = await self.getTeamMem.get_team_members(user["_id"])
                if members and quotation.createdBy.id in members:
                    isManager = True

            if not (isAdmin or isCreator or isManager):
                raise AppException(403, "Permission denied")

            
            result = await self.repo.find(
                filter={"quotation.$id": PydanticObjectId(quoteId)},
                populate=["quotation", "performedBy"],
                sort=[("createdAt", -1)]
            )

            if not result:
                raise AppException(404, "No history found for this quotation")

            return jsonable_encoder(result)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
