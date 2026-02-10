from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.invoice_controller import InvoiceController

router = APIRouter()
dependencies = Dependencies()
controller = InvoiceController()


@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["invoice:read"]))])
async def getAll( request: Request):
    return await controller.getAll(request=request)


@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["invoice:read"]))])
async def get_by_id(id:str, request: Request):
    return await controller.get_by_id(id, request)

@router.get("/download/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["invoice:download"]))])
async def download_invoice(id:str, request: Request):
    return await controller.download_invoice(id, request)


