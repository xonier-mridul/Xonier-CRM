from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.campaign_service import CampaignService


class CampaignController:
    def __init__(self):
        self.service = CampaignService()

    # ─── Campaign CRUD ────────────────────────────────────────────────────────

    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create(payload=payload, user=user)
            return successResponse(201, f"Campaign '{result.get('name')}' created successfully", result)
        except AppException as e:
            raise e

    async def get_all(self, request: Request):
        try:
            user = request.state.user
            filters = request.query_params
            result = await self.service.get_all(filters=filters, user=user)
            return successResponse(200, "Campaigns fetched successfully", result)
        except AppException as e:
            raise e

    async def get_by_id(self, request: Request, campaign_id: str):
        try:
            user = request.state.user
            result = await self.service.get_by_id(campaign_id=campaign_id, user=user)
            return successResponse(200, "Campaign fetched successfully", result)
        except AppException as e:
            raise e

    async def update(self, request: Request, campaign_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update(campaign_id=campaign_id, payload=payload, user=user)
            return successResponse(200, "Campaign updated successfully", result)
        except AppException as e:
            raise e

    async def update_status(self, request: Request, campaign_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update_status(campaign_id=campaign_id, payload=payload, user=user)
            return successResponse(200, f"Campaign status updated to '{result.get('status')}'", result)
        except AppException as e:
            raise e

    async def delete(self, request: Request, campaign_id: str):
        try:
            user = request.state.user
            await self.service.delete(campaign_id=campaign_id, user=user)
            return successResponse(200, "Campaign deleted successfully")
        except AppException as e:
            raise e

    # ─── Campaign Lead Operations ─────────────────────────────────────────────

    async def import_leads(self, request: Request, campaign_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.import_leads(
                campaign_id=campaign_id,
                payload=payload,
                user=user,
            )
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)
            message = f"Successfully imported {inserted} lead{'s' if inserted != 1 else ''}"
            if skipped:
                message += f". Skipped {skipped} duplicate{'s' if skipped != 1 else ''}"
            return successResponse(201, message, result)
        except AppException as e:
            raise e

    async def get_campaign_leads(self, request: Request, campaign_id: str):
        try:
            user = request.state.user
            filters = request.query_params
            result = await self.service.get_campaign_leads(
                campaign_id=campaign_id,
                filters=filters,
                user=user,
            )
            return successResponse(200, "Campaign leads fetched successfully", result)
        except AppException as e:
            raise e

    async def update_lead_status(
        self,
        request: Request,
        campaign_id: str,
        campaign_lead_id: str,
        payload: Dict[str, Any],
    ):
        try:
            user = request.state.user
            result = await self.service.update_lead_status(
                campaign_id=campaign_id,
                campaign_lead_id=campaign_lead_id,
                payload=payload,
                user=user,
            )
            return successResponse(200, "Campaign lead status updated", result)
        except AppException as e:
            raise e

    async def assign_lead(
        self,
        request: Request,
        campaign_id: str,
        campaign_lead_id: str,
        payload: Dict[str, Any],
    ):
        try:
            user = request.state.user
            result = await self.service.assign_lead(
                campaign_id=campaign_id,
                campaign_lead_id=campaign_lead_id,
                payload=payload,
                user=user,
            )
            return successResponse(200, "Lead assigned successfully", result)
        except AppException as e:
            raise e

    # ─── Distribution ─────────────────────────────────────────────────────────

    async def distribute_equal(self, request: Request, campaign_id: str):
        try:
            user = request.state.user
            result = await self.service.distribute_equal(campaign_id=campaign_id, user=user)
            distributed = result.get("distributed", 0)
            return successResponse(
                200,
                f"Distributed {distributed} lead{'s' if distributed != 1 else ''} equally across {result.get('agents', 0)} agent{'s' if result.get('agents', 0) != 1 else ''}",
                result,
            )
        except AppException as e:
            raise e

    async def claim_next_lead(self, request: Request, campaign_id: str):
        try:
            user = request.state.user
            result = await self.service.claim_next_lead(campaign_id=campaign_id, user=user)
            if result.get("claimed"):
                return successResponse(200, "Lead claimed successfully", result)
            return successResponse(200, "No unassigned leads available", result)
        except AppException as e:
            raise e
