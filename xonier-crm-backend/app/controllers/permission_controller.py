from app.utils.custom_exception import AppException
from app.services.permission_service import PermissionService
from app.utils.custom_response import successResponse

class PermissionController:
    def __init__(self):
        self.service = PermissionService()

    async def get_all(self):
        try:

            result = await self.service.get_all()

            return successResponse(200, "Permission data get successfully", result)
        
        except AppException as e:
            raise e
