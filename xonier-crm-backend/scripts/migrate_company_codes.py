"""Explicit, resumable migration. Default is read-only; --apply writes changes.

Run from the backend directory with the application's usual environment:
    venv/bin/python -m scripts.migrate_company_codes
    venv/bin/python -m scripts.migrate_company_codes --apply
"""
import argparse
import asyncio
from datetime import datetime, timezone
import re

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

from app.utils.company_code import (
    COMPANY_CODE_PATTERN, generate_company_code, normalize_company_code,
    is_company_code_collision,
)


async def migrate_company_codes(collection, *, apply=False, company_id=None):
    if apply:
        # Index creation is deliberately excluded from dry runs. Current codes
        # and retained aliases are both protected before the first update.
        await collection.create_index("companyId", unique=True, name="unique_company_id")
        await collection.create_index("loginCodes", unique=True, name="unique_company_login_codes",
                                      partialFilterExpression={"loginCodes.0": {"$exists": True}})
    query = {"_id": ObjectId(company_id)} if company_id else {}
    changes = []
    planned = set()
    async for company in collection.find(query, {"companyId": 1, "companyName": 1}):
        old_code = company["companyId"]
        if re.fullmatch(COMPANY_CODE_PATTERN, old_code):
            continue
        for _ in range(20):
            code = await generate_company_code(collection, company["companyName"])
            if code in planned:
                continue
            if apply:
                try:
                    result = await collection.update_one(
                        {"_id": company["_id"], "companyId": old_code},
                        {"$set": {"companyId": code, "updatedAt": datetime.now(timezone.utc)},
                         "$addToSet": {"loginCodes": {"$each": [normalize_company_code(old_code), code]}}},
                    )
                    if not result.matched_count:
                        # An admin edited this record since the cursor read it.
                        # Never overwrite that change; a later run can revisit it.
                        break
                except DuplicateKeyError as error:
                    if is_company_code_collision(error):
                        continue
                    raise
            planned.add(code)
            changes.append({"id": str(company["_id"]), "previousCompanyId": old_code, "companyId": code})
            break
        else:
            raise RuntimeError(f"Could not allocate an ID for company {company['_id']}; retry migration")
    return changes


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write changes (default: read-only preview)")
    parser.add_argument("--company", help="Optional internal company ObjectId to migrate just one company")
    args = parser.parse_args()
    if args.company and not ObjectId.is_valid(args.company):
        parser.error("--company must be an internal MongoDB ObjectId, not a login ID")

    from app.core.config import get_setting
    settings = get_setting()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    try:
        collection = client[settings.DATABASE_NAME].companies
        changes = await migrate_company_codes(collection, apply=args.apply, company_id=args.company)
        for change in changes:
            print(f"{change['id']}: {change['previousCompanyId']} -> {change['companyId']}")
        print(f"{'Updated' if args.apply else 'Would update'} {len(changes)} companies. "
              "Internal tenant IDs and relationships are unchanged.")
        if not args.apply:
            print("Read-only preview. Back up the database, then use --apply to migrate. "
                  "Generated suggestions may differ when applying.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
