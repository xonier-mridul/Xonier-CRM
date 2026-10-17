from fastapi import APIRouter, Depends, Query, Request
from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.schemas.lead_schema import LeadConnectStatusUpdateSchema
from app.services.campaign_service import CampaignService
from app.services.mobile_service import MobileService
from app.utils.custom_response import successResponse

router = APIRouter()

dependencies = Dependencies()
mobileService = MobileService()

# Mobile = agent/user account. Login + company checks only; every query is scoped to
# the logged-in user inside MobileService (no admin permissions needed).
_auth_deps = [
    Depends(dependencies.authorized),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
    Depends(dependencies.feature_access(FEATURE.CRM)),
]


# ─── Home + Insights ──────────────────────────────────────────────────────────

@router.get("/home", status_code=200, dependencies=_auth_deps)
async def mobile_home(request: Request):
    result = await mobileService.home(request.state.user)
    return successResponse(200, "Home fetched successfully", result)


@router.get("/insights", status_code=200, dependencies=_auth_deps)
async def mobile_insights(
    request: Request,
    period: str = Query("month", enum=["today", "week", "month", "quarter"]),
    tz: str = Query("Asia/Kolkata", description="IANA timezone used to cut the period"),
):
    result = await mobileService.insights(request.state.user, period, tz)
    return successResponse(200, "Insights fetched successfully", result)


# ─── My Leads (Total Leads card) ──────────────────────────────────────────────

@router.get("/leads", status_code=200, dependencies=_auth_deps)
async def mobile_my_leads(request: Request):
    """Query: page, limit, search, status (connectStatus), priority, source, salesStatus, campaignId."""
    result = await mobileService.my_leads(request.state.user, request.query_params)
    return successResponse(200, "Leads fetched successfully", result)


@router.patch("/leads/{lead_id}/status", status_code=200, dependencies=_auth_deps)
async def mobile_update_lead_status(request: Request, lead_id: str, payload: LeadConnectStatusUpdateSchema):
    result = await mobileService.update_lead_status(request.state.user, lead_id, payload.status.value)
    return successResponse(200, f"Lead status updated to {result['connectStatus']}", result)


# ─── My Campaigns ─────────────────────────────────────────────────────────────

@router.get("/campaigns", status_code=200, dependencies=_auth_deps)
async def mobile_my_campaigns(request: Request):
    """Query: page, limit, status, search."""
    result = await mobileService.my_campaigns(request.state.user, request.query_params)
    return successResponse(200, "Campaigns fetched successfully", result)


@router.get("/campaigns/{campaign_id}", status_code=200, dependencies=_auth_deps)
async def mobile_campaign_detail(request: Request, campaign_id: str):
    result = await mobileService.campaign_detail(request.state.user, campaign_id)
    return successResponse(200, "Campaign fetched successfully", result)


@router.get("/campaigns/{campaign_id}/leads", status_code=200, dependencies=_auth_deps)
async def mobile_campaign_leads(request: Request, campaign_id: str):
    """Query: page, limit, search, status, priority, source, ownership=all|mine|other|unassigned."""
    result = await mobileService.campaign_leads(request.state.user, campaign_id, request.query_params)
    return successResponse(200, "Campaign leads fetched successfully", result)


@router.post("/campaigns/{campaign_id}/leads/{campaign_lead_id}/claim", status_code=200, dependencies=_auth_deps)
async def mobile_claim_lead(request: Request, campaign_id: str, campaign_lead_id: str):
    """ON_DEMAND only: take an unassigned lead (it becomes yours)."""
    result = await mobileService.claim_lead(request.state.user, campaign_id, campaign_lead_id)
    return successResponse(200, "Lead claimed successfully", result)


@router.post("/campaigns/{campaign_id}/claim-next", status_code=200, dependencies=_auth_deps)
async def mobile_claim_next_lead(request: Request, campaign_id: str):
    """ON_DEMAND only: take the next available unassigned lead."""
    await mobileService._get_accessible_campaign(request.state.user, campaign_id)
    result = await CampaignService().claim_next_lead(campaign_id=campaign_id, user=request.state.user)
    return successResponse(200, "Lead claimed successfully", result)
