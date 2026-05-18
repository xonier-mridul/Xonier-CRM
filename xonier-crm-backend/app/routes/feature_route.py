from fastapi import APIRouter, Depends, Request
from app.controllers.feature_controller import FeatureController
from app.core.dependencies import Dependencies

router = APIRouter()
dependencies = Dependencies()
controller = FeatureController()



@router.get("/", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])
async def getAll(request: Request):
    return await  controller.getAll(request=request)
