from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.prospects_controller import ProspectsController
from app.schemas.enquiry_schema import BulkAssign



router = APIRouter()

dependencies = Dependencies()
controller = ProspectsController()


@router.get('/all', status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["prospect:read"]))])
async def get_all_active(request: Request):
    return await controller.get_all_active(request)


@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["prospect:read"]))])
async def get_by_id(id: str, request: Request):
    return await controller.get_by_id(id, request)


@router.post("/bulk-assign", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["enquiry:assign"]))])
async def bulk_assign(request: Request, payload: BulkAssign):
    return await controller.bulk_assign(request, payload.model_dump())