import asyncio
from app.db.db import connect_db
from app.db.models.user_roles_model import UserRoleModel



async def seed_company_admin_role():
    try:
        await connect_db()

        is_exist = await UserRoleModel.find_one(
            UserRoleModel.code == "COMPANY_ADMIN"
        )

        if is_exist:
            print("Company admin role already exists")
            return

        admin_role = UserRoleModel(
            name="Company Admin",
            code="COMPANY_ADMIN",
            permissions=[],
            isSystemRole=True
        )

        await admin_role.insert()
        print("Company Admin role seeded successfully")

    except Exception as e:
        print("Seeder failed:", e)
        raise


if __name__ == "__main__":
    asyncio.run(seed_company_admin_role())
