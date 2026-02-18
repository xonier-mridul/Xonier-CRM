from fastapi import APIRouter, Request, Depends

from app.controllers.activity_controller import ActivityController
from app.core.dependencies import Dependencies



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

