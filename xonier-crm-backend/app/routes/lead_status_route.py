from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.schemas.lead_status_schema import LeadStatusSchema
from app.services.lead_status_service import LeadStatusService
from app.utils.custom_response import successResponse

deps = Dependencies()
router = APIRouter(dependencies=[Depends(deps.authorized), Depends(deps.company_active),
    Depends(deps.company_context), Depends(deps.feature_access(FEATURE.CRM))])


@router.get("/all")
async def list_statuses(request: Request):
    return successResponse(200, "Lead statuses fetched", await LeadStatusService().list(include_usage=any(r.get("code") in {"COMPANY_ADMIN", "SUPER_ADMIN"} for r in request.state.user.get("userRole", []))))


@router.post("/create", status_code=201, dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def create_status(payload: LeadStatusSchema):
    return successResponse(201, "Lead status created", await LeadStatusService().mutate(payload.model_dump()))


@router.put("/update/{key}", dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def update_status(key: str, payload: LeadStatusSchema):
    return successResponse(200, "Lead status updated", await LeadStatusService().mutate(payload.model_dump(), key=key))


@router.delete("/delete/{key}", dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def delete_status(key: str):
    return successResponse(200, "Lead status deleted", await LeadStatusService().mutate(key=key, delete=True))
