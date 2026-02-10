from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.notes_schema import NoteCreateSchema
from app.controllers.note_controller import NoteController

router = APIRouter()
dependencies = Dependencies()
controller = NoteController()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["note:create"]))])
async def create(request: Request, payload: NoteCreateSchema):
    return await controller.create(request, payload.model_dump())

@router.get("/all/active", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["note:read"]))])
async def get_all_active(request: Request):
    return await controller.get_all_active(request=request)

@router.get("/all/private", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["note:read"]))])
async def get_private_notes_by_creator(request: Request):
    return await controller.get_private_notes_by_creator(request=request)

@router.patch("/update/pinned/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["note:update"]))])
async def update_pinned_status(id:str, request: Request):
    return await controller.update_pinned_status(id, request)


@router.patch("/soft-delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["note:delete"]))])
async def soft_delete(id:str, request:Request):
    return await controller.soft_delete(id, request)