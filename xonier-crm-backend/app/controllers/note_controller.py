
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.note_service import NoteService
from typing import Dict, Any

class NoteController:
    def __init__(self):
        self.service = NoteService()


    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(payload, user)

            return successResponse(200, f"{payload["title"]} note created successfully", result)



        except AppException as e:
            raise e
        
        
    async def get_all_active(self, request: Request):
        try:
            user = request.state.user

            filters = request.query_params
            result = await self.service.get_all_active(filters=filters, user=user)

            return successResponse(200, f"All active notes data fetched successfully", result)
        
        except AppException as e:
            raise e
        

    async def get_private_notes_by_creator(self, request: Request):
        try:
            user = request.state.user

            filters = request.query_params
            result = await self.service.get_private_notes_by_creator(filters=filters, user=user)

            return successResponse(200, f"All private notes data fetched successfully", result)
        
        except AppException as e:
            raise e
        

    async def update_pinned_status(self, id:str, request: Request):
        try:
            user = request.state.user

            result = await self.service.update_pinned_status(id, user)

            return successResponse(200, f"{result["title"]} status changed to {result["isPinned"]} successfully", result)

        except AppException as e:
            raise e
        

        


    async def soft_delete(self, id:str, request: Request):
        try:
            user = request.state.user

            await self.service.soft_delete(id, user)

            return successResponse(200, "Note delete successfully")

        
        except AppException as e:
            raise e

        
