from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.quotation_schema import QuotationSchema
from app.controllers.quotation_controller import QuotationController


router = APIRouter()
dependencies = Dependencies()
controller = QuotationController()

@router.get("/create", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:create"]))])
async def create(request: Request, payload: QuotationSchema):
    return await controller.create(request=request, payload=payload.model_dump())