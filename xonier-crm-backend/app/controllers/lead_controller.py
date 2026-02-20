
from fastapi import Request
from typing import Dict, Any, List
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.lead_service import LeadService
from app.schemas.lead_schema import BulkReassignLeadSchema


class LeadController:
    def __init__(self):
        self.service = LeadService()


    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(payload=payload, user=user)
            return successResponse(201, f"{result.get("fullName")} query created successfully", result)


        except AppException as e:
            raise e
        

    async def bulk_create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            
            result = await self.service.bulk_create(payload=payload, user=user)

            
            
            
            inserted = result.get('inserted', 0)
            skipped = result.get('skipped', 0)
            
            message = f"Successfully created {inserted} lead{'s' if inserted != 1 else ''}"
            if skipped > 0:
                message += f". Skipped {skipped} duplicate{'s' if skipped != 1 else ''}"
            print("result: ", message)
            return successResponse(201, message, result)

        except AppException as e:
            raise e

    async def bulk_reassign_lead(self, request: Request, payload: BulkReassignLeadSchema):
        try:
            user = request.state.user
            result = await self.service.bulk_lead_reassign(
                payload=payload.model_dump(mode="json"),
                user=user
            )
            return successResponse(200, "Leads reassigned successfully", result)

        except AppException as e:
            raise e

    async def bulk_lead_assign(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.bulk_lead_assign( 
                payload=payload,
                user=user
            )

            return successResponse(200, "Leads assigned successfully", data=result)

        except AppException as e:
            raise e

        

        
    async def get_all(self, request: Request):
        try:
            filters = request.query_params
            user_data = request.state.user
            
            result = await self.service.get_all(filters=filters, user=user_data)
            return successResponse(200, "Leads data fetched successfully", result)

        except AppException as e:
            print("err: ", e)
            raise e
        
    async def get_all_by_user(self, request: Request):
        try:
            filters = request.query_params
            user_data = request.state.user
            
            result = await self.service.get_all_by_user(filters=filters, user=user_data)
            return successResponse(200, "User leads data fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_won_leads(self, request: Request):
        try:
            user = request.state.user
            filters = request.query_params

            result = await self.service.get_won_leads(filters=filters ,user=user)
            return successResponse(200, "Leads data fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_by_id(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.get_by_id(id=id, user=user)

            return successResponse(200, f"{result["lead_id"]} lead fetched successfully", result)
        

        except AppException as e:
            raise e
        
    async def update(self,request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update(leadId=id, payload=payload, user=user)
            return successResponse(200, f"lead updated successfully")

        except AppException as e:
            raise e
        
    
    async def lead_update(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update_status(leadId=id, payload=payload, user=user)

            return successResponse(status_code=200, message=f" {result["fullName"]} status updated to {result["status"]} successfully")
        
        except AppException as e:
            raise e
        
    async def delete(self, request: Request, id:str):
        try:

            user = request.state.user
            await self.service.delete(id, user)

            return successResponse(200, "Lead deleted successfully")
        
        
        except AppException as e:
            raise e 
        
