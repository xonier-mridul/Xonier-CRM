from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.activity_service import ActivityService
from typing import Dict, Any


class ActivityController:
    def __init__(self):
        self.service = ActivityService()

    async def get_user_activity(self, id: str, request: Request):
        try:
            user = request.state.user
            query_params = dict(request.query_params)

            result = await self.service.get_user_activity(
                user_id=id,
                current_user=user,
                filters=query_params
            )

            return successResponse(
                200,
                "User activity fetched successfully",
                result
            )

        except AppException as e:
            raise e
    




    async def get_user_activity_summary(self, id: str, request: Request):
        user = request.state.user
        filters = dict(request.query_params)

        result = await self.service.get_user_activity_summary(
            user_id=id,
            current_user=user,
            filters=filters
        )

        return successResponse(
            200,
            "User activity summary fetched successfully",
            result
        )
    

    async def call_activity(self, request: Request, payload: Dict[str, Any]):
        try: 
            user = request.state.user

            ip = request.client.host

            user_agent = request.headers.get("user-agent")

            result = await self.service.call_activity(payload=payload, ip=ip, agent=user_agent, user=user)

            number = payload.get("number", "N/A")

            return successResponse(200, f"Call log created successfully against {number}", result)
        
        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update_call_activity(self, id:str,request: Request,  payload: Dict[str, Any] ):
        try:
            user = request.state.user

            result = await self.service.update_call_activity(id, payload, user)

            

            return successResponse(200, f"Call log updated successfully ")

        except AppException as e:
            raise e

        except Exception as e:
                raise AppException(500, f"Internal server error")
        

