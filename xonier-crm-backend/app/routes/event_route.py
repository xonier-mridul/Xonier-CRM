from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.calender_schema import CreateCalendarEventSchema
from app.controllers.event_controller import EventController


router = APIRouter()
dependencies = Dependencies()
controller = EventController()


@router.post("/create", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.permissions(["event:create"]))])
async def create(request:Request, payload: CreateCalendarEventSchema):
    return await controller.create(request, payload.model_dump())


@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.permissions(["event:read"]))])
async def getAll(request: Request):
    return await controller.get_all(request)


@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.permissions(["event:update"]))])
async def update(id:str, request: Request, payload: CreateCalendarEventSchema):
    return await controller.update(id, request, payload.model_dump(exclude_unset=True))


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.permissions(["event:read"]))])
async def delete(request: Request, id:str):
    return await controller.delete(request=request, eventId=id)
