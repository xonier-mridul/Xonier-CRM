from fastapi import APIRouter, Request, Depends
from app.controllers.enquiry_controller import EnquiryController
from app.schemas.enquiry_schema import EnquiryRegisterSchema, UpdateEnquirySchema, BulkEnquiryRegisterSchema, BulkAssignSchema
from app.core.dependencies import Dependencies
from app.core.enums import FEATURE


router = APIRouter()
dependencies = Dependencies()

enquiryController = EnquiryController()

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:read"]))])
async def get_all(request: Request):
    return await enquiryController.get_all(request=request)

@router.get("/all/by-creator", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:read"]))])
async def get_all_by_creator(request: Request):
    return await enquiryController.get_all_by_creator(request)


@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:read"]))])
async def get_by_id(request: Request, id:str):
    return await enquiryController.get_by_id(request, id)

@router.post("/bulk-assign", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:read"]))])
async def bulk_assign(request: Request, payload: BulkAssignSchema):
    return await enquiryController.bulk_assign(request=request, payload=payload.model_dump(mode="json"))

@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:create"]))])
async def register_enquiry(request: Request, payload: EnquiryRegisterSchema):
    return await enquiryController.create(request, payload.model_dump(mode="json"))

@router.post("/create/bulk", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:create"]))])
async def bulk_register(request: Request, payload: BulkEnquiryRegisterSchema):
    return await enquiryController.bulk_create(request, payload.model_dump(mode="json"))

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM)), Depends(dependencies.permissions(["enquiry:update"]))])
async def update(request: Request, id:str, data: UpdateEnquirySchema):
    return await enquiryController.update(request, id, data.model_dump(exclude_unset=True))


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active), 
Depends(dependencies.company_context),Depends(dependencies.feature_access(FEATURE.CRM)),Depends(dependencies.permissions(["enquiry:delete"]))])
async def delete(request: Request, id: str):
    return await enquiryController.delete(request=request, id=id)

