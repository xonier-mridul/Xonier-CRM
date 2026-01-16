from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_setting
from beanie import init_beanie
from app.db.models.user_model import UserModel
from app.db.models.permissions_model import PermissionModel
from app.db.models.user_roles_model import UserRoleModel
from app.db.models.otp_model import OtpModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.team_model import TeamModel
from app.db.models.team_category_model import TeamCategoryModel


settings = get_setting()

Client = AsyncIOMotorClient(settings.MONGO_URI) 

db = None


async def connect_db():
    global Client, db
    
    try:
        
        db = Client[settings.DATABASE_NAME]
        
        await init_beanie(
            database=db,
            document_models=[UserModel, PermissionModel, UserRoleModel, OtpModel, EnquiryModel, TeamModel, TeamCategoryModel]
        )
        print("Successfully connected to MongoDB and initialized Beanie")
    except Exception as e:
        print(f"failed to connect with mongodb: {e} ")



