from pydantic import BaseModel
from enum import Enum


class USER_ROLES(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    SALES = "sales"
    SUPPORT = "support"
    USER = "user"

class USER_STATUS(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class OTP_TYPE(str, Enum):
    EMAIL_VERIFICATION = "email_verification"
    PHONE_VERIFICATION = "phone_verification"

    LOGIN = "login"
    TWO_FACTOR_AUTH = "two_factor_auth"

    PASSWORD_RESET = "password_reset"
    CHANGE_PASSWORD = "change_password"

    ACCOUNT_RECOVERY = "account_recovery"

    TRANSACTION = "transaction"
    PAYMENT_CONFIRMATION = "payment_confirmation"

    INVITE_ACCEPTANCE = "invite_acceptance"

class OTP_EXPIRY(int, Enum):
    TEN_MINUTS = 10
    FIFTEEN_MINUTS = 15
    THIRTY_MINUTS = 30




class PROJECT_TYPES(str, Enum):
   
    MOBILE_APP = "mobile_app"
    WEBSITE = "website"
    WEB_APP = "web_app"
    CRM = "crm"
    ERP = "erp"
    CUSTOM_SOFTWARE = "custom_software"

    
    AI_ML = "ai_ml"
    DATA_SCIENCE = "data_science"
    BLOCKCHAIN = "blockchain"
    IOT = "iot"


    UI_UX_DESIGN = "ui_ux_design"
    GRAPHIC_DESIGN = "graphic_design"
    BRANDING = "branding"


    DIGITAL_MARKETING = "digital_marketing"
    SEO = "seo"
    SOCIAL_MEDIA_MARKETING = "social_media_marketing"
    CONTENT_MARKETING = "content_marketing"


    TESTING = "testing"
    QA_AUTOMATION = "qa_automation"
    MAINTENANCE_SUPPORT = "maintenance_support"

    CLOUD_SERVICES = "cloud_services"
    DEVOPS = "devops"
    CYBER_SECURITY = "cyber_security"


    ECOMMERCE = "ecommerce"
    CMS = "cms"

    IT_CONSULTING = "it_consulting"
    PRODUCT_CONSULTING = "product_consulting"

class SALES_STATUS(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"

class PRIORITY(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class SOURCE(str, Enum):
   
    WEBSITE = "website"
    CHATBOT = "chatbot"
    EMAIL = "email"
    NEWSLETTER = "newsletter"

    CALL = "call"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    WALK_IN = "walk_in"

    AD = "ad"
    GOOGLE_ADS = "google_ads"
    FACEBOOK_ADS = "facebook_ads"
    LINKEDIN_ADS = "linkedin_ads"
    INSTAGRAM_ADS = "instagram_ads"

    REFERRAL = "referral"
    PARTNER = "partner"
    AFFILIATE = "affiliate"
    RESELLER = "reseller"

    COLD_CALL = "cold_call"
    COLD_EMAIL = "cold_email"
    LINKEDIN_OUTREACH = "linkedin_outreach"

    UPWORK = "upwork"
    FIVERR = "fiverr"
    FREELANCER = "freelancer"
    TOPTAL = "toptal"

    EVENT = "event"
    CONFERENCE = "conference"
    MEETUP = "meetup"
    EXHIBITION = "exhibition"

    OTHER = "other"






