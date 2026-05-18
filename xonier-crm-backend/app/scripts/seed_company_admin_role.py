import asyncio
from app.db.db import connect_db
from app.db.models.user_roles_model import UserRoleModel
from app.repositories.user_role_repository import UserRoleRepository
from app.core.tenant import system_query
from app.core.constants import COMPANY_ADMIN_CODE

repo = UserRoleRepository()

async def seed_company_admin_role():
    try:
        await connect_db()
        with system_query():
           
            is_exist = await repo.find_one(
               {"code": COMPANY_ADMIN_CODE}
            )


            if is_exist:
                print("Company admin role already exists")
                return

        admin_role = UserRoleModel(
            name="Company Admin",
            code="COMPANY_ADMIN",
            power=80,
            canManageBelow=True,
            permissions=[],
            isSystemRole=True
        )
        with system_query():
            await admin_role.insert()
            print("Company Admin role seeded successfully")

    except Exception as e:
        print("Seeder failed:", e)
        raise


if __name__ == "__main__":
    asyncio.run(seed_company_admin_role())
