from fastapi import APIRouter, Depends, Request

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.schemas.lead_status_schema import LeadStatusSchema
from app.services.deal_stage_service import DealStageService

deps = Dependencies()
router = APIRouter(dependencies=[
    Depends(deps.authorized), Depends(deps.company_active),
    Depends(deps.company_context), Depends(deps.feature_access(FEATURE.CRM)),
])


@router.get("/all")
async def list_stages(request: Request):
    roles = request.state.user.get("userRole", [])
    admin = any(role.get("code") in {"COMPANY_ADMIN", "SUPER_ADMIN", "ADMIN"} for role in roles)
    return {"data": await DealStageService().list(include_usage=admin)}


@router.post("/create", status_code=201, dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def create_stage(payload: LeadStatusSchema):
    return {"data": await DealStageService().mutate(payload.model_dump())}


@router.put("/update/{key}", dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def update_stage(key: str, payload: LeadStatusSchema):
    return {"data": await DealStageService().mutate(payload.model_dump(), key=key)}


@router.delete("/delete/{key}", dependencies=[Depends(deps.onlyForCompanyAdmin)])
async def delete_stage(key: str):
    return {"data": await DealStageService().mutate(key=key, delete=True)}
