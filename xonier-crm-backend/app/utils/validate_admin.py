from app.core.constants import SUPER_ADMIN_CODE



async def validate_admin(userRole: str)->bool:
    if userRole == SUPER_ADMIN_CODE:
        return True
    
    return False
