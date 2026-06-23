from app.core.constants import SUPER_ADMIN_CODE, COMPANY_ADMIN_CODE



def validate_admin(userRole)->bool:
    
    for item in userRole:
        print("users role: ", userRole)
        if item["code"] == SUPER_ADMIN_CODE:
            return True
    
    return False


def validate_company_admin(userRole)->bool:
    for item in userRole:
        if item["code"] == COMPANY_ADMIN_CODE:
            return True
    
    return False


def validate_admin_company_admin(userRole)->bool:

    isA = False
    isC = False

    for item in userRole:
        if item["code"] == SUPER_ADMIN_CODE:
            isA = True
    
    for item in userRole:
        if item["code"] == COMPANY_ADMIN_CODE:
            isC = True

    return isA or isC



        



