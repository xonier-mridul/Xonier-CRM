from fastapi import APIRouter, Request, Depends
from app.controllers.enquiry_controller import EnquiryController
from app.schemas.enquiry_schema import EnquiryRegisterSchema, UpdateEnquirySchema, BulkEnquiryRegisterSchema
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

@router.post("/create/bulk", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["enquiry:create"]))])
async def bulk_register(request: Request, payload: BulkEnquiryRegisterSchema):
    return await enquiryController.bulk_create(request, payload.model_dump(mode="json"))

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["enquiry:update"]))])
async def update(request: Request, id:str, data: UpdateEnquirySchema):
    return await enquiryController.update(request, id, data.model_dump())


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def delete(request: Request, id: str):
    return await enquiryController.delete(request=request, id=id)

