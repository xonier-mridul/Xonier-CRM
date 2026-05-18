from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.subscription_controller import SubscriptionController

router = APIRouter()

dependencies = Dependencies()

controller = SubscriptionController()

@router.get('/', status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])
async def getAll(request: Request):
    return await controller.getAll(request)

@router.get("/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])
async def getById(request:Request, id:str):
    return await controller.getById(request, id)