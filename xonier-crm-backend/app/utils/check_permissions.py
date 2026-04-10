

from typing import List
from beanie import PydanticObjectId
from app.repositories.permissions_repository import PermissionRepository
from app.core.constants import SUPER_ADMIN_CODE

permission_repo = PermissionRepository()

async def check_permission(user: dict, permissions: List[str]) -> bool:

    print("aajaa: ")
    roles = user.get("userRole", [])

    if any(role.get("code") == SUPER_ADMIN_CODE for role in roles):
        return True

    user_permission_ids = []
    for role in user["userRole"]:
        for perm in role.get("permissions", []):
            user_permission_ids.append(PydanticObjectId(perm["id"]))

    if not user_permission_ids:
        return False

    user_permissions = await permission_repo.get_permissions_code(ids=user_permission_ids)
    user_permissions_set = set(user_permissions)
    required_set = set(permissions)

    return bool(user_permissions_set.intersection(required_set))