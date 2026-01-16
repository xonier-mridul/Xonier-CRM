from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.team_schema import TeamCategoryCreateSchema
from app.controllers.team_category_controller import TeamCategoryController


router = APIRouter()

dependencies = Dependencies()

controller = TeamCategoryController()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions("team_cat:create"))])
async def register(request: Request, payload: TeamCategoryCreateSchema):
    return await controller.create(request, payload.model_dump())

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team_cat:read"]))])
async def get_all(request:Request):
    return await controller.get_all(request)

@router.get("/get-all-without-pagination", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team_cat:read"]))])
async def get_all_without_pagination(request: Request):
    return await controller.get_all_without_pagination(request)


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team_cat:delete"]))])
async def delete(request: Request, id: str):
    return await controller.delete(request, id)