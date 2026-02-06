
from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.quotation_history_controller import QuotationHistoryController


router = APIRouter()
dependencies = Dependencies()
controller = QuotationHistoryController()


@router.get("/all/by-quote/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:read"]))])
async def get_history_by_quote(id:str, request: Request):
     return await controller.get_history_by_quote(quoteId=id, request=request)