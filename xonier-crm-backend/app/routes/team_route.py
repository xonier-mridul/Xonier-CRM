from fastapi import APIRouter, Request, Depends
from app.core.dependencies import Dependencies
from app.schemas.team_schema import TeamRegisterSchema, TeamUpdateSchema
from app.controllers.team_controller import TeamController


router = APIRouter()

dependencies = Dependencies()
teamController = TeamController()


@router.post("/create", status_code=201)
async def create(request: Request, data: TeamRegisterSchema):
    return await teamController.create(request, data.model_dump())

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team:read"]))])
async def get_all(request: Request):
   return await teamController.get_all(request)

@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team:read"]))])
async def get_by_id(request: Request, id: str):
    return await teamController.get_by_id(request, id)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team:update"]))])
async def update(request: Request, id: str, payload: TeamUpdateSchema):
    return await teamController.update(request, id, payload.model_dump())


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["team:delete"]))])
async def delete(id: str):
    return await teamController.delete(id)

   