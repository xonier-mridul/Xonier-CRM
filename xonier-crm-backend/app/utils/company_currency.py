from bson import ObjectId

from app.core.config import get_setting


async def get_organization_currency(client, user):
    """Read the tenant's current currency for newly created sales documents."""
    company_id = user.get("companyId")
    if isinstance(company_id, dict):
        company_id = company_id.get("id") or company_id.get("_id")
    if not company_id or not ObjectId.is_valid(str(company_id)):
        return None
    database = client[get_setting().DATABASE_NAME]
    company = await database["companies"].find_one(
        {"_id": ObjectId(str(company_id))}, {"currency": 1}
    )
    return company.get("currency") if company else None
