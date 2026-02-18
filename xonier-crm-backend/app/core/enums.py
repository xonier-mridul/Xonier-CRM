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
    DELETE = "delete"

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


class COUNTRY_CODE(str, Enum):
    AFGHANISTAN = "AF"
    ALAND_ISLANDS = "AX"
    ALBANIA = "AL"
    ALGERIA = "DZ"
    AMERICAN_SAMOA = "AS"
    ANDORRA = "AD"
    ANGOLA = "AO"
    ANGUILLA = "AI"
    ANTARCTICA = "AQ"
    ANTIGUA_AND_BARBUDA = "AG"
    ARGENTINA = "AR"
    ARMENIA = "AM"
    ARUBA = "AW"
    AUSTRALIA = "AU"
    AUSTRIA = "AT"
    AZERBAIJAN = "AZ"
    BAHAMAS = "BS"
    BAHRAIN = "BH"
    BANGLADESH = "BD"
    BARBADOS = "BB"
    BELARUS = "BY"
    BELGIUM = "BE"
    BELIZE = "BZ"
    BENIN = "BJ"
    BERMUDA = "BM"
    BHUTAN = "BT"
    BOLIVIA = "BO"
    BOSNIA_AND_HERZEGOVINA = "BA"
    BOTSWANA = "BW"
    BOUVET_ISLAND = "BV"
    BRAZIL = "BR"
    BRITISH_INDIAN_OCEAN_TERRITORY = "IO"
    BRUNEI = "BN"
    BULGARIA = "BG"
    BURKINA_FASO = "BF"
    BURUNDI = "BI"
    CAMBODIA = "KH"
    CAMEROON = "CM"
    CANADA = "CA"
    CAPE_VERDE = "CV"
    CAYMAN_ISLANDS = "KY"
    CENTRAL_AFRICAN_REPUBLIC = "CF"
    CHAD = "TD"
    CHILE = "CL"
    CHINA = "CN"
    CHRISTMAS_ISLAND = "CX"
    COCOS_KEELING_ISLANDS = "CC"
    COLOMBIA = "CO"
    COMOROS = "KM"
    CONGO = "CG"
    CONGO_DEMOCRATIC_REPUBLIC = "CD"
    COOK_ISLANDS = "CK"
    COSTA_RICA = "CR"
    COTE_DIVOIRE = "CI"
    CROATIA = "HR"
    CUBA = "CU"
    CYPRUS = "CY"
    CZECH_REPUBLIC = "CZ"
    DENMARK = "DK"
    DJIBOUTI = "DJ"
    DOMINICA = "DM"
    DOMINICAN_REPUBLIC = "DO"
    ECUADOR = "EC"
    EGYPT = "EG"
    EL_SALVADOR = "SV"
    EQUATORIAL_GUINEA = "GQ"
    ERITREA = "ER"
    ESTONIA = "EE"
    ESWATINI = "SZ"
    ETHIOPIA = "ET"
    FALKLAND_ISLANDS = "FK"
    FAROE_ISLANDS = "FO"
    FIJI = "FJ"
    FINLAND = "FI"
    FRANCE = "FR"
    FRENCH_GUIANA = "GF"
    FRENCH_POLYNESIA = "PF"
    GABON = "GA"
    GAMBIA = "GM"
    GEORGIA = "GE"
    GERMANY = "DE"
    GHANA = "GH"
    GIBRALTAR = "GI"
    GREECE = "GR"
    GREENLAND = "GL"
    GRENADA = "GD"
    GUADELOUPE = "GP"
    GUAM = "GU"
    GUATEMALA = "GT"
    GUERNSEY = "GG"
    GUINEA = "GN"
    GUINEA_BISSAU = "GW"
    GUYANA = "GY"
    HAITI = "HT"
    HONDURAS = "HN"
    HONG_KONG = "HK"
    HUNGARY = "HU"
    ICELAND = "IS"
    INDIA = "IN"
    INDONESIA = "ID"
    IRAN = "IR"
    IRAQ = "IQ"
    IRELAND = "IE"
    ISLE_OF_MAN = "IM"
    ISRAEL = "IL"
    ITALY = "IT"
    JAMAICA = "JM"
    JAPAN = "JP"
    JERSEY = "JE"
    JORDAN = "JO"
    KAZAKHSTAN = "KZ"
    KENYA = "KE"
    KIRIBATI = "KI"
    KUWAIT = "KW"
    KYRGYZSTAN = "KG"
    LAOS = "LA"
    LATVIA = "LV"
    LEBANON = "LB"
    LESOTHO = "LS"
    LIBERIA = "LR"
    LIBYA = "LY"
    LIECHTENSTEIN = "LI"
    LITHUANIA = "LT"
    LUXEMBOURG = "LU"
    MACAO = "MO"
    MADAGASCAR = "MG"
    MALAWI = "MW"
    MALAYSIA = "MY"
    MALDIVES = "MV"
    MALI = "ML"
    MALTA = "MT"
    MARSHALL_ISLANDS = "MH"
    MARTINIQUE = "MQ"
    MAURITANIA = "MR"
    MAURITIUS = "MU"
    MEXICO = "MX"
    MICRONESIA = "FM"
    MOLDOVA = "MD"
    MONACO = "MC"
    MONGOLIA = "MN"
    MONTENEGRO = "ME"
    MOROCCO = "MA"
    MOZAMBIQUE = "MZ"
    MYANMAR = "MM"
    NAMIBIA = "NA"
    NAURU = "NR"
    NEPAL = "NP"
    NETHERLANDS = "NL"
    NEW_ZEALAND = "NZ"
    NICARAGUA = "NI"
    NIGER = "NE"
    NIGERIA = "NG"
    NORTH_KOREA = "KP"
    NORTH_MACEDONIA = "MK"
    NORWAY = "NO"
    OMAN = "OM"
    PAKISTAN = "PK"
    PANAMA = "PA"
    PAPUA_NEW_GUINEA = "PG"
    PARAGUAY = "PY"
    PERU = "PE"
    PHILIPPINES = "PH"
    POLAND = "PL"
    PORTUGAL = "PT"
    PUERTO_RICO = "PR"
    QATAR = "QA"
    ROMANIA = "RO"
    RUSSIA = "RU"
    RWANDA = "RW"
    SAUDI_ARABIA = "SA"
    SENEGAL = "SN"
    SERBIA = "RS"
    SINGAPORE = "SG"
    SLOVAKIA = "SK"
    SLOVENIA = "SI"
    SOUTH_AFRICA = "ZA"
    SOUTH_KOREA = "KR"
    SPAIN = "ES"
    SRI_LANKA = "LK"
    SUDAN = "SD"
    SURINAME = "SR"
    SWEDEN = "SE"
    SWITZERLAND = "CH"
    SYRIA = "SY"
    TAIWAN = "TW"
    TAJIKISTAN = "TJ"
    TANZANIA = "TZ"
    THAILAND = "TH"
    TOGO = "TG"
    TONGA = "TO"
    TRINIDAD_AND_TOBAGO = "TT"
    TUNISIA = "TN"
    TURKEY = "TR"
    TURKMENISTAN = "TM"
    UGANDA = "UG"
    UKRAINE = "UA"
    UNITED_ARAB_EMIRATES = "AE"
    UNITED_KINGDOM = "GB"
    UNITED_STATES = "US"
    URUGUAY = "UY"
    UZBEKISTAN = "UZ"
    VENEZUELA = "VE"
    VIETNAM = "VN"
    YEMEN = "YE"
    ZAMBIA = "ZM"
    ZIMBABWE = "ZW"



