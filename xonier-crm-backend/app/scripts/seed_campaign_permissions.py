"""
Run this script from the backend root to seed campaign permissions
and add them to existing roles that already have lead:read permission.

Usage:
  python -m app.scripts.seed_campaign_permissions
"""
import asyncio
from app.db.db import connect_db
from app.db.models.permissions_model import PermissionModel
from app.db.models.user_roles_model import UserRoleModel
from app.core.tenant import system_query

CAMPAIGN_PERMISSIONS = [
    {
        "code": "campaign:create",
        "module": "campaign",
        "action": "create",
        "title": "create campaign",
        "description": "permission for create campaign",
    },
    {
        "code": "campaign:read",
        "module": "campaign",
        "action": "read",
        "title": "read campaign",
        "description": "permission for read campaign",
    },
    {
        "code": "campaign:update",
        "module": "campaign",
        "action": "update",
        "title": "update campaign",
        "description": "permission for update campaign",
    },
    {
        "code": "campaign:delete",
        "module": "campaign",
        "action": "delete",
        "title": "delete campaign",
        "description": "permission for delete campaign",
    },
    {
        "code": "campaign:manage",
        "module": "campaign",
        "action": "manage",
        "title": "manage campaign leads",
        "description": "permission for manage campaign leads (import, assign, distribute)",
    },
]


async def seed_campaign_permissions():
    await connect_db()

    seeded_perms = []

    # 1. Seed permissions into DB
    for perm_data in CAMPAIGN_PERMISSIONS:
        with system_query():
            existing = await PermissionModel.find_one({"code": perm_data["code"]})
            if not existing:
                new_perm = PermissionModel(**perm_data)
                await new_perm.insert()
                print(f"  ✅ Inserted: {perm_data['code']}")
                seeded_perms.append(new_perm)
            else:
                print(f"  ⏩ Already exists: {perm_data['code']}")
                seeded_perms.append(existing)

    # 2. Find the campaign:read permission doc
    with system_query():
        campaign_read_perm = await PermissionModel.find_one({"code": "campaign:read"})
        campaign_create_perm = await PermissionModel.find_one({"code": "campaign:create"})
        campaign_update_perm = await PermissionModel.find_one({"code": "campaign:update"})
        campaign_delete_perm = await PermissionModel.find_one({"code": "campaign:delete"})
        campaign_manage_perm = await PermissionModel.find_one({"code": "campaign:manage"})

    if not campaign_read_perm:
        print("❌ campaign:read not found after insert. Aborting role update.")
        return

    # 3. Find lead:read permission to identify roles that should get campaign access
    with system_query():
        lead_read_perm = await PermissionModel.find_one({"code": "lead:read"})

    if not lead_read_perm:
        print("⚠️  lead:read permission not found. Skipping role auto-grant.")
        return

    # 4. Find ALL roles and add campaign permissions to those that have lead:read
    with system_query():
        all_roles_raw = await UserRoleModel.get_pymongo_collection().find({}).to_list(length=None)

    perms_to_add = [p for p in [campaign_read_perm, campaign_create_perm, campaign_update_perm, campaign_delete_perm, campaign_manage_perm] if p]

    for role_doc in all_roles_raw:
        role_id = role_doc.get("_id")
        perm_refs = role_doc.get("permissions", [])
        # Check if lead:read is in this role's permissions
        has_lead_read = any(
            (isinstance(p, dict) and str(p.get("$id", "")) == str(lead_read_perm.id)) or str(p) == str(lead_read_perm.id)
            for p in perm_refs
        )
        if not has_lead_read:
            continue

        existing_perm_ids = {str(p.get("$id", "")) if isinstance(p, dict) else str(p) for p in perm_refs}
        new_perm_links = []
        added_codes = []
        for perm in perms_to_add:
            if str(perm.id) not in existing_perm_ids:
                new_perm_links.append({"$ref": "permissions", "$id": perm.id, "$db": ""})
                added_codes.append(perm.code)

        if new_perm_links:
            with system_query():
                await UserRoleModel.get_pymongo_collection().update_one(
                    {"_id": role_id},
                    {"$push": {"permissions": {"$each": new_perm_links}}}
                )
            print(f"  ✅ Added to role '{role_doc.get('name')}': {added_codes}")
        else:
            print(f"  ⏩ Role '{role_doc.get('name')}' already has campaign permissions")

    print("\n✅ Campaign permissions seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_campaign_permissions())
