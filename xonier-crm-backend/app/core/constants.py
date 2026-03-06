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



ZIPCODE_PATTERNS: dict[str, tuple[str, str]] = {
    "US": (r"^\d{5}(-\d{4})?$",          "US ZIP: 12345 or 12345-6789"),
    "GB": (r"^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$", "UK Postcode: SW1A 1AA"),
    "CA": (r"^[A-Z]\d[A-Z]\s?\d[A-Z]\d$","CA Postal: A1B 2C3"),
    "AU": (r"^\d{4}$",                    "AU Postcode: 4-digit number"),
    "IN": (r"^\d{6}$",                    "IN PIN: 6-digit number"),
    "DE": (r"^\d{5}$",                    "DE PLZ: 5-digit number"),
    "FR": (r"^\d{5}$",                    "FR Code Postal: 5-digit number"),
    "JP": (r"^\d{3}-?\d{4}$",            "JP Postal: 123-4567"),
    "CN": (r"^\d{6}$",                    "CN Postal: 6-digit number"),
    "BR": (r"^\d{5}-?\d{3}$",            "BR CEP: 12345-678"),
    "MX": (r"^\d{5}$",                    "MX CP: 5-digit number"),
    "IT": (r"^\d{5}$",                    "IT CAP: 5-digit number"),
    "ES": (r"^\d{5}$",                    "ES CP: 5-digit number"),
    "NL": (r"^\d{4}\s?[A-Z]{2}$",        "NL Postcode: 1234 AB"),
    "SE": (r"^\d{3}\s?\d{2}$",           "SE Postnummer: 123 45"),
    "NO": (r"^\d{4}$",                    "NO Postnummer: 4-digit number"),
    "DK": (r"^\d{4}$",                    "DK Postnummer: 4-digit number"),
    "FI": (r"^\d{5}$",                    "FI Postinumero: 5-digit number"),
    "CH": (r"^\d{4}$",                    "CH PLZ: 4-digit number"),
    "AT": (r"^\d{4}$",                    "AT PLZ: 4-digit number"),
    "NZ": (r"^\d{4}$",                    "NZ Postcode: 4-digit number"),
    "SG": (r"^\d{6}$",                    "SG Postal: 6-digit number"),
    "ZA": (r"^\d{4}$",                    "ZA Code: 4-digit number"),
    "AE": (r"^\d{5,6}$",                  "AE Postal: 5-6 digit number"),
    "PK": (r"^\d{5}$",                    "PK Postal: 5-digit number"),
    "BD": (r"^\d{4}$",                    "BD Postal: 4-digit number"),
    "NG": (r"^\d{6}$",                    "NG Postal: 6-digit number"),
    "KE": (r"^\d{5}$",                    "KE Postal: 5-digit number"),
    "EG": (r"^\d{5}$",                    "EG Postal: 5-digit number"),
    "PH": (r"^\d{4}$",                    "PH ZIP: 4-digit number"),
    "MY": (r"^\d{5}$",                    "MY Postcode: 5-digit number"),
    "TH": (r"^\d{5}$",                    "TH Postal: 5-digit number"),
    "VN": (r"^\d{6}$",                    "VN Postal: 6-digit number"),
    "ID": (r"^\d{5}$",                    "ID Postal: 5-digit number"),
    "TR": (r"^\d{5}$",                    "TR Postal: 5-digit number"),
    "SA": (r"^\d{5}(-\d{4})?$",          "SA Postal: 12345 or 12345-6789"),
    "AR": (r"^[A-Z]?\d{4}[A-Z]{0,3}$",  "AR CP: 1234 or B1234ABC"),
    "CO": (r"^\d{6}$",                    "CO Postal: 6-digit number"),
    "CL": (r"^\d{7}$",                    "CL Postal: 7-digit number"),
    "PL": (r"^\d{2}-?\d{3}$",            "PL Kod: 12-345"),
    "PT": (r"^\d{4}-?\d{3}$",            "PT CP: 1234-567"),
    "RU": (r"^\d{6}$",                    "RU Postal: 6-digit number"),
    "UA": (r"^\d{5}$",                    "UA Postal: 5-digit number"),
    "KR": (r"^\d{5}$",                    "KR Postal: 5-digit number"),
    "HK": (r"^.{0,0}$",                  "HK: No postal code system"),  # HK has no postcodes
    "TW": (r"^\d{3,5}$",                 "TW Postal: 3 or 5 digits"),
    "IL": (r"^\d{5,7}$",                 "IL Postal: 5 or 7 digits"),
    "GR": (r"^\d{3}\s?\d{2}$",          "GR TK: 123 45"),
    "CZ": (r"^\d{3}\s?\d{2}$",          "CZ PSČ: 123 45"),
    "HU": (r"^\d{4}$",                   "HU IRSZ: 4-digit number"),
    "RO": (r"^\d{6}$",                   "RO Postal: 6-digit number"),
    "BE": (r"^\d{4}$",                   "BE Postal: 4-digit number"),
    "IE": (r"^[A-Z\d]{3}\s?[A-Z\d]{4}$","IE Eircode: A65 F4E2"),
    "IQ": (r"^\d{5}$",                   "IQ Postal: 5-digit number"),
    "IR": (r"^\d{10}$",                  "IR Postal: 10-digit number"),
}