class LANGUAGE_CODE(str, Enum):
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    ITALIAN = "it"
    PORTUGUESE = "pt"
    DUTCH = "nl"
    RUSSIAN = "ru"
    UKRAINIAN = "uk"
    POLISH = "pl"
    CZECH = "cs"
    SLOVAK = "sk"
    HUNGARIAN = "hu"
    ROMANIAN = "ro"
    BULGARIAN = "bg"
    GREEK = "el"
    TURKISH = "tr"

    ARABIC = "ar"
    HEBREW = "he"
    PERSIAN = "fa"
    URDU = "ur"

    HINDI = "hi"
    BENGALI = "bn"
    TAMIL = "ta"
    TELUGU = "te"
    MARATHI = "mr"
    GUJARATI = "gu"
    KANNADA = "kn"
    MALAYALAM = "ml"
    PUNJABI = "pa"

    CHINESE_SIMPLIFIED = "zh"
    JAPANESE = "ja"
    KOREAN = "ko"
    THAI = "th"
    VIETNAMESE = "vi"
    INDONESIAN = "id"
    MALAY = "ms"
    FILIPINO = "tl"

    SWEDISH = "sv"
    NORWEGIAN = "no"
    DANISH = "da"
    FINNISH = "fi"
    ICELANDIC = "is"

    AFRIKAANS = "af"
    SWAHILI = "sw"
    ZULU = "zu"

    LATIN = "la"

class INDUSTRIES(str, Enum):
    TECHNOLOGIES= "technologies"
    HEALTHCARE="healthcare"
    FINANCE="finance"
    EDUCATION="education"
    MANUFACTURING="manufacturing"
    RETAIL="retail"
    CONSULTING="consulting"
    REALESTATE="real_estate"
    OTHER="other"

class EMPLOYEE_SENIORITY(str, Enum):
    ENTRY_LEVEL="entry_level"
    MID_LEVEL="mid_level"
    SENIOR_LEVEL="senior_level"
    LEAD = "lead"
    MANAGER="manager"
    DIRECTOR="director"
    VP="vp"
    C_LEVEL = "c_level"
    OWNER="owner"


class FORM_INPUT_TYPE(str, Enum):
    TEXT ="text",
    NUMBER =   "number",
    EMAIL =    "email",
    PHONE =    "phone",
    SELECT =   "select",
    TEXTAREA =  "textarea",
    DATE =  "date",
    CHECKBOX =  "checkbox"

class FORM_FIELD_MODULES(str, Enum):
    LEAD = "lead"
    DEAL = "deal"


class DEAL_PIPELINE(str, Enum):
   QUALIFICATION =  "qualification"
   REQUIREMENT_ANALYSIS = "requirement_analysis"
   PROPOSAL = "proposal"
   NEGOTIATION = "negotiation"
   WON = "won"
   LOST = "lost"

class DEAL_STAGES(str, Enum):
    QUALIFICATION =  "qualification"
    REQUIREMENT_ANALYSIS = "requirement_analysis"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"
    DELETE = "delete"


class DEAL_TYPE(str, Enum):
    NEW_BUSINESS = "new_business"
    EXISTING_BUSINESS = "existing_business"
    PARTNERSHIP = "partnership"
    OTHER = "other"

class DEAL_STATUS(str, Enum):
    ACTIVE="active"
    INACTIVE="inactive"
    DELETE="delete"



class FORECAST_CATEGORY(str, Enum):
    PIPELINE = "pipeline"
    BEST_CASE = "best_case"
    COMMIT = "commit"
    CLOSED = "closed"


class EVENT_TYPE(str, Enum):
    MEETING = "meeting"
    TODO = "todo"
    NOTE = "note"
    TASK = "task"
    REMINDER = "reminder"


class QuotationStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    UPDATED = "updated"
    RESEND = "resend"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    DELETE = "delete"



class QuotationEventType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_CHANGED = "status_changed"
    EMAIL_SENT = "email_sent"
    RESEND = "resend"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    DELETE = "delete"


class INVOICE_STATUS(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class NOTE_VISIBILITY(str, Enum):
    PRIVATE = "private"   
    TEAM = "team"        
    PUBLIC = "public" 

class NOTE_STATUS(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DELETE = "delete"

class NOTES_ENTITIES(str, Enum):
    LEAD = "lead"
    DEAL = "deal"
    QUOTATION = "quotation"
    INVOICE = "invoice"
    GENERAL = "general"


class ACTIVITY_ENTITY_TYPE(str, Enum):
    LEAD = "lead"
    DEAL = "deal"
    QUOTATION = "quotation"
    INVOICE = "invoice"

class ACTIVITY_ACTION(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    SENT = "sent"
    RESEND="resend"
    CONVERTED = "converted"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"
    DELETE = "delete"






