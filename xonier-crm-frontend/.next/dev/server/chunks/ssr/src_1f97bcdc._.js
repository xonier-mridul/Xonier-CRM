module.exports = [
"[project]/src/components/ui/ConfirmPopup.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sweetalert2$2f$dist$2f$sweetalert2$2e$esm$2e$all$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sweetalert2/dist/sweetalert2.esm.all.js [app-ssr] (ecmascript)");
;
const ConfirmPopup = async ({ title, text, btnTxt })=>{
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sweetalert2$2f$dist$2f$sweetalert2$2e$esm$2e$all$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: btnTxt ? btnTxt : "Yes"
    });
    return result.isConfirmed;
};
const __TURBOPACK__default__export__ = ConfirmPopup;
}),
"[project]/src/app/utils/roleCheck.utils.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/constants/constants.ts [app-ssr] (ecmascript)");
;
const checkRole = (permission, userRole)=>{
    if (userRole.some((i)=>i.code === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SUPER_ADMIN_ROLE_CODE"])) {
        return true;
    }
    for (let item of userRole){
        if (item.permissions?.some((i)=>i.code === permission)) {
            return true;
        }
    }
    return false;
};
const __TURBOPACK__default__export__ = checkRole;
}),
"[project]/src/hooks/usePermissions.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePermissions",
    ()=>usePermissions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$utils$2f$roleCheck$2e$utils$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/utils/roleCheck.utils.tsx [app-ssr] (ecmascript)");
