from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.schemas.campaign_schema import (
    CampaignCreateSchema,
    CampaignUpdateSchema,
    CampaignStatusUpdateSchema,
    CampaignLeadImportSchema,
    CampaignLeadStatusUpdateSchema,
    CampaignLeadAssignSchema,
)
from app.controllers.campaign_controller import CampaignController

router = APIRouter()

dependencies = Dependencies()
campaignController = CampaignController()

# Shared dependency chain for all campaign routes
_auth_deps = [
    Depends(dependencies.authorized),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
    Depends(dependencies.feature_access(FEATURE.CRM)),
]


# ─── Campaign CRUD ────────────────────────────────────────────────────────────

@router.post(
    "/create",
    status_code=201,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:create"]))],
)
async def create_campaign(request: Request, payload: CampaignCreateSchema):
    return await campaignController.create(request=request, payload=payload.model_dump())


@router.get(
    "/all",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:read"]))],
)
async def get_all_campaigns(request: Request):
    return await campaignController.get_all(request=request)


@router.get(
    "/get-by-id/{campaign_id}",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:read"]))],
)
async def get_campaign_by_id(request: Request, campaign_id: str):
    return await campaignController.get_by_id(request=request, campaign_id=campaign_id)


@router.put(
    "/update/{campaign_id}",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:update"]))],
)
async def update_campaign(request: Request, campaign_id: str, payload: CampaignUpdateSchema):
    return await campaignController.update(
        request=request,
        campaign_id=campaign_id,
        payload=payload.model_dump(exclude_none=True),
    )


@router.patch(
    "/update/{campaign_id}/status",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:update"]))],
)
async def update_campaign_status(request: Request, campaign_id: str, payload: CampaignStatusUpdateSchema):
    return await campaignController.update_status(
        request=request,
        campaign_id=campaign_id,
        payload=payload.model_dump(),
    )


@router.delete(
    "/delete/{campaign_id}",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:delete"]))],
)
async def delete_campaign(request: Request, campaign_id: str):
    return await campaignController.delete(request=request, campaign_id=campaign_id)


# ─── Campaign Lead Operations ─────────────────────────────────────────────────

@router.post(
    "/{campaign_id}/leads/import",
    status_code=201,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:manage"]))],
)
async def import_leads(request: Request, campaign_id: str, payload: CampaignLeadImportSchema):
    return await campaignController.import_leads(
        request=request,
        campaign_id=campaign_id,
        payload=payload.model_dump(),
    )


@router.get(
    "/{campaign_id}/leads",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:read"]))],
)
async def get_campaign_leads(request: Request, campaign_id: str):
    return await campaignController.get_campaign_leads(
        request=request,
        campaign_id=campaign_id,
    )


@router.patch(
    "/{campaign_id}/leads/{campaign_lead_id}/status",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:manage"]))],
)
async def update_lead_status(
    request: Request,
    campaign_id: str,
    campaign_lead_id: str,
    payload: CampaignLeadStatusUpdateSchema,
):
    return await campaignController.update_lead_status(
        request=request,
        campaign_id=campaign_id,
        campaign_lead_id=campaign_lead_id,
        payload=payload.model_dump(),
    )


@router.patch(
    "/{campaign_id}/leads/{campaign_lead_id}/assign",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:manage"]))],
)
async def assign_lead(
    request: Request,
    campaign_id: str,
    campaign_lead_id: str,
    payload: CampaignLeadAssignSchema,
):
    return await campaignController.assign_lead(
        request=request,
        campaign_id=campaign_id,
        campaign_lead_id=campaign_lead_id,
        payload=payload.model_dump(),
    )


# ─── Distribution ─────────────────────────────────────────────────────────────

@router.post(
    "/{campaign_id}/distribute/equal",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:manage"]))],
)
async def distribute_equal(request: Request, campaign_id: str):
    return await campaignController.distribute_equal(request=request, campaign_id=campaign_id)


@router.post(
    "/{campaign_id}/distribute/claim",
    status_code=200,
    dependencies=[*_auth_deps, Depends(dependencies.permissions(["campaign:read"]))],
)
async def claim_next_lead(request: Request, campaign_id: str):
    return await campaignController.claim_next_lead(request=request, campaign_id=campaign_id)
