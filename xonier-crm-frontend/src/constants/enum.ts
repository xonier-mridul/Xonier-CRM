

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

  // Design
  UI_UX_DESIGN = "ui_ux_design",
  GRAPHIC_DESIGN = "graphic_design",
  BRANDING = "branding",

  // Marketing
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
  deleteTeamCategory="team_cat:delete"
}
