from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.lead_schema import LeadsCreateSchema, LeadUpdateSchema, LeadBaseSchema, CreateBulkLeadSchema, BulkAssignLeadSchema, LeadStatusUpdateSchema, BulkReassignLeadSchema
from app.controllers.lead_controller import LeadController

router = APIRouter()

dependencies = Dependencies()
leadController = LeadController()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def create(request: Request, payload: LeadBaseSchema):
    return await leadController.create(request=request, payload=payload.model_dump())

@router.post("/create/bulk", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def bulk_create(request: Request, payload: CreateBulkLeadSchema):
    return await leadController.bulk_create(request=request, payload=payload.model_dump(mode="json"))

@router.patch("/assign/bulk", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:assign"]))])
async def bulk_lead_assign(request: Request, payload:BulkAssignLeadSchema):
    return await leadController.bulk_lead_assign(request, payload.model_dump(mode="json"))

@router.patch(
    "/reassign/bulk",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["lead:assign"]))
    ]
)
async def bulk_reassign_lead(request: Request, payload: BulkReassignLeadSchema):
    return await leadController.bulk_reassign_lead(request, payload)


@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:read"]))])
async def get_all(request: Request):
    return await leadController.get_all(request)

@router.get("/leads-by-user/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:read"]))])
async def get_all_by_user(request: Request):
    return await leadController.get_all_by_user(request)

@router.get("/all-won", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:read"]))])
async def get_won_lead(request: Request):
    return await leadController.get_won_leads(request)

@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:read"]))])
async def get_all(request: Request, id: str):
    return await leadController.get_by_id(request=request, id=id)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:update"]))])
async def update(request: Request, id:str, payload: LeadUpdateSchema ):
    return await leadController.update(request, id, payload.model_dump(exclude_unset=True))

@router.patch("/update/{id}/status", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:update"]))])
async def update_status(request:Request, id:str, payload: LeadStatusUpdateSchema):
    return await leadController.lead_update(request, id, payload.model_dump(exclude_unset=True))

@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:delete"]))])
async def delete(request: Request, id: str):
    return await leadController.delete(request,id)