import asyncio

from app.db.db import connect_db
from app.db.models.user_model import UserModel
from app.core.enums import USER_ROLES
from app.core.security import hash_value


async def create_admin():
    await connect_db()

    email = "mridulsaklanixonier@gmail.com"
    
    hashed_email = hash_value(email)
    
    admin = await UserModel.find_one(UserModel.hashedEmail == hashed_email)
    if admin:
        print(" Admin already exists")
        return

    admin = UserModel(
        firstName="Super",
        lastName="Admin",
        email=email,
        phone="9999999999",
        password="Admin@123",
        userRole=["694a785575e0545dffcbe3db"],
        company="xonier technologies",
        isActive=True,
        isEmailVerified=True
    )

    await admin.insert()

    # admin.createdBy = admin
    # admin.updatedBy = admin
    # await admin.save()

    print("Admin created successfully")


if __name__ == "__main__":
    asyncio.run(create_admin())
