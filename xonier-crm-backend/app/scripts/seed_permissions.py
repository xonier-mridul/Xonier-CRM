import asyncio
from app.db.db import connect_db
from app.core.permissions import PERMISSIONS
from app.db.models.permissions_model import PermissionModel



async def seed_permissions():
    try:
      await connect_db()

      for perm in PERMISSIONS:
         exist = await PermissionModel.find_one({"code": perm.get("code")})
         if not exist:
            await PermissionModel(**perm).insert()
            print(f"{perm["code"]} permission inserted successfully")
         else:
            print(f"{perm["code"]} permission already exist")
        

    except Exception as e:
        return {"error": "Permission seeding failed"}
    

if __name__ == "__main__":
   asyncio.run(seed_permissions())