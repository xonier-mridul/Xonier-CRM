

export enum PROJECT_TYPES {
  // Core Development
  MOBILE_APP = "mobile_app",
  WEBSITE = "website",
  WEB_APP = "web_app",
  CRM = "crm",
  ERP = "erp",
  CUSTOM_SOFTWARE = "custom_software",

  // Emerging Tech
  AI_ML = "ai_ml",
  DATA_SCIENCE = "data_science",
  BLOCKCHAIN = "blockchain",
  IOT = "iot",

  UI_UX_DESIGN = "ui_ux_design",
  GRAPHIC_DESIGN = "graphic_design",
  BRANDING = "branding",


  DIGITAL_MARKETING = "digital_marketing",
  SEO = "seo",
  SOCIAL_MEDIA_MARKETING = "social_media_marketing",
  CONTENT_MARKETING = "content_marketing",

  // Testing & Support
  TESTING = "testing",
  QA_AUTOMATION = "qa_automation",
  MAINTENANCE_SUPPORT = "maintenance_support",

  // Infrastructure
  CLOUD_SERVICES = "cloud_services",
  DEVOPS = "devops",
  CYBER_SECURITY = "cyber_security",

  // E-commerce & CMS
  ECOMMERCE = "ecommerce",
  CMS = "cms",

  // Consulting
  IT_CONSULTING = "it_consulting",
  PRODUCT_CONSULTING = "product_consulting",
}


export enum SALES_STATUS {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  PROPOSAL = "proposal",
  WON = "won",
  LOST = "lost",
}


export enum PRIORITY {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}


export enum SOURCE {
  // Online / Digital
  WEBSITE = "website",
  CHATBOT = "chatbot",
  EMAIL = "email",
  NEWSLETTER = "newsletter",

  // Direct Sales
  CALL = "call",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  WALK_IN = "walk_in",

  // Ads & Marketing
  AD = "ad",
  GOOGLE_ADS = "google_ads",
  FACEBOOK_ADS = "facebook_ads",
  LINKEDIN_ADS = "linkedin_ads",
  INSTAGRAM_ADS = "instagram_ads",

  // Referrals & Partners
  REFERRAL = "referral",
  PARTNER = "partner",
  AFFILIATE = "affiliate",
  RESELLER = "reseller",

  // Outreach
  COLD_CALL = "cold_call",
  COLD_EMAIL = "cold_email",
  LINKEDIN_OUTREACH = "linkedin_outreach",

  // Marketplaces
  UPWORK = "upwork",
  FIVERR = "fiverr",
  FREELANCER = "freelancer",
  TOPTAL = "toptal",

  // Offline / Events
  EVENT = "event",
  CONFERENCE = "conference",
  MEETUP = "meetup",
  EXHIBITION = "exhibition",

  // Other
  OTHER = "other",
}

export enum PERMISSIONS {
  createUser = "user:create",
  readUser = "user:read",
  updateUser = "user:update",
  deleteUser = "user:delete",
  createRole = "role:create",
  readRole = "role:read",
  updateRole = "role:update",
  deleteRole = "role:delete",
  createEnquiry = "enquiry:create",
  readEnquiry = "enquiry:read",
  updateEnquiry = "enquiry:update",
  deleteEnquiry = "enquiry:delete",
  createLead = "lead:create",
  readLead = "lead:read",
  updateLead = "lead:update",
  deleteLead = "lead:delete",
  createTeam = "team:create",
  readTeam = "team:read",
  updateTeam = "team:update",
  deleteTeam = "team:delete",
  createTeamCategory= "team_cat:create",
  readTeamCategory= "team_cat:read",
  updateTeamCategory="team_cat:update",
  deleteTeamCategory="team_cat:delete",
  createDeal = "deal:create",
  readDeal = "deal:read",
  updateDeal = "deal:update",
  deleteDeal = "deal:delete",
  createQuote = "quote:create",
  readQuote = "quote:read",
  updateQuote = "quote:update",
  quoteDelete = "quote:delete"
}


export enum COUNTRY_CODE {
  AFGHANISTAN = "AF",
  ALAND_ISLANDS = "AX",
  ALBANIA = "AL",
  ALGERIA = "DZ",
  AMERICAN_SAMOA = "AS",
  ANDORRA = "AD",
  ANGOLA = "AO",
  ANGUILLA = "AI",
  ANTARCTICA = "AQ",
  ANTIGUA_AND_BARBUDA = "AG",
  ARGENTINA = "AR",
  ARMENIA = "AM",
  ARUBA = "AW",
  AUSTRALIA = "AU",
  AUSTRIA = "AT",
  AZERBAIJAN = "AZ",
  BAHAMAS = "BS",
  BAHRAIN = "BH",
  BANGLADESH = "BD",
  BARBADOS = "BB",
  BELARUS = "BY",
  BELGIUM = "BE",
  BELIZE = "BZ",
  BENIN = "BJ",
  BERMUDA = "BM",
  BHUTAN = "BT",
  BOLIVIA = "BO",
  BOSNIA_AND_HERZEGOVINA = "BA",
  BOTSWANA = "BW",
  BRAZIL = "BR",
  BRUNEI = "BN",
  BULGARIA = "BG",
  BURKINA_FASO = "BF",
  BURUNDI = "BI",
  CAMBODIA = "KH",
  CAMEROON = "CM",
  CANADA = "CA",
  CAPE_VERDE = "CV",
  CAYMAN_ISLANDS = "KY",
  CENTRAL_AFRICAN_REPUBLIC = "CF",
  CHAD = "TD",
  CHILE = "CL",
  CHINA = "CN",
  COLOMBIA = "CO",
  COMOROS = "KM",
  CONGO = "CG",
  COSTA_RICA = "CR",
  CROATIA = "HR",
  CUBA = "CU",
  CYPRUS = "CY",
  CZECH_REPUBLIC = "CZ",
  DENMARK = "DK",
  DJIBOUTI = "DJ",
  DOMINICA = "DM",
  DOMINICAN_REPUBLIC = "DO",
  ECUADOR = "EC",
  EGYPT = "EG",
  EL_SALVADOR = "SV",
  ESTONIA = "EE",
  ETHIOPIA = "ET",
  FINLAND = "FI",
  FRANCE = "FR",
  GABON = "GA",
  GEORGIA = "GE",
  GERMANY = "DE",
  GHANA = "GH",
  GREECE = "GR",
  GREENLAND = "GL",
  GRENADA = "GD",
  GUATEMALA = "GT",
  GUINEA = "GN",
  GUYANA = "GY",
  HAITI = "HT",
  HONDURAS = "HN",
  HONG_KONG = "HK",
  HUNGARY = "HU",
  ICELAND = "IS",
  INDIA = "IN",
  INDONESIA = "ID",
  IRAN = "IR",
  IRAQ = "IQ",
  IRELAND = "IE",
  ISRAEL = "IL",
  ITALY = "IT",
  JAMAICA = "JM",
  JAPAN = "JP",
  JORDAN = "JO",
  KAZAKHSTAN = "KZ",
  KENYA = "KE",
  KUWAIT = "KW",
  LATVIA = "LV",
  LEBANON = "LB",
  LITHUANIA = "LT",
  LUXEMBOURG = "LU",
  MALAYSIA = "MY",
  MALDIVES = "MV",
  MEXICO = "MX",
  MOLDOVA = "MD",
  MONACO = "MC",
  MONGOLIA = "MN",
  MOROCCO = "MA",
  MYANMAR = "MM",
  NEPAL = "NP",
  NETHERLANDS = "NL",
  NEW_ZEALAND = "NZ",
  NIGERIA = "NG",
  NORTH_KOREA = "KP",
  NORWAY = "NO",
  OMAN = "OM",
  PAKISTAN = "PK",
  PANAMA = "PA",
  PERU = "PE",
  PHILIPPINES = "PH",
  POLAND = "PL",
  PORTUGAL = "PT",
  QATAR = "QA",
  ROMANIA = "RO",
  RUSSIA = "RU",
  SAUDI_ARABIA = "SA",
  SINGAPORE = "SG",
  SLOVAKIA = "SK",
  SLOVENIA = "SI",
  SOUTH_AFRICA = "ZA",
  SOUTH_KOREA = "KR",
  SPAIN = "ES",
  SRI_LANKA = "LK",
  SWEDEN = "SE",
  SWITZERLAND = "CH",
  TAIWAN = "TW",
  THAILAND = "TH",
  TURKEY = "TR",
  UKRAINE = "UA",
  UNITED_ARAB_EMIRATES = "AE",
  UNITED_KINGDOM = "GB",
  UNITED_STATES = "US",
  URUGUAY = "UY",
  UZBEKISTAN = "UZ",
  VIETNAM = "VN",
  YEMEN = "YE",
  ZAMBIA = "ZM",
  ZIMBABWE = "ZW"
}


export enum LANGUAGE_CODE {
  ENGLISH = "en",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  ITALIAN = "it",
  PORTUGUESE = "pt",
  DUTCH = "nl",
  RUSSIAN = "ru",
  UKRAINIAN = "uk",
  POLISH = "pl",
  CZECH = "cs",
  SLOVAK = "sk",
  HUNGARIAN = "hu",
  ROMANIAN = "ro",
  BULGARIAN = "bg",
  GREEK = "el",
  TURKISH = "tr",

  ARABIC = "ar",
  HEBREW = "he",
  PERSIAN = "fa",
  URDU = "ur",

  HINDI = "hi",
  BENGALI = "bn",
  TAMIL = "ta",
  TELUGU = "te",
  MARATHI = "mr",
  GUJARATI = "gu",
  KANNADA = "kn",
  MALAYALAM = "ml",
  PUNJABI = "pa",

  CHINESE = "zh",
  JAPANESE = "ja",
  KOREAN = "ko",
  THAI = "th",
  VIETNAMESE = "vi",
  INDONESIAN = "id",
  MALAY = "ms",
  FILIPINO = "tl",

  SWEDISH = "sv",
  NORWEGIAN = "no",
  DANISH = "da",
  FINNISH = "fi",
  ICELANDIC = "is",

  AFRIKAANS = "af",
  SWAHILI = "sw",
  ZULU = "zu",

  LATIN = "la"
}


export enum EMPLOYEE_SENIORITY {
  ENTRY_LEVEL = "entry_level",
  MID_LEVEL = "mid_level",
  SENIOR_LEVEL = "senior_level",
  LEAD = "lead",
  MANAGER = "manager",
  DIRECTOR = "director",
  VP = "vp",
  C_LEVEL = "c_level",
  OWNER = "owner"
}

export enum INDUSTRIES {
  TECHNOLOGIES = "technologies",
  HEALTHCARE = "healthcare",
  FINANCE = "finance",
  EDUCATION = "education",
  MANUFACTURING = "manufacturing",
  RETAIL = "retail",
  CONSULTING = "consulting",
  REAL_ESTATE = "real_estate",
  OTHER = "other"
}

export enum FORM_FIELD_MODULE {
  LEAD = "lead",
  DEAL = "deal"
}

export enum DEAL_PIPELINE {
  QUALIFICATION = "qualification",
  REQUIREMENT_ANALYSIS = "requirement_analysis",
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  WON = "won",
  LOST = "lost",
}


export enum DEAL_STAGES {
  QUALIFICATION = "qualification",
  REQUIREMENT_ANALYSIS = "requirement_analysis",
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  WON = "won",
  LOST = "lost",
}


export enum DEAL_TYPE {
  NEW_BUSINESS = "new_business",
  EXISTING_BUSINESS = "existing_business",
  PARTNERSHIP = "partnership",
  OTHER = "other",
}


export enum FORECAST_CATEGORY {
  PIPELINE = "pipeline",
  BEST_CASE = "best_case",
  COMMIT = "commit",
  CLOSED = "closed",
}


export enum QuotationStatus {
  DRAFT = "draft",
  SENT = "sent",
  UPDATED = "updated",
  RESEND = "resend",
  VIEWED = "viewed",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  DELETE = "delete"
}

export enum QUOTATION_EVENT_TYPE{
    CREATED = "created",
    UPDATED = "updated",
    STATUS_CHANGED = "status_changed",
    EMAIL_SENT = "email_sent",
    RESEND = "resend",
    VIEWED = "viewed",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    EXPIRED = "expired",
    DELETE = "delete",
}


export enum EventType {
  MEETING = "meeting",
  TODO = "todo",
  NOTE = "note",
  TASK = "task",
  REMINDER = "reminder"
}

