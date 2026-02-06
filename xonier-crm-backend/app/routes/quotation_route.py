from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.quotation_schema import QuotationSchema, QuotationUpdateSchema, QuoteStatusUpdateSchema
from app.controllers.quotation_controller import QuotationController


router = APIRouter()
dependencies = Dependencies()
controller = QuotationController()

@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:create"]))])
async def create(request: Request, payload: QuotationSchema):
    return await controller.create(request=request, payload=payload.model_dump())


@router.get("/get-all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:read"]))])
async def getAll(request: Request):
    return await controller.getAll(request=request)

@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:read"]))])
async def get_by_id(request:Request, id: str):
    return await controller.get_by_id(request=request, quoteId=id)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:update"]))])
async def update(id:str, request: Request, payload: QuotationUpdateSchema):
    return await controller.update(id=id, request=request, payload=payload.model_dump(exclude_unset=True))

@router.patch("/update/status/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:update"]))])
async def update_status(id:str, request: Request, payload: QuoteStatusUpdateSchema):
    return await controller.update_status(id=id, request=request, payload=payload.model_dump())

@router.post("/resend/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:create"]))])
async def resend(id:str, request:Request):
    return await controller.resend(id=id, request=request)

@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["quote:create"]))])
async def delete(id:str, request:Request):
    return await controller.delete(id, request)