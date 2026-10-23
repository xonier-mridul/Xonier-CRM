"""Human-facing company login codes, never tenant/ObjectId references."""
import re
import secrets
import unicodedata
from functools import wraps

from app.utils.custom_exception import AppException


COMPANY_CODE_PATTERN = r"^[A-Z]{3}-[0-9]{4}$"


def normalize_company_code(value: str) -> str:
    return value.strip().upper()


def validate_company_code(value: str) -> str:
    code = normalize_company_code(value)
    if not re.fullmatch(COMPANY_CODE_PATTERN, code):
        raise ValueError("Company ID must be 3 letters, a hyphen and 4 digits (e.g. XON-1234)")
    return code


def company_code_prefix(company_name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", company_name).encode("ascii", "ignore").decode()
    letters = re.sub(r"[^A-Z]", "", ascii_name.upper())
    return (letters + "XXX")[:3] if letters else "CMP"


def company_login_filter(value: str) -> dict:
    # Only the CURRENT ID authenticates. Unmigrated legacy IDs still work while
    # current; historical reservations must never become alternate login IDs.
    original = value.strip()
    normalized = normalize_company_code(value)
    return {"$or": [{"companyId": original}, {"companyId": normalized}]}


def company_reservation_filter(value: str) -> dict:
    return {"$or": [*company_login_filter(value)["$or"],
        {"loginCodes": normalize_company_code(value), "loginCodes.0": {"$exists": True}}]}


def assert_company_editor(actor: dict, company_id: str) -> None:
    if not isinstance(company_id, str):
        raise AppException(400, "Invalid company Object ID")
    roles = {role.get("code") for role in actor.get("userRole", []) if isinstance(role, dict)}
    if "SUPER_ADMIN" in roles:
        return
    tenant = actor.get("companyId")
    if isinstance(tenant, dict):
        tenant = tenant.get("id") or tenant.get("_id")
    if "COMPANY_ADMIN" not in roles or str(tenant) != company_id:
        raise AppException(403, "Only Super Admin or this company's Company Admin can edit its details")


async def generate_company_code(collection, company_name: str) -> str:
    prefix = company_code_prefix(company_name)
    # A suggestion isn't a reservation. The unique database indexes arbitrate
    # concurrent saves; registration retries the entire aborted transaction.
    # Read the prefix's reservations once rather than making thousands of
    # round trips when a popular prefix is nearly exhausted.
    prefix_match = {"$regex": rf"^{prefix}-[0-9]{{4}}$"}
    reserved = set()
    async for company in collection.find({"$or": [
        {"companyId": prefix_match},
        {"loginCodes": prefix_match, "loginCodes.0": {"$exists": True}},
    ]}, {"companyId": 1, "loginCodes": 1}):
        reserved.add(company["companyId"])
        reserved.update(company.get("loginCodes", []))
    start = secrets.randbelow(10000)
    for offset in range(10000):
        code = f"{prefix}-{(start + offset) % 10000:04d}"
        if code not in reserved:
            return code
    raise AppException(409, f"All IDs for prefix {prefix} are reserved; please contact support")


def is_company_code_collision(error) -> bool:
    details = error.details or {}
    return bool({"companyId", "loginCodes"} & set(details.get("keyPattern", {}))) or any(
        name in str(error) for name in ("unique_company_id", "unique_company_login_codes")
    )


class CompanyCodeCollision(Exception):
    """A competing writer claimed a generated code; retry outside the transaction."""


def retry_company_code_collision(method):
    @wraps(method)
    async def wrapped(*args, **kwargs):
        for _ in range(5):
            try:
                return await method(*args, **kwargs)
            except CompanyCodeCollision:
                continue
        raise AppException(409, "Could not allocate a company ID; please retry registration")
    return wrapped
