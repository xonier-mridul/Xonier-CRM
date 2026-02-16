from app.core.config import get_setting

settings = get_setting()

JWT_OPTIONS = {
    "httponly": True,
    "secure": False,
    "samesite": "lax",
    "path": "/",
    
}



# AUTH

GET_ME_NAMESPACE:str = "auth:me"


# LEAD

LEAD_CACHE_NAMESPACE:str = "leads:list"

USER_LEAD_CACHE_NAMESPACE:str = "userleads:list"



# DEAL

DEAL_CACHE_NAMESPACE:str = "deals:list"
DEAL_CACHE_NAMESPACE_BY_ID:str = "deal:userId"

# NOTE

NOTE_CACHE_NAMESPACE:str = "notes:publicList"

NOTE_PRIVATE_CACHE_NAMESPACE = "notes:privateList"




SUPER_ADMIN_CODE:str = "SUPER_ADMIN"
MANGER_CODE:str = "MANAGER"

COMPANY_LOGO_LINK:str = "https://xoniertechnologies.com/asset/images/logo.png"
COMPANY_ADDRESS:str = "H-161, Office No: 202, Second Floor, H Block, Sector 63, Noida, India"
