
from app.utils.custom_exception import AppException
from app.repositories.permissions_repository import PermissionRepository
from fastapi.encoders import jsonable_encoder

class PermissionService:
    def __init__(self):
        self.repo = PermissionRepository()


    async def get_all(self):
        try:
            result = await self.repo.get_all_without_pagination()

            if not result:
                raise AppException(404, "Permissions data not found")
            
            return jsonable_encoder(result)

        except AppException:
            raise