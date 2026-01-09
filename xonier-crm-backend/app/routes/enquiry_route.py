from fastapi import APIRouter, Request, Depends
from app.controllers.enquiry_controller import EnquiryController
from app.schemas.enquiry_schema import EnquiryRegisterSchema
from app.core.dependencies import Dependencies


router = APIRouter()
dependencies = Dependencies()

enquiryController = EnquiryController()

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_all(request: Request):
    return await enquiryController.get_all(request=request)


@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_by_id(request: Request, id:str):
    return await enquiryController.get_by_id(request, id)

@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized)])
async def register_enquiry(request: Request, payload: EnquiryRegisterSchema):
    return await enquiryController.create(request, payload.model_dump(mode="json"))


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def delete(request: Request, id: str):
    return await enquiryController.delete(request=request, id=id)

