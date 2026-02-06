
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.quotation_history_service import QuotationHistoryService

class QuotationHistoryController:
    def __init__(self):
        self.service = QuotationHistoryService()

    async def get_history_by_quote(self, quoteId: str, request: Request ):
        try:
            user = request.state.user

            result = await self.service.get_history_by_quote(quoteId=quoteId, user=user)

            return successResponse(200, "Quotation history data fetched successfully", result)


        except AppException as e:
            raise e

