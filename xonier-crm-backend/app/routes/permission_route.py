from fastapi import APIRouter
from app.controllers.permission_controller import PermissionController

router = APIRouter()

permission_controller = PermissionController()


@router.get("/all", status_code=200)
async def get_all():
    return await permission_controller.get_all()