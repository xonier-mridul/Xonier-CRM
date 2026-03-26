from fastapi import APIRouter, Request, Depends

from app.controllers.activity_controller import ActivityController
from app.core.dependencies import Dependencies
from app.schemas.activity_schema import CallActivitySchema, CallActivityUpdateSchema



router = APIRouter()

controller = ActivityController()
dependencies = Dependencies()


@router.get("/user/{id}", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_user_activity(id: str, request: Request):
    return await controller.get_user_activity(id, request)

@router.get(
    "/user/{id}/summary",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def get_user_activity_summary(id: str, request: Request):
    return await controller.get_user_activity_summary(id, request)


@router.post("/call/made", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["call:call"]))])
async def call_activity(request: Request, payload: CallActivitySchema):
    return await controller.call_activity(request=request, payload=payload.model_dump(mode="json"))


@router.patch("/call/{id}/activity-update", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["call:call"]))])
async def update_call_activity(request: Request, id:str,  payload: CallActivityUpdateSchema):
    return await controller.update_call_activity(request=request, id=id, payload=payload.model_dump(mode="json"))


