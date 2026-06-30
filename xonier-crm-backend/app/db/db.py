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
from app.db.models.lead_model import LeadsModel
from app.db.models.form_field_model import CustomFieldModel
from app.db.models.user_form_model import UserFormModel
from app.db.models.deal_model import DealModel
from app.db.models.calender_event_model import CalenderEventModel
from app.db.models.quotation_model import QuotationModel
from app.db.models.quotation_history_model import QuotationHistoryModel
from app.db.models.invoice_model import InvoiceModel
from app.db.models.notes_model import NoteModel
from app.db.models.custom_form_field_model import UserCustomFieldModel
from app.db.models.activity_model import ActivityModel
from app.db.models.communications.telephone_numbers_model import TelephoneNumbersModel
from app.db.models.communications.sms_hostory import SMSHistory
from app.db.models.email_template_model import EmailTemplateModel

from app.db.models.communications.email_history_model import EmailHistoryModel
from app.db.models.task_category_model import TaskCategoryModel
from app.db.models.task_activity_model import TaskActivityModel
from app.db.models.task_status_model import TaskStatusModel
from app.db.models.task_model import TaskModel
from app.db.models.task_remark_model import TaskRemarkModel
from app.db.models.task_report_model import TaskReportModel
from app.db.models.sub_task_model import SubTaskModel
from app.db.models.task_timelog_model import TaskTimeLogModel
from app.db.models.feature_model import FeatureModel
from app.db.models.plan_model import PlanModel
from app.db.models.company_model import CompanyModel
from app.db.models.subscription_model import SubscriptionModel
from app.db.models.query_model import QueryModel
from app.db.models.payment_model import PaymentModel


settings = get_setting()

Client = AsyncIOMotorClient(settings.MONGO_URI) 

db = None


async def connect_db():
    global Client, db
    
    try:
        
        db = Client[settings.DATABASE_NAME]
        
        await init_beanie(
            database=db,
            document_models=[UserModel, PermissionModel, UserRoleModel, OtpModel, EnquiryModel, TeamModel, TeamCategoryModel, LeadsModel, CustomFieldModel, UserFormModel, DealModel, CalenderEventModel, QuotationModel, QuotationHistoryModel, NoteModel, UserCustomFieldModel, ActivityModel, TelephoneNumbersModel, SMSHistory, EmailTemplateModel, EmailHistoryModel, TaskCategoryModel, TaskActivityModel, TaskStatusModel, TaskModel, TaskRemarkModel, TaskReportModel, SubTaskModel, InvoiceModel, TaskTimeLogModel, FeatureModel, PlanModel, CompanyModel, SubscriptionModel, QueryModel, PaymentModel]
        )
        print("Successfully connected to MongoDB and initialized Beanie")
    except Exception as e:
        print(f"failed to connect with mongodb: {e} ")



