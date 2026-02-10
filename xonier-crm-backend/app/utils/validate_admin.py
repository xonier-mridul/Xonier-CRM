from app.core.constants import SUPER_ADMIN_CODE



def validate_admin(userRole)->bool:
    
    for item in userRole:
        if item["code"] == SUPER_ADMIN_CODE:
            return True
    
    return False
