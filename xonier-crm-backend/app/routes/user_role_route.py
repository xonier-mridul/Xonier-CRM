from fastapi import APIRouter, Request, Depends
from app.schemas.user_role_schema import UserRoleRegistrationSchema
from app.controllers.user_role_controller import UserRoleController
from app.core.dependencies import Dependencies
from app.core.permissions import PERMISSIONS


router = APIRouter()

user_role_controller = UserRoleController()

dependencies = Dependencies()


@router.post("/create", status_code=200)
async def create_user_role(request: Request, data: UserRoleRegistrationSchema):
    return await user_role_controller.create(request, data.model_dump())


@router.get("/all", status_code=200)
async def get_all_user_roles(request: Request):
    return await user_role_controller.get_all(request)

@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["role:delete"]))])
async def delete(request: Request,id: str):
    return await user_role_controller.delete(request, id)