;
;
;
const usePermissions = ()=>{
    const roles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSelector"])((state)=>state.auth?.user?.userRole || []);
    const hasPermission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (permission)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$utils$2f$roleCheck$2e$utils$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(permission, roles);
    }, [
        roles
    ]);
    return {
        hasPermission
    };
};
}),
"[project]/src/constants/enum.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACTIVITY_ACTION",
    ()=>ACTIVITY_ACTION,
    "ACTIVITY_ENTITY_TYPE",
    ()=>ACTIVITY_ENTITY_TYPE,
    "COUNTRY_CODE",
    ()=>COUNTRY_CODE,
    "CUSTOM_FIELD_TYPE",
    ()=>CUSTOM_FIELD_TYPE,
    "DEAL_PIPELINE",
    ()=>DEAL_PIPELINE,
    "DEAL_STAGES",
    ()=>DEAL_STAGES,
    "DEAL_STATUS",
    ()=>DEAL_STATUS,
    "DEAL_TYPE",
    ()=>DEAL_TYPE,
    "EMPLOYEE_SENIORITY",
    ()=>EMPLOYEE_SENIORITY,
    "EventType",
    ()=>EventType,
    "FORECAST_CATEGORY",
    ()=>FORECAST_CATEGORY,
    "FORM_FIELD_MODULE",
    ()=>FORM_FIELD_MODULE,
    "INDUSTRIES",
    ()=>INDUSTRIES,
    "INVOICE_STATUS",
    ()=>INVOICE_STATUS,
    "LANGUAGE_CODE",
    ()=>LANGUAGE_CODE,
    "NoteStatus",
    ()=>NoteStatus,
    "NoteVisibility",
    ()=>NoteVisibility,
    "NotesEntities",
    ()=>NotesEntities,
    "PERMISSIONS",
    ()=>PERMISSIONS,
    "PRIORITY",
    ()=>PRIORITY,
    "PROJECT_TYPES",
    ()=>PROJECT_TYPES,
    "QUOTATION_EVENT_TYPE",
    ()=>QUOTATION_EVENT_TYPE,
    "QuotationStatus",
    ()=>QuotationStatus,
    "SALES_STATUS",
    ()=>SALES_STATUS,
    "SOURCE",
    ()=>SOURCE
]);
var PROJECT_TYPES = /*#__PURE__*/ function(PROJECT_TYPES) {
    // Core Development
    PROJECT_TYPES["MOBILE_APP"] = "mobile_app";
    PROJECT_TYPES["WEBSITE"] = "website";
    PROJECT_TYPES["WEB_APP"] = "web_app";
    PROJECT_TYPES["CRM"] = "crm";
    PROJECT_TYPES["ERP"] = "erp";
    PROJECT_TYPES["CUSTOM_SOFTWARE"] = "custom_software";
    // Emerging Tech
    PROJECT_TYPES["AI_ML"] = "ai_ml";
    PROJECT_TYPES["DATA_SCIENCE"] = "data_science";
    PROJECT_TYPES["BLOCKCHAIN"] = "blockchain";
    PROJECT_TYPES["IOT"] = "iot";
    PROJECT_TYPES["UI_UX_DESIGN"] = "ui_ux_design";
    PROJECT_TYPES["GRAPHIC_DESIGN"] = "graphic_design";
    PROJECT_TYPES["BRANDING"] = "branding";
    PROJECT_TYPES["DIGITAL_MARKETING"] = "digital_marketing";
    PROJECT_TYPES["SEO"] = "seo";
    PROJECT_TYPES["SOCIAL_MEDIA_MARKETING"] = "social_media_marketing";
    PROJECT_TYPES["CONTENT_MARKETING"] = "content_marketing";
    // Testing & Support
    PROJECT_TYPES["TESTING"] = "testing";
    PROJECT_TYPES["QA_AUTOMATION"] = "qa_automation";
    PROJECT_TYPES["MAINTENANCE_SUPPORT"] = "maintenance_support";
    // Infrastructure
    PROJECT_TYPES["CLOUD_SERVICES"] = "cloud_services";
    PROJECT_TYPES["DEVOPS"] = "devops";
    PROJECT_TYPES["CYBER_SECURITY"] = "cyber_security";
    // E-commerce & CMS
    PROJECT_TYPES["ECOMMERCE"] = "ecommerce";
    PROJECT_TYPES["CMS"] = "cms";
    // Consulting
    PROJECT_TYPES["IT_CONSULTING"] = "it_consulting";
    PROJECT_TYPES["PRODUCT_CONSULTING"] = "product_consulting";
    return PROJECT_TYPES;
}({});
var SALES_STATUS = /*#__PURE__*/ function(SALES_STATUS) {
    SALES_STATUS["NEW"] = "new";
    SALES_STATUS["CONTACTED"] = "contacted";
    SALES_STATUS["QUALIFIED"] = "qualified";
    SALES_STATUS["PROPOSAL"] = "proposal";
    SALES_STATUS["WON"] = "won";
    SALES_STATUS["LOST"] = "lost";
    SALES_STATUS["DELETE"] = "delete";
    return SALES_STATUS;
}({});
var PRIORITY = /*#__PURE__*/ function(PRIORITY) {
    PRIORITY["LOW"] = "low";
    PRIORITY["MEDIUM"] = "medium";
    PRIORITY["HIGH"] = "high";
    return PRIORITY;
}({});
var SOURCE = /*#__PURE__*/ function(SOURCE) {
    // Online / Digital
    SOURCE["WEBSITE"] = "website";
    SOURCE["CHATBOT"] = "chatbot";
    SOURCE["EMAIL"] = "email";
    SOURCE["NEWSLETTER"] = "newsletter";
    // Direct Sales
    SOURCE["CALL"] = "call";
    SOURCE["WHATSAPP"] = "whatsapp";
    SOURCE["SMS"] = "sms";
    SOURCE["WALK_IN"] = "walk_in";
    // Ads & Marketing
    SOURCE["AD"] = "ad";
    SOURCE["GOOGLE_ADS"] = "google_ads";
    SOURCE["FACEBOOK_ADS"] = "facebook_ads";
    SOURCE["LINKEDIN_ADS"] = "linkedin_ads";
    SOURCE["INSTAGRAM_ADS"] = "instagram_ads";
    // Referrals & Partners
    SOURCE["REFERRAL"] = "referral";
    SOURCE["PARTNER"] = "partner";
    SOURCE["AFFILIATE"] = "affiliate";
    SOURCE["RESELLER"] = "reseller";
    // Outreach
    SOURCE["COLD_CALL"] = "cold_call";
    SOURCE["COLD_EMAIL"] = "cold_email";
    SOURCE["LINKEDIN_OUTREACH"] = "linkedin_outreach";
    // Marketplaces
    SOURCE["UPWORK"] = "upwork";
    SOURCE["FIVERR"] = "fiverr";
    SOURCE["FREELANCER"] = "freelancer";
    SOURCE["TOPTAL"] = "toptal";
    // Offline / Events
    SOURCE["EVENT"] = "event";
    SOURCE["CONFERENCE"] = "conference";
    SOURCE["MEETUP"] = "meetup";
    SOURCE["EXHIBITION"] = "exhibition";
    // Other
    SOURCE["OTHER"] = "other";
    return SOURCE;
}({});
var PERMISSIONS = /*#__PURE__*/ function(PERMISSIONS) {
    PERMISSIONS["createUser"] = "user:create";
    PERMISSIONS["readUser"] = "user:read";
    PERMISSIONS["updateUser"] = "user:update";
    PERMISSIONS["deleteUser"] = "user:delete";
    PERMISSIONS["createRole"] = "role:create";
    PERMISSIONS["readRole"] = "role:read";
    PERMISSIONS["updateRole"] = "role:update";
    PERMISSIONS["deleteRole"] = "role:delete";
    PERMISSIONS["createEnquiry"] = "enquiry:create";
    PERMISSIONS["readEnquiry"] = "enquiry:read";
    PERMISSIONS["updateEnquiry"] = "enquiry:update";
    PERMISSIONS["deleteEnquiry"] = "enquiry:delete";
    PERMISSIONS["createLead"] = "lead:create";
    PERMISSIONS["readLead"] = "lead:read";
    PERMISSIONS["updateLead"] = "lead:update";
    PERMISSIONS["deleteLead"] = "lead:delete";
    PERMISSIONS["createTeam"] = "team:create";
    PERMISSIONS["readTeam"] = "team:read";
    PERMISSIONS["updateTeam"] = "team:update";
    PERMISSIONS["deleteTeam"] = "team:delete";
    PERMISSIONS["createTeamCategory"] = "team_cat:create";
    PERMISSIONS["readTeamCategory"] = "team_cat:read";
    PERMISSIONS["updateTeamCategory"] = "team_cat:update";
    PERMISSIONS["deleteTeamCategory"] = "team_cat:delete";
    PERMISSIONS["createDeal"] = "deal:create";
    PERMISSIONS["readDeal"] = "deal:read";
    PERMISSIONS["updateDeal"] = "deal:update";
    PERMISSIONS["deleteDeal"] = "deal:delete";
    PERMISSIONS["createQuote"] = "quote:create";
    PERMISSIONS["readQuote"] = "quote:read";
    PERMISSIONS["updateQuote"] = "quote:update";
    PERMISSIONS["quoteDelete"] = "quote:delete";
    PERMISSIONS["readInvoice"] = "invoice:read";
    PERMISSIONS["updateInvoice"] = "invoice:update";
    PERMISSIONS["deleteInvoice"] = "invoice:delete";
    PERMISSIONS["sendInvoice"] = "invoice:send";
    PERMISSIONS["downloadInvoice"] = "invoice:download";
    PERMISSIONS["markPaidInvoice"] = "invoice:mark-paid";
    PERMISSIONS["cancelInvoice"] = "invoice:cancel";
    PERMISSIONS["createEvent"] = "event:create";
    PERMISSIONS["readEvent"] = "event:read";
    PERMISSIONS["updateEvent"] = "event:update";
    PERMISSIONS["deleteEvent"] = "event:delete";
    return PERMISSIONS;
}({});
var COUNTRY_CODE = /*#__PURE__*/ function(COUNTRY_CODE) {
    COUNTRY_CODE["AFGHANISTAN"] = "AF";
    COUNTRY_CODE["ALAND_ISLANDS"] = "AX";
    COUNTRY_CODE["ALBANIA"] = "AL";
    COUNTRY_CODE["ALGERIA"] = "DZ";
    COUNTRY_CODE["AMERICAN_SAMOA"] = "AS";
    COUNTRY_CODE["ANDORRA"] = "AD";
    COUNTRY_CODE["ANGOLA"] = "AO";
    COUNTRY_CODE["ANGUILLA"] = "AI";
    COUNTRY_CODE["ANTARCTICA"] = "AQ";
    COUNTRY_CODE["ANTIGUA_AND_BARBUDA"] = "AG";
    COUNTRY_CODE["ARGENTINA"] = "AR";
    COUNTRY_CODE["ARMENIA"] = "AM";
    COUNTRY_CODE["ARUBA"] = "AW";
    COUNTRY_CODE["AUSTRALIA"] = "AU";
    COUNTRY_CODE["AUSTRIA"] = "AT";
    COUNTRY_CODE["AZERBAIJAN"] = "AZ";
    COUNTRY_CODE["BAHAMAS"] = "BS";
    COUNTRY_CODE["BAHRAIN"] = "BH";
    COUNTRY_CODE["BANGLADESH"] = "BD";
    COUNTRY_CODE["BARBADOS"] = "BB";
    COUNTRY_CODE["BELARUS"] = "BY";
    COUNTRY_CODE["BELGIUM"] = "BE";
    COUNTRY_CODE["BELIZE"] = "BZ";
    COUNTRY_CODE["BENIN"] = "BJ";
    COUNTRY_CODE["BERMUDA"] = "BM";
    COUNTRY_CODE["BHUTAN"] = "BT";
    COUNTRY_CODE["BOLIVIA"] = "BO";
    COUNTRY_CODE["BOSNIA_AND_HERZEGOVINA"] = "BA";
    COUNTRY_CODE["BOTSWANA"] = "BW";
    COUNTRY_CODE["BRAZIL"] = "BR";
    COUNTRY_CODE["BRUNEI"] = "BN";
    COUNTRY_CODE["BULGARIA"] = "BG";
    COUNTRY_CODE["BURKINA_FASO"] = "BF";
    COUNTRY_CODE["BURUNDI"] = "BI";
    COUNTRY_CODE["CAMBODIA"] = "KH";
    COUNTRY_CODE["CAMEROON"] = "CM";
    COUNTRY_CODE["CANADA"] = "CA";
    COUNTRY_CODE["CAPE_VERDE"] = "CV";
    COUNTRY_CODE["CAYMAN_ISLANDS"] = "KY";
    COUNTRY_CODE["CENTRAL_AFRICAN_REPUBLIC"] = "CF";
    COUNTRY_CODE["CHAD"] = "TD";
    COUNTRY_CODE["CHILE"] = "CL";
    COUNTRY_CODE["CHINA"] = "CN";
    COUNTRY_CODE["COLOMBIA"] = "CO";
    COUNTRY_CODE["COMOROS"] = "KM";
    COUNTRY_CODE["CONGO"] = "CG";
    COUNTRY_CODE["COSTA_RICA"] = "CR";
    COUNTRY_CODE["CROATIA"] = "HR";
    COUNTRY_CODE["CUBA"] = "CU";
    COUNTRY_CODE["CYPRUS"] = "CY";
    COUNTRY_CODE["CZECH_REPUBLIC"] = "CZ";
    COUNTRY_CODE["DENMARK"] = "DK";
    COUNTRY_CODE["DJIBOUTI"] = "DJ";
    COUNTRY_CODE["DOMINICA"] = "DM";
    COUNTRY_CODE["DOMINICAN_REPUBLIC"] = "DO";
    COUNTRY_CODE["ECUADOR"] = "EC";
    COUNTRY_CODE["EGYPT"] = "EG";
    COUNTRY_CODE["EL_SALVADOR"] = "SV";
    COUNTRY_CODE["ESTONIA"] = "EE";
    COUNTRY_CODE["ETHIOPIA"] = "ET";
    COUNTRY_CODE["FINLAND"] = "FI";
    COUNTRY_CODE["FRANCE"] = "FR";
    COUNTRY_CODE["GABON"] = "GA";
    COUNTRY_CODE["GEORGIA"] = "GE";
    COUNTRY_CODE["GERMANY"] = "DE";
    COUNTRY_CODE["GHANA"] = "GH";
    COUNTRY_CODE["GREECE"] = "GR";
    COUNTRY_CODE["GREENLAND"] = "GL";
    COUNTRY_CODE["GRENADA"] = "GD";
    COUNTRY_CODE["GUATEMALA"] = "GT";
    COUNTRY_CODE["GUINEA"] = "GN";
    COUNTRY_CODE["GUYANA"] = "GY";
    COUNTRY_CODE["HAITI"] = "HT";
    COUNTRY_CODE["HONDURAS"] = "HN";
    COUNTRY_CODE["HONG_KONG"] = "HK";
    COUNTRY_CODE["HUNGARY"] = "HU";
    COUNTRY_CODE["ICELAND"] = "IS";
    COUNTRY_CODE["INDIA"] = "IN";
    COUNTRY_CODE["INDONESIA"] = "ID";
    COUNTRY_CODE["IRAN"] = "IR";
    COUNTRY_CODE["IRAQ"] = "IQ";
    COUNTRY_CODE["IRELAND"] = "IE";
    COUNTRY_CODE["ISRAEL"] = "IL";
    COUNTRY_CODE["ITALY"] = "IT";
    COUNTRY_CODE["JAMAICA"] = "JM";
    COUNTRY_CODE["JAPAN"] = "JP";
    COUNTRY_CODE["JORDAN"] = "JO";
    COUNTRY_CODE["KAZAKHSTAN"] = "KZ";
    COUNTRY_CODE["KENYA"] = "KE";
    COUNTRY_CODE["KUWAIT"] = "KW";
    COUNTRY_CODE["LATVIA"] = "LV";
    COUNTRY_CODE["LEBANON"] = "LB";
    COUNTRY_CODE["LITHUANIA"] = "LT";
    COUNTRY_CODE["LUXEMBOURG"] = "LU";
    COUNTRY_CODE["MALAYSIA"] = "MY";
    COUNTRY_CODE["MALDIVES"] = "MV";
    COUNTRY_CODE["MEXICO"] = "MX";
    COUNTRY_CODE["MOLDOVA"] = "MD";
    COUNTRY_CODE["MONACO"] = "MC";
    COUNTRY_CODE["MONGOLIA"] = "MN";
    COUNTRY_CODE["MOROCCO"] = "MA";
    COUNTRY_CODE["MYANMAR"] = "MM";
    COUNTRY_CODE["NEPAL"] = "NP";
    COUNTRY_CODE["NETHERLANDS"] = "NL";
    COUNTRY_CODE["NEW_ZEALAND"] = "NZ";
    COUNTRY_CODE["NIGERIA"] = "NG";
    COUNTRY_CODE["NORTH_KOREA"] = "KP";
    COUNTRY_CODE["NORWAY"] = "NO";
    COUNTRY_CODE["OMAN"] = "OM";
    COUNTRY_CODE["PAKISTAN"] = "PK";
    COUNTRY_CODE["PANAMA"] = "PA";
    COUNTRY_CODE["PERU"] = "PE";
    COUNTRY_CODE["PHILIPPINES"] = "PH";
    COUNTRY_CODE["POLAND"] = "PL";
    COUNTRY_CODE["PORTUGAL"] = "PT";
    COUNTRY_CODE["QATAR"] = "QA";
    COUNTRY_CODE["ROMANIA"] = "RO";
    COUNTRY_CODE["RUSSIA"] = "RU";
    COUNTRY_CODE["SAUDI_ARABIA"] = "SA";
    COUNTRY_CODE["SINGAPORE"] = "SG";
    COUNTRY_CODE["SLOVAKIA"] = "SK";
    COUNTRY_CODE["SLOVENIA"] = "SI";
    COUNTRY_CODE["SOUTH_AFRICA"] = "ZA";
    COUNTRY_CODE["SOUTH_KOREA"] = "KR";
    COUNTRY_CODE["SPAIN"] = "ES";
    COUNTRY_CODE["SRI_LANKA"] = "LK";
    COUNTRY_CODE["SWEDEN"] = "SE";
    COUNTRY_CODE["SWITZERLAND"] = "CH";
    COUNTRY_CODE["TAIWAN"] = "TW";
    COUNTRY_CODE["THAILAND"] = "TH";
    COUNTRY_CODE["TURKEY"] = "TR";
    COUNTRY_CODE["UKRAINE"] = "UA";
    COUNTRY_CODE["UNITED_ARAB_EMIRATES"] = "AE";
    COUNTRY_CODE["UNITED_KINGDOM"] = "GB";
    COUNTRY_CODE["UNITED_STATES"] = "US";
    COUNTRY_CODE["URUGUAY"] = "UY";
    COUNTRY_CODE["UZBEKISTAN"] = "UZ";
    COUNTRY_CODE["VIETNAM"] = "VN";
    COUNTRY_CODE["YEMEN"] = "YE";
    COUNTRY_CODE["ZAMBIA"] = "ZM";
    COUNTRY_CODE["ZIMBABWE"] = "ZW";
    return COUNTRY_CODE;
}({});
var LANGUAGE_CODE = /*#__PURE__*/ function(LANGUAGE_CODE) {
    LANGUAGE_CODE["ENGLISH"] = "en";
    LANGUAGE_CODE["SPANISH"] = "es";
    LANGUAGE_CODE["FRENCH"] = "fr";
    LANGUAGE_CODE["GERMAN"] = "de";
    LANGUAGE_CODE["ITALIAN"] = "it";
    LANGUAGE_CODE["PORTUGUESE"] = "pt";
    LANGUAGE_CODE["DUTCH"] = "nl";
    LANGUAGE_CODE["RUSSIAN"] = "ru";
    LANGUAGE_CODE["UKRAINIAN"] = "uk";
    LANGUAGE_CODE["POLISH"] = "pl";
    LANGUAGE_CODE["CZECH"] = "cs";
    LANGUAGE_CODE["SLOVAK"] = "sk";
    LANGUAGE_CODE["HUNGARIAN"] = "hu";
    LANGUAGE_CODE["ROMANIAN"] = "ro";
    LANGUAGE_CODE["BULGARIAN"] = "bg";
    LANGUAGE_CODE["GREEK"] = "el";
    LANGUAGE_CODE["TURKISH"] = "tr";
    LANGUAGE_CODE["ARABIC"] = "ar";
    LANGUAGE_CODE["HEBREW"] = "he";
    LANGUAGE_CODE["PERSIAN"] = "fa";
    LANGUAGE_CODE["URDU"] = "ur";
    LANGUAGE_CODE["HINDI"] = "hi";
    LANGUAGE_CODE["BENGALI"] = "bn";
    LANGUAGE_CODE["TAMIL"] = "ta";
    LANGUAGE_CODE["TELUGU"] = "te";
    LANGUAGE_CODE["MARATHI"] = "mr";
    LANGUAGE_CODE["GUJARATI"] = "gu";
    LANGUAGE_CODE["KANNADA"] = "kn";
    LANGUAGE_CODE["MALAYALAM"] = "ml";
    LANGUAGE_CODE["PUNJABI"] = "pa";
    LANGUAGE_CODE["CHINESE"] = "zh";
    LANGUAGE_CODE["JAPANESE"] = "ja";
    LANGUAGE_CODE["KOREAN"] = "ko";
    LANGUAGE_CODE["THAI"] = "th";
    LANGUAGE_CODE["VIETNAMESE"] = "vi";
    LANGUAGE_CODE["INDONESIAN"] = "id";
    LANGUAGE_CODE["MALAY"] = "ms";
    LANGUAGE_CODE["FILIPINO"] = "tl";
    LANGUAGE_CODE["SWEDISH"] = "sv";
    LANGUAGE_CODE["NORWEGIAN"] = "no";
    LANGUAGE_CODE["DANISH"] = "da";
    LANGUAGE_CODE["FINNISH"] = "fi";
    LANGUAGE_CODE["ICELANDIC"] = "is";
    LANGUAGE_CODE["AFRIKAANS"] = "af";
    LANGUAGE_CODE["SWAHILI"] = "sw";
    LANGUAGE_CODE["ZULU"] = "zu";
    LANGUAGE_CODE["LATIN"] = "la";
    return LANGUAGE_CODE;
}({});
var EMPLOYEE_SENIORITY = /*#__PURE__*/ function(EMPLOYEE_SENIORITY) {
    EMPLOYEE_SENIORITY["ENTRY_LEVEL"] = "entry_level";
    EMPLOYEE_SENIORITY["MID_LEVEL"] = "mid_level";
    EMPLOYEE_SENIORITY["SENIOR_LEVEL"] = "senior_level";
    EMPLOYEE_SENIORITY["LEAD"] = "lead";
    EMPLOYEE_SENIORITY["MANAGER"] = "manager";
    EMPLOYEE_SENIORITY["DIRECTOR"] = "director";
    EMPLOYEE_SENIORITY["VP"] = "vp";
    EMPLOYEE_SENIORITY["C_LEVEL"] = "c_level";
    EMPLOYEE_SENIORITY["OWNER"] = "owner";
    return EMPLOYEE_SENIORITY;
}({});
var INDUSTRIES = /*#__PURE__*/ function(INDUSTRIES) {
    INDUSTRIES["TECHNOLOGIES"] = "technologies";
    INDUSTRIES["HEALTHCARE"] = "healthcare";
    INDUSTRIES["FINANCE"] = "finance";
    INDUSTRIES["EDUCATION"] = "education";
    INDUSTRIES["MANUFACTURING"] = "manufacturing";
    INDUSTRIES["RETAIL"] = "retail";
    INDUSTRIES["CONSULTING"] = "consulting";
    INDUSTRIES["REAL_ESTATE"] = "real_estate";
    INDUSTRIES["OTHER"] = "other";
    return INDUSTRIES;
}({});
var FORM_FIELD_MODULE = /*#__PURE__*/ function(FORM_FIELD_MODULE) {
    FORM_FIELD_MODULE["LEAD"] = "lead";
    FORM_FIELD_MODULE["DEAL"] = "deal";
    return FORM_FIELD_MODULE;
}({});
var DEAL_PIPELINE = /*#__PURE__*/ function(DEAL_PIPELINE) {
    DEAL_PIPELINE["QUALIFICATION"] = "qualification";
    DEAL_PIPELINE["REQUIREMENT_ANALYSIS"] = "requirement_analysis";
    DEAL_PIPELINE["PROPOSAL"] = "proposal";
    DEAL_PIPELINE["NEGOTIATION"] = "negotiation";
    DEAL_PIPELINE["WON"] = "won";
    DEAL_PIPELINE["LOST"] = "lost";
    return DEAL_PIPELINE;
}({});
var DEAL_STAGES = /*#__PURE__*/ function(DEAL_STAGES) {
    DEAL_STAGES["QUALIFICATION"] = "qualification";
    DEAL_STAGES["REQUIREMENT_ANALYSIS"] = "requirement_analysis";
    DEAL_STAGES["PROPOSAL"] = "proposal";
    DEAL_STAGES["NEGOTIATION"] = "negotiation";
    DEAL_STAGES["WON"] = "won";
    DEAL_STAGES["LOST"] = "lost";
    DEAL_STAGES["DELETE"] = "delete";
    return DEAL_STAGES;
}({});
var DEAL_TYPE = /*#__PURE__*/ function(DEAL_TYPE) {
    DEAL_TYPE["NEW_BUSINESS"] = "new_business";
    DEAL_TYPE["EXISTING_BUSINESS"] = "existing_business";
    DEAL_TYPE["PARTNERSHIP"] = "partnership";
    DEAL_TYPE["OTHER"] = "other";
    return DEAL_TYPE;
}({});
var DEAL_STATUS = /*#__PURE__*/ function(DEAL_STATUS) {
    DEAL_STATUS["ACTIVE"] = "active";
    DEAL_STATUS["INACTIVE"] = "inactive";
    DEAL_STATUS["DELETE"] = "delete";
    return DEAL_STATUS;
}({});
var FORECAST_CATEGORY = /*#__PURE__*/ function(FORECAST_CATEGORY) {
    FORECAST_CATEGORY["PIPELINE"] = "pipeline";
    FORECAST_CATEGORY["BEST_CASE"] = "best_case";
    FORECAST_CATEGORY["COMMIT"] = "commit";
    FORECAST_CATEGORY["CLOSED"] = "closed";
    return FORECAST_CATEGORY;
}({});
var QuotationStatus = /*#__PURE__*/ function(QuotationStatus) {
    QuotationStatus["DRAFT"] = "draft";
    QuotationStatus["SENT"] = "sent";
    QuotationStatus["UPDATED"] = "updated";
    QuotationStatus["RESEND"] = "resend";
    QuotationStatus["VIEWED"] = "viewed";
    QuotationStatus["ACCEPTED"] = "accepted";
    QuotationStatus["REJECTED"] = "rejected";
    QuotationStatus["EXPIRED"] = "expired";
    QuotationStatus["DELETE"] = "delete";
    return QuotationStatus;
}({});
var QUOTATION_EVENT_TYPE = /*#__PURE__*/ function(QUOTATION_EVENT_TYPE) {
    QUOTATION_EVENT_TYPE["CREATED"] = "created";
    QUOTATION_EVENT_TYPE["UPDATED"] = "updated";
    QUOTATION_EVENT_TYPE["STATUS_CHANGED"] = "status_changed";
    QUOTATION_EVENT_TYPE["EMAIL_SENT"] = "email_sent";
    QUOTATION_EVENT_TYPE["RESEND"] = "resend";
    QUOTATION_EVENT_TYPE["VIEWED"] = "viewed";
    QUOTATION_EVENT_TYPE["ACCEPTED"] = "accepted";
    QUOTATION_EVENT_TYPE["REJECTED"] = "rejected";
    QUOTATION_EVENT_TYPE["EXPIRED"] = "expired";
    QUOTATION_EVENT_TYPE["DELETE"] = "delete";
    return QUOTATION_EVENT_TYPE;
}({});
var EventType = /*#__PURE__*/ function(EventType) {
    EventType["MEETING"] = "meeting";
    EventType["TODO"] = "todo";
    EventType["NOTE"] = "note";
    EventType["TASK"] = "task";
    EventType["REMINDER"] = "reminder";
    return EventType;
}({});
var INVOICE_STATUS = /*#__PURE__*/ function(INVOICE_STATUS) {
    INVOICE_STATUS["DRAFT"] = "DRAFT";
    INVOICE_STATUS["SENT"] = "SENT";
    INVOICE_STATUS["PAID"] = "PAID";
    INVOICE_STATUS["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    INVOICE_STATUS["OVERDUE"] = "OVERDUE";
    INVOICE_STATUS["CANCELLED"] = "CANCELLED";
    return INVOICE_STATUS;
}({});
var NoteVisibility = /*#__PURE__*/ function(NoteVisibility) {
    NoteVisibility["PRIVATE"] = "private";
    NoteVisibility["TEAM"] = "team";
    NoteVisibility["PUBLIC"] = "public";
    return NoteVisibility;
}({});
var NoteStatus = /*#__PURE__*/ function(NoteStatus) {
    NoteStatus["ACTIVE"] = "active";
    NoteStatus["INACTIVE"] = "inactive";
    NoteStatus["DELETED"] = "deleted";
    return NoteStatus;
}({});
var NotesEntities = /*#__PURE__*/ function(NotesEntities) {
    NotesEntities["LEAD"] = "lead";
    NotesEntities["DEAL"] = "deal";
    NotesEntities["QUOTATION"] = "quotation";
    NotesEntities["INVOICE"] = "invoice";
    NotesEntities["GENERAL"] = "general";
    return NotesEntities;
}({});
var CUSTOM_FIELD_TYPE = /*#__PURE__*/ function(CUSTOM_FIELD_TYPE) {
    CUSTOM_FIELD_TYPE["TEXT"] = "text";
    CUSTOM_FIELD_TYPE["NUMBER"] = "number";
    CUSTOM_FIELD_TYPE["EMAIL"] = "email";
    CUSTOM_FIELD_TYPE["PHONE"] = "phone";
    CUSTOM_FIELD_TYPE["SELECT"] = "select";
    CUSTOM_FIELD_TYPE["TEXTAREA"] = "textarea";
    CUSTOM_FIELD_TYPE["DATE"] = "date";
    CUSTOM_FIELD_TYPE["CHECKBOX"] = "checkbox";
    return CUSTOM_FIELD_TYPE;
}({});
var ACTIVITY_ENTITY_TYPE = /*#__PURE__*/ function(ACTIVITY_ENTITY_TYPE) {
    ACTIVITY_ENTITY_TYPE["LEAD"] = "lead";
    ACTIVITY_ENTITY_TYPE["DEAL"] = "deal";
    ACTIVITY_ENTITY_TYPE["QUOTATION"] = "quotation";
    ACTIVITY_ENTITY_TYPE["INVOICE"] = "invoice";
    return ACTIVITY_ENTITY_TYPE;
}({});
var ACTIVITY_ACTION = /*#__PURE__*/ function(ACTIVITY_ACTION) {
    ACTIVITY_ACTION["CREATED"] = "created";
    ACTIVITY_ACTION["UPDATED"] = "updated";
    ACTIVITY_ACTION["SENT"] = "sent";
    ACTIVITY_ACTION["RESEND"] = "resend";
    ACTIVITY_ACTION["CONVERTED"] = "converted";
    ACTIVITY_ACTION["CLOSED_WON"] = "closed_won";
    ACTIVITY_ACTION["CLOSED_LOST"] = "closed_lost";
    ACTIVITY_ACTION["DELETE"] = "delete";
    return ACTIVITY_ACTION;
}({});
}),
"[project]/src/components/layouts/SideBar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$bi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/bi/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$ai$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/ai/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$io5$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/io5/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$sl$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/sl/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$tb$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/tb/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$bs$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/bs/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$md$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/md/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ConfirmPopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/ConfirmPopup.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$auth$2e$service$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/auth.service.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$slices$2f$authSlice$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/slices/authSlice.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-toastify/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$ri$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/ri/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/fi/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePermissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/usePermissions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/constants/enum.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/fa/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const SideBar = ()=>{
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const [openMenu, setOpenMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useDispatch"])();
    const { hasPermission } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePermissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePermissions"])();
    const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSelector"])((state)=>state.auth);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const handleLogout = async ()=>{
        try {
            let isConfirmed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ConfirmPopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])({
                title: "Logout",
                text: "Are you want to logout",
                btnTxt: "Yes, Logout"
            });
            if (isConfirmed) {
                const isLogout = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$auth$2e$service$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthService"].logout();
                if (isLogout) {
                    dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$slices$2f$authSlice$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logout"])());
                    router.push("/login");
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Logout successfully");
                }
            }
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Logout Failed");
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (pathname.startsWith("/teams") || pathname.startsWith("/users")) {
            setOpenMenu("team");
        }
        if (pathname.startsWith("/roles")) {
            setOpenMenu("team");
        }
        if (pathname.startsWith("/enquiry")) {
            setOpenMenu("sales");
        }
        if (pathname.startsWith("/leads")) {
            setOpenMenu("sales");
        }
        if (pathname.startsWith("/deals")) {
            setOpenMenu("sales");
        }
        if (pathname.startsWith("/quotations")) {
            setOpenMenu("sales");
        }
        if (pathname.startsWith("/invoice")) {
            setOpenMenu("sales");
        }
    }, [
        pathname
    ]);
    const toggleMenu = (menu)=>{
        setOpenMenu((prev)=>prev === menu ? null : menu);
    };
    const isActive = (path)=>pathname.startsWith(path);
    // Check if any submenu item is active
    const isMenuActive = (menu)=>{
        switch(menu){
            case "team":
                return pathname.startsWith("/teams") || pathname.startsWith("/users") || pathname.startsWith("/roles");
            case "sales":
                return pathname.startsWith("/enquiry") || pathname.startsWith("/leads") || pathname.startsWith("/deals") || pathname.startsWith("/quotations") || pathname.startsWith("/invoice");
            default:
                return false;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `fixed top-0 left-0 w-72 p-6 bg-slate-50 h-screen dark:bg-gray-800 flex flex-col gap-6 border-r border-slate-900/15 dark:border-gray-700 `,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "h-[89vh] overflow-y-scroll flex flex-col gap-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            src: "/images/trakeroo.png",
                            height: 200,
                            width: 220,
                            alt: "xonier logo",
                            className: "w-46 dark:hidden"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 118,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            src: "/images/trakeroo-light.png",
                            height: 200,
                            width: 220,
                            alt: "xonier logo",
                            className: "w-46 hidden dark:block "
                        }, void 0, false, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 125,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                    lineNumber: 117,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-3 ",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "uppercase text-xs text-gray-500 dark:text-gray-400 pl-3",
                            children: "Home"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 135,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "flex flex-col gap-1 ",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/dashboard",
                                        className: `${isActive("/dashboard") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$bi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BiHome"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 149,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Dashboard"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 141,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 140,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readEvent) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/calender",
                                        className: `${isActive("/calender") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$sl$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SlCalender"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 162,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Calender"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 154,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 153,
                                    columnNumber: 51
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/notes",
                                        className: `${isActive("/notes") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$tb$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TbNotes"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 176,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Notes"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 168,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 167,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                (hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readUser) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readRole) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].createTeam)) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>toggleMenu("team"),
                                            className: `${isMenuActive("team") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$ai$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AiOutlineTeam"], {
                                                            className: "text-lg"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 191,
                                                            columnNumber: 17
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        "Team Management"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 15
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$io5$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IoChevronDown"], {
                                                    className: `transition-transform ${openMenu === "team" ? "rotate-180" : ""}`
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                    lineNumber: 195,
                                                    columnNumber: 15
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                            lineNumber: 182,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                            children: openMenu === "team" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].ul, {
                                                initial: {
                                                    height: 0,
                                                    opacity: 0
                                                },
                                                animate: {
                                                    height: "auto",
                                                    opacity: 1
                                                },
                                                exit: {
                                                    height: 0,
                                                    opacity: 0
                                                },
                                                transition: {
                                                    duration: 0.25
                                                },
                                                className: "ml-8 mt-1 flex flex-col gap-1 overflow-hidden",
                                                children: [
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readRole) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/roles",
                                                            className: `${isActive("/roles") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Roles"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 211,
                                                        columnNumber: 59
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readTeamCategory) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/teams/categories",
                                                            className: `${isActive("/teams/categories") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Teams Categories"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 224,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 66
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readTeam) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/teams",
                                                            className: `${isActive("/teams") && !isActive("/teams/categories") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Teams"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 236,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 235,
                                                        columnNumber: 58
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readUser) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/users",
                                                            className: `${isActive("/users") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Users"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 248,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 247,
                                                        columnNumber: 59
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 204,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                            lineNumber: 202,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 181,
                                    columnNumber: 133
                                }, ("TURBOPACK compile-time value", void 0)),
                                (hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].createEnquiry) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readEnquiry) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].createLead) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readLead) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].createDeal) || hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readDeal)) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>toggleMenu("sales"),
                                            className: `${isMenuActive("sales") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$bs$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BsBarChart"], {
                                                            className: "text-lg"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 274,
                                                            columnNumber: 17
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        "Sales"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                    lineNumber: 273,
                                                    columnNumber: 15
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$io5$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IoChevronDown"], {
                                                    className: `transition-transform ${openMenu === "sales" ? "rotate-180" : ""}`
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 15
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                            lineNumber: 265,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                            children: openMenu === "sales" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].ul, {
                                                initial: {
                                                    height: 0,
                                                    opacity: 0
                                                },
                                                animate: {
                                                    height: "auto",
                                                    opacity: 1
                                                },
                                                exit: {
                                                    height: 0,
                                                    opacity: 0
                                                },
                                                transition: {
                                                    duration: 0.25
                                                },
                                                className: "ml-8 mt-1 flex flex-col gap-1 overflow-hidden",
                                                children: [
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].createEnquiry) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/enquiry",
                                                            className: `${isActive("/enquiry") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Enquiry"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 295,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 294,
                                                        columnNumber: 64
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readLead) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/leads",
                                                            className: `${isActive("/leads") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Leads"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 307,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 306,
                                                        columnNumber: 59
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readDeal) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/deals",
                                                            className: `${isActive("/deals") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Deals"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 319,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 318,
                                                        columnNumber: 59
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readQuote) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/quotations",
                                                            className: `${isActive("/quotations") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Quotations"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 332,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 331,
                                                        columnNumber: 60
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readInvoice) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/invoice",
                                                            className: `${isActive("/invoice") ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`,
                                                            children: "Invoice"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                            lineNumber: 344,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                        lineNumber: 343,
                                                        columnNumber: 62
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 287,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                                            lineNumber: 285,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 264,
                                    columnNumber: 260
                                }, ("TURBOPACK compile-time value", void 0)),
                                hasPermission(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$constants$2f$enum$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PERMISSIONS"].readEvent) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/clients",
                                        className: `${isActive("/clients") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FiUserCheck"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 368,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Clients"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 360,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 359,
                                    columnNumber: 51
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 139,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                    lineNumber: 134,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "uppercase text-xs text-gray-500 dark:text-gray-400 pl-3",
                            children: "Auth"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 376,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "flex flex-col gap-1 w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleLogout(),
                                        className: `w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all border-l-2 border-transparent`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$md$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MdOutlineLogout"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 385,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Logout"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 381,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 380,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/users/${auth.user?._id}`,
                                        className: `${isActive("/reset-password") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all capitalize`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FaRegUser"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 398,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Profile"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 390,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 389,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/reset-password",
                                        className: `${isActive("/reset-password") ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400" : "border-l-2 border-transparent"} w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all capitalize`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$ri$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RiLockPasswordLine"], {
                                                className: "text-lg"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/SideBar.tsx",
                                                lineNumber: 411,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Reset password"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/SideBar.tsx",
                                        lineNumber: 403,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                                    lineNumber: 402,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layouts/SideBar.tsx",
                            lineNumber: 379,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layouts/SideBar.tsx",
                    lineNumber: 375,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/layouts/SideBar.tsx",
            lineNumber: 116,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/layouts/SideBar.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = SideBar;
}),
"[project]/src/components/common/ThemeToggle.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThemeToggle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$io5$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/io5/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$lu$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/lu/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>setMounted(true), []);
    if (!mounted) return null;
    const isDark = resolvedTheme === "dark";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: ()=>setTheme(isDark ? "light" : "dark"),
        className: "h-10 w-10 flex  bg-slate-50 items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-blue-600 cursor-pointer hover:border-blue-600/20 hover:scale-103",
        children: isDark ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$io5$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IoSunnyOutline"], {}, void 0, false, {
            fileName: "[project]/src/components/common/ThemeToggle.tsx",
            lineNumber: 22,
            columnNumber: 17
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$lu$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LuSunMoon"], {}, void 0, false, {
            fileName: "[project]/src/components/common/ThemeToggle.tsx",
            lineNumber: 22,
            columnNumber: 38
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/common/ThemeToggle.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/layouts/NavBar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$common$2f$ThemeToggle$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/common/ThemeToggle.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$slices$2f$authSlice$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/slices/authSlice.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/fi/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ConfirmPopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/ConfirmPopup.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$auth$2e$service$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/auth.service.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-toastify/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa6$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-icons/fa6/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const NavBar = ()=>{
    const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSelector"])((state)=>state.auth);
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useDispatch"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const handleLogout = async ()=>{
        try {
            let isConfirmed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ConfirmPopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])({
                title: "Logout",
                text: "Are you want to logout",
                btnTxt: "Yes, Logout"
            });
            if (isConfirmed) {
                const isLogout = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$auth$2e$service$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthService"].logout();
                if (isLogout) {
                    dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$slices$2f$authSlice$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logout"])());
                    router.push("/login");
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Logout successfully");
                }
            }
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Logout Failed");
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-14 z-99 fixed top-0 left-74 backdrop-blur-sm right-0 px-4 flex justify-between items-center my-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {}, void 0, false, {
                fileName: "[project]/src/components/layouts/NavBar.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.back(),
                                className: "h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa6$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FaArrowLeftLong"], {
                                    className: "group-hover:scale-105 transition-all"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                    lineNumber: 49,
                                    columnNumber: 281
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/layouts/NavBar.tsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.forward(),
                                className: "h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fa6$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FaArrowRightLong"], {
                                    className: "group-hover:scale-105 transition-all"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                    lineNumber: 50,
                                    columnNumber: 284
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/layouts/NavBar.tsx",
                                lineNumber: 50,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$common$2f$ThemeToggle$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "border-r border-[#ecf0f2] dark:border-gray-700 h-10"
                    }, void 0, false, {
                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    auth.isAuthenticated && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        onMouseEnter: ()=>setOpen(true),
                        onMouseLeave: ()=>setOpen(false),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 cursor-pointer group",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-9 w-9 rounded-full overflow-hidden",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            src: "/images/user-1.png",
                                            height: 200,
                                            width: 200,
                                            alt: "profile image",
                                            className: "group-hover:scale-110 duration-300",
                                            quality: 100
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 66,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                                        lineNumber: 65,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "group-hover:text-blue-700 dark:group-hover:text-blue-500 capitalize",
                                        children: [
                                            auth.user?.firstName,
                                            " ",
                                            auth.user?.lastName
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                                        lineNumber: 75,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layouts/NavBar.tsx",
                                lineNumber: 64,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                children: open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                    initial: {
                                        opacity: 0,
                                        y: -10
                                    },
                                    animate: {
                                        opacity: 1,
                                        y: 8
                                    },
                                    exit: {
                                        opacity: 0,
                                        y: -10
                                    },
                                    transition: {
                                        duration: 0.2,
                                        ease: "easeOut"
                                    },
                                    className: "absolute right-0 mt-2  bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden w-92 px-6 py-4 flex flex-col gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "font-bold text-xl text-slate-900 dark:text-blue-50 ",
                                            children: "User Profile"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 90,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1/3",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        src: "/images/user-1.png",
                                                        className: "rounded-full",
                                                        height: 300,
                                                        width: 300,
                                                        alt: "user profile image"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                        lineNumber: 92,
                                                        columnNumber: 44
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                    lineNumber: 92,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-2/3 flex flex-col gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-slate-900 dark:text-white text-lg capitalize",
                                                            children: [
                                                                auth?.user?.firstName,
                                                                " ",
                                                                auth?.user?.lastName
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                            lineNumber: 94,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {}, void 0, false, {
                                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                            lineNumber: 95,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                    lineNumber: 93,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 91,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-full border-b-[1px] border-gray-200 dark:border-gray-700"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 98,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    href: `/users/${auth?.user?._id}`,
                                                    className: "flex items-center gap-4 group",
                                                    children: [
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "h-11 w-11 rounded-md bg-blue-800/10 dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center overflow-hidden",
                                                            children: [
                                                                " ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$icons$2f$fi$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FiUser"], {
                                                                    className: "text-2xl group-hover:scale-110 transition-all duration-300"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                                    lineNumber: 100,
                                                                    columnNumber: 251
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                " "
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                            lineNumber: 100,
                                                            columnNumber: 109
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex flex-col",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                                    className: "text-slate-900 dark:text-white font-semibold group-hover:text-blue-600",
                                                                    children: " My Profile"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                                    lineNumber: 101,
                                                                    columnNumber: 22
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-500 dark:text-gray-400 text-sm",
                                                                    children: "Account Settings"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                                    lineNumber: 102,
                                                                    columnNumber: 22
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                            lineNumber: 100,
                                                            columnNumber: 340
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        " "
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                    lineNumber: 100,
                                                    columnNumber: 25
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layouts/NavBar.tsx",
                                                lineNumber: 100,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 99,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleLogout,
                                            className: "bg-blue-600 hover:bg-blue-700 text-white w-full rounded-md py-2.5 capitalize font-medium cursor-pointer",
                                            children: "Log out"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layouts/NavBar.tsx",
                                            lineNumber: 105,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/layouts/NavBar.tsx",
                                    lineNumber: 83,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/layouts/NavBar.tsx",
                                lineNumber: 81,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layouts/NavBar.tsx",
                        lineNumber: 58,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layouts/NavBar.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layouts/NavBar.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = NavBar;
}),
];

//# sourceMappingURL=src_1f97bcdc._.js.map