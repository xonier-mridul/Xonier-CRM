from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from datetime import date

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.services.follow_up_service import FollowUpService

router = APIRouter()
dependencies = Dependencies()
service = FollowUpService()


class FollowUpUpdate(BaseModel):
    # Presets: 1h, 6h, 1d. Any ISO datetime is treated as IST when it has no offset.
    followUpIn: str | None = None


def access(permission: str):
    return [
        Depends(dependencies.authorized),
        Depends(dependencies.company_active),
        Depends(dependencies.company_context),
        Depends(dependencies.feature_access(FEATURE.CRM)),
        Depends(dependencies.permissions([permission])),
    ]


@router.patch("/deal/{record_id}", dependencies=access("deal:update"))
async def update_deal_follow_up(record_id: str, payload: FollowUpUpdate, request: Request):
    return await service.update("deal", record_id, payload.followUpIn, request.state.user)


@router.patch("/quotation/{record_id}", dependencies=access("quote:update"))
async def update_quotation_follow_up(record_id: str, payload: FollowUpUpdate, request: Request):
    return await service.update("quotation", record_id, payload.followUpIn, request.state.user)


@router.patch("/invoice/{record_id}", dependencies=access("invoice:update"))
async def update_invoice_follow_up(record_id: str, payload: FollowUpUpdate, request: Request):
    return await service.update("invoice", record_id, payload.followUpIn, request.state.user)


@router.patch("/enquiry/{record_id}", dependencies=access("enquiry:update"))
async def update_enquiry_follow_up(record_id: str, payload: FollowUpUpdate, request: Request):
    return await service.update("enquiry", record_id, payload.followUpIn, request.state.user)


@router.get("/count/lead", dependencies=access("lead:read"))
async def count_lead_follow_ups(request: Request, fromDate: date | None = None, toDate: date | None = None):
    return await service.count("lead", fromDate.isoformat() if fromDate else None, toDate.isoformat() if toDate else None, request.state.user)


@router.get("/count/deal", dependencies=access("deal:read"))
async def count_deal_follow_ups(request: Request, fromDate: date | None = None, toDate: date | None = None):
    return await service.count("deal", fromDate.isoformat() if fromDate else None, toDate.isoformat() if toDate else None, request.state.user)


@router.get("/count/quotation", dependencies=access("quote:read"))
async def count_quotation_follow_ups(request: Request, fromDate: date | None = None, toDate: date | None = None):
    return await service.count("quotation", fromDate.isoformat() if fromDate else None, toDate.isoformat() if toDate else None, request.state.user)


@router.get("/count/invoice", dependencies=access("invoice:read"))
async def count_invoice_follow_ups(request: Request, fromDate: date | None = None, toDate: date | None = None):
    return await service.count("invoice", fromDate.isoformat() if fromDate else None, toDate.isoformat() if toDate else None, request.state.user)


@router.get("/count/enquiry", dependencies=access("enquiry:read"))
async def count_enquiry_follow_ups(request: Request, fromDate: date | None = None, toDate: date | None = None):
    return await service.count("enquiry", fromDate.isoformat() if fromDate else None, toDate.isoformat() if toDate else None, request.state.user)
