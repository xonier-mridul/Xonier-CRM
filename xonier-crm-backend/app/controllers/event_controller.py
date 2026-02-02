from typing import Dict, Any
from fastapi import Request
from app.utils.custom_exception import AppException
from app.services.event_service import EventService
from app.utils.custom_response import successResponse

class EventController:
    def __init__(self):
        self.service = EventService()

    async def create(self, request:Request, payload:Dict[str,Any]):
        try:

            user = request.state.user

            result = await self.service.create(payload=payload, user=user)

            return successResponse(status_code=200, message="Event created successfully", data=result)



        except AppException as e:
            raise e
        

    async def get_all(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.get_all()

            return successResponse(200, "Fetch all events successfully", result)

        except AppException as e:
            raise e
        

    async def delete(self, request: Request, eventId: str):
        try:
           user = request.state.user
           await self.service.delete(user=user, eventId=eventId)

           return successResponse(200, "Event deleted successfully")


        except AppException as e:
            raise e


        
    