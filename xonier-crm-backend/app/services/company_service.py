from typing import Dict, Any, Optional
from app.utils.custom_exception import AppException
from pymongo.errors import DuplicateKeyError
from app.repositories.company_repository import CompanyRepository
from app.repositories.user_role_repository import UserRoleRepository
from app.repositories.user_repository import UserRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.otp_repository import OtpRepository
from app.core.security import hash_value
from app.db.db import Client
from app.db.models.company_model import CompanyModel
from app.db.models.user_model import UserModel
from app.db.models.otp_model import OtpModel
from app.schemas.company_schema import (
    CompanyCreateSchema,
    CompanySelfRegisterSchema,
    CompanyUpdateSchema,
    CompanyFilterSchema,
    VerifyCompanyOtpSchema,
    ResendOtpSchema,
)
from app.core.enums import (
    COMPANY_STATUS,
    OTP_TYPE,
    REGISTRATION_SOURCE,
    BILLING_CYCLE,
    PLAN_STATUS,
    PLAN_VISIBILITY,
    ACTIVITY_ENTITY_TYPE,
    ACTIVITY_ACTION,
)
from app.utils.activity_payload import activity_payload
from app.utils.otp_manager import generate_otp
from app.utils.email_manager import EmailManager
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from bson import DBRef, ObjectId
from app.utils.slug_generator import generate_slug
from app.db.models.plan_model import PlanModel
from app.db.models.subscription_model import SubscriptionModel
from app.utils.subscription_utils import calculate_price, calculate_subscription_dates
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.core.crypto import encryptor
from app.core.tenant import system_query


class CompanyService:
    def __init__(self):
        self.repo = CompanyRepository()
        self.client = Client
        self.roleRepo = UserRoleRepository()
        self.userRepo = UserRepository()
        self.activityRepo = ActivityRepository()
        self.otpRepo = OtpRepository()
        self.emailManager = EmailManager()
        self.encryptor = encryptor

    async def _assert_company_not_exists(
        self, company_name: str, email_hash: str, session=None
    ):
        exists = await self.repo.find_one(
            filter={"companyName": company_name, "emailHash": email_hash},
            session=session,
        )
        if exists:
            raise AppException(409, "A company with this name and email already exists")

    async def _assert_user_not_exists(self, email_hash: str, session=None):
        exists = await self.userRepo.find_one(
            filter={"hashedEmail": email_hash},
            session=session,
        )
        if exists:
            raise AppException(409, "A user with this email already exists")

    async def _get_company_admin_role(self):
        role = await self.roleRepo.get_company_admin_role()
        if not role:
            raise AppException(
                404, "Company admin role not found — run the role seeder first"
            )
        return role

    async def _resolve_plan(
        self, plan_id: Optional[str], session=None
    ) -> Optional[PlanModel]:
        if not plan_id:
            return None

        plan = await PlanModel.get(PydanticObjectId(plan_id), session=session)

        if not plan:
            raise AppException(404, f"Plan '{plan_id}' not found")

        if plan.deletedAt is not None:
            raise AppException(410, "This plan has been removed")

        if plan.status != PLAN_STATUS.ACTIVE:
            raise AppException(400, "This plan is not currently available")

        if plan.visibility == PLAN_VISIBILITY.PRIVATE:
            raise AppException(403, "This plan is not publicly available")

        return plan

    async def _create_subscription(
        self,
        plan: PlanModel,
        company_id: PydanticObjectId,
        creator_id: PydanticObjectId,
        billing_cycle: BILLING_CYCLE,
        session=None,
    ) -> SubscriptionModel:
        now = datetime.now(timezone.utc)

        base_price, discount_amount, final_price = calculate_price(plan, billing_cycle)

        start_date, end_date, trial_start, trial_end, status = (
            calculate_subscription_dates(plan, billing_cycle, now)
        )

        subscription = SubscriptionModel(
            planId=plan.id,
            companyId=company_id,
            billingCycle=billing_cycle,
            basePrice=base_price,
            discountAmount=discount_amount,
            finalPrice=final_price,
            status=status,
            startSubscriptionDate=start_date,
            endSubscriptionDate=end_date,
            trialStartDate=trial_start,
            trialEndDate=trial_end,
            createdBy=creator_id,
        )
        await subscription.insert(session=session)
        return subscription

    async def _create_user_and_company(
        self,
        payload,
        creator_id: PydanticObjectId,
        is_email_verified: bool,
        session,
    ) -> tuple[UserModel, CompanyModel]:
        role = await self._get_company_admin_role()

        new_user = UserModel(
            firstName=payload.adminFirstName,
            lastName=payload.adminLastName,
            email=payload.adminEmail,
            phone=payload.adminPhone,
            company=payload.companyName,
            password=payload.password,
            userRole=[role.id],
            isEmailVerified=is_email_verified,
            isActive=is_email_verified,
            createdBy=creator_id,
        )
        await new_user.insert(session=session)

        new_company = CompanyModel(
            companyId=generate_enquiry_id("COMP"),
            slug=generate_slug(payload.companyName),
            companyName=payload.companyName,
            email=payload.adminEmail,
            emailHash="",
            number=payload.number,
            numberHash="",
            industry=payload.industry,
            companySize=getattr(payload, "companySize", None),
            website=getattr(payload, "website", None),
            timezone=getattr(payload, "timezone", None),
            registrationNumber=getattr(payload, "registrationNumber", None),
            tradeNumber=getattr(payload, "tradeNumber", None),
            userLimit=getattr(payload, "userLimit", None),
            country=getattr(payload, "country", None),
            status=COMPANY_STATUS.PENDING_VERIFICATION,
            primary_admin=new_user,
            createdBy=creator_id,
        )

        await new_company.insert(session=session)

        new_user.companyId = new_company.id

        await new_user.replace(session=session)

        return new_user, new_company

    async def _issue_otp(
    self, user: UserModel, plain_email: str, session=None
) -> None:
        

        otp_code = generate_otp(6)
        otp_str = str(otp_code)

        otp_doc = OtpModel(
            encrypt_mail=encryptor.encrypt_data(plain_email),
            email=plain_email,
            otp=otp_str,
            encrypt_opt=encryptor.encrypt_data(otp_str),
            otp_type=OTP_TYPE.EMAIL_VERIFICATION,
        )
        await otp_doc.insert(session=session)

        sent = await self.emailManager.send_otp_email(
            to=plain_email,
            otp=otp_code,
            type=OTP_TYPE.EMAIL_VERIFICATION,
        )
        if not sent:
            raise AppException(502, "Failed to send verification email — please retry")

    async def create(
        self,
        payload: CompanyCreateSchema,
        actor: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:

                    email_hash = hash_value(payload.adminEmail.lower())
                    await self._assert_company_not_exists(
                        payload.companyName, email_hash, session
                    )

                    await self._assert_user_not_exists(email_hash, session)

                    plan = await self._resolve_plan(payload.planId, session)

                    actor_id = PydanticObjectId(actor["_id"])

                    new_user, new_company = await self._create_user_and_company(
                        payload=payload,
                        creator_id=actor_id,
                        is_email_verified=False,
                        session=session,
                    )

                    subscription = None
                    if plan:
                        subscription = await self._create_subscription(
                            plan=plan,
                            company_id=new_company.id,
                            creator_id=actor_id,
                            billing_cycle=payload.billingCycle,
                            session=session,
                        )

                        if not subscription:
                            raise AppException(400, "Subscription creation failed")

                        new_company.subscription = subscription
                        new_company.subscriptionCount = 1

                        await new_company.replace(session=session)

                    await self._issue_otp(
                        user=new_user,
                        plain_email=payload.adminEmail.lower(),
                        session=session,
                    )

                    await self.activityRepo.create(
                        activity_payload(
                            userId=actor_id,
                            entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                            entityId=new_company.id,
                            action=ACTIVITY_ACTION.CREATED.value,
                            title="Company created by admin",
                            description=f"Admin created '{payload.companyName}'"
                            + (
                                f" with plan '{plan.name}'"
                                if plan
                                else " without a plan"
                            ),
                            metadata={
                                "companyId": str(new_company.id),
                                "userId": str(new_user.id),
                                "subscriptionId": (
                                    str(subscription.id) if subscription else None
                                ),
                                "planId": payload.planId,
                                "billingCycle": payload.billingCycle if plan else None,
                                "source": REGISTRATION_SOURCE.ADMIN_CREATED,
                            },
                            ipAddress=ip_address,
                            userAgent=user_agent,
                        ),
                        session=session,
                    )

                    return {
                        "companyId": str(new_company.id),
                        "userId": str(new_user.id),
                        "subscriptionId": (
                            str(subscription.id) if subscription else None
                        ),
                        "message": "Company created. Verification OTP sent to admin email.",
                    }

                except AppException:
                    raise
                except DuplicateKeyError as e:
                    raise AppException(
                        409, f"Duplicate value for {_extract_duplicate_key(e)}"
                    )
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def self_register(
        self,
        payload: CompanySelfRegisterSchema,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    email_hash = hash_value(payload.adminEmail.lower())
                    await self._assert_company_not_exists(
                        payload.companyName, email_hash, session
                    )
                    await self._assert_user_not_exists(email_hash, session)

                    plan = await self._resolve_plan(payload.planId, session)

                    new_user, new_company = await self._create_user_and_company(
                        payload=payload,
                        creator_id=PydanticObjectId("000000000000000000000000"),
                        is_email_verified=False,
                        session=session,
                    )

                    new_user.createdBy = new_user.id
                    await new_user.save(session=session)

                    subscription = None
                    if plan:
                        subscription = await self._create_subscription(
                            plan=plan,
                            company_id=new_company.id,
                            creator_id=new_user.id,
                            billing_cycle=payload.billingCycle,
                            session=session,
                        )
                        new_company.subscription = subscription.id
                        new_company.subscriptionCount = 1
                        await new_company.save(session=session)

                    await self._issue_otp(
                        user=new_user,
                        plain_email=payload.adminEmail.lower(),
                        session=session,
                    )

                    await self.activityRepo.create(
                        activity_payload(
                            userId=new_user.id,
                            entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                            entityId=new_company.id,
                            action=ACTIVITY_ACTION.REGISTER.value,
                            title="Company self-registered",
                            description=f"'{payload.companyName}' self-registered"
                            + (
                                f" with plan '{plan.name}'"
                                if plan
                                else " without a plan"
                            ),
                            metadata={
                                "companyId": str(new_company.id),
                                "userId": str(new_user.id),
                                "subscriptionId": (
                                    str(subscription.id) if subscription else None
                                ),
                                "planId": payload.planId,
                                "billingCycle": payload.billingCycle if plan else None,
                                "source": REGISTRATION_SOURCE.SELF_REGISTERED,
                            },
                            ipAddress=ip_address,
                            userAgent=user_agent,
                        ),
                        session=session,
                    )

                    return {
                        "companyId": str(new_company.id),
                        "userId": str(new_user.id),
                        "subscriptionId": (
                            str(subscription.id) if subscription else None
                        ),
                        "message": "Registration successful. Check your email for the verification OTP.",
                    }

                except AppException:
                    raise
                except DuplicateKeyError as e:
                    raise AppException(
                        409, f"Duplicate value for {_extract_duplicate_key(e)}"
                    )
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def verify_otp(
    self,
    payload: VerifyCompanyOtpSchema,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    print("come")
                    user_id = PydanticObjectId(payload.userId)
                    
                    with system_query():
                        user = await self.userRepo.find_by_id(user_id, ["companyId"], session=session)
                        if not user:
                            raise AppException(404, "User not found")
                    
                    print("goo")

                    if user.isEmailVerified:
                        raise AppException(400, "Email is already verified")
                    with system_query():
                        otp_doc = await self.otpRepo.find_latest_otp(
                            filters={
                                "email": payload.email,
                                "otp_type": OTP_TYPE.EMAIL_VERIFICATION,
                                "is_used": False,
                            },
                            session=session,
                        )

                    if not otp_doc:
                        raise AppException(404, "No pending OTP found — request a new one")

                    expires_at = otp_doc.expires_at
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)

                    if datetime.now(timezone.utc) > expires_at:
                        raise AppException(410, "OTP has expired — request a new one")

                    if otp_doc.otp != str(payload.otp):
                        raise AppException(401, "Invalid OTP")

                    otp_doc.is_used = True
                    await otp_doc.replace(session=session)

                    user.isEmailVerified = True
                    user.isActive = True

                    print("uu: ", user)
                    
                    with system_query():
                      await user.replace(session=session)
                  

                    if user.companyId:
                        with system_query():
                            company = await self.repo.find_by_id(
                                PydanticObjectId(user.companyId.id) if hasattr(user.companyId, "id") else PydanticObjectId(user.companyId),
                                session=session,
                            )
                        
                        if company:
                            company.status = COMPANY_STATUS.ACTIVE
                            await company.replace(session=session)
                    
                    await self.activityRepo.create(
                        activity_payload(
                            userId=user_id,
                            entityType=ACTIVITY_ENTITY_TYPE.OTP.value,
                            entityId=user_id,
                            action=ACTIVITY_ACTION.VERIFY.value,
                            title="Email verified successfully",
                            description=f"User '{user.firstName}' verified their email",
                            metadata={"otpId": str(otp_doc.id)},
                            ipAddress=ip_address,
                            userAgent=user_agent,
                        ),
                        session=session,
                    )

                    return {"message": "Email verified successfully. Account is now active."}

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")


    async def resend_otp(
        self,
        payload: ResendOtpSchema,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    user_id = PydanticObjectId(payload.userId)
                    with system_query():
                         user = await self.userRepo.find_by_id(user_id, session=session)
                    if not user:
                        raise AppException(404, "User not found")

                    if user.isEmailVerified:
                        raise AppException(400, "Email is already verified")

                   
                    from app.core.crypto import encryptor
                    plain_email = encryptor.decrypt_data(user.email)
                    with system_query():
                        recent_otp = await self.otpRepo.find_latest_otp(
                            filters={
                                "email": plain_email,
                                "otp_type": OTP_TYPE.EMAIL_VERIFICATION,
                                "is_used": False,
                            },
                            session=session,
                        )

                    if recent_otp:
                        created_at = recent_otp.createdAt
                        
                        if created_at.tzinfo is None:
                            created_at = created_at.replace(tzinfo=timezone.utc)

                        elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
                        if elapsed < 60:
                            wait = int(60 - elapsed)
                            raise AppException(
                                429, f"Please wait {wait}s before requesting a new OTP"
                            )

                    
                    await self.otpRepo.bulk_update(
                        filters={
                            "email": plain_email,
                            "otp_type": OTP_TYPE.EMAIL_VERIFICATION,
                            "is_used": False,
                        },
                        data={"is_used": True},
                        session=session,
                    )

                    await self._issue_otp(
                        user=user,
                        plain_email=plain_email,
                        session=session,
                    )

                    await self.activityRepo.create(
                        activity_payload(
                            userId=user_id,
                            entityType=ACTIVITY_ENTITY_TYPE.OTP.value,
                            entityId=user_id,
                            action=ACTIVITY_ACTION.RESEND.value,
                            title="Verification OTP resent",
                            description=f"New OTP dispatched for '{user.firstName}'",
                            ipAddress=ip_address,
                            userAgent=user_agent,
                        ),
                        session=session,
                    )

                    return {"message": "A new OTP has been sent to your email"}

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")  
                

    async def get_all(
        self, filters: CompanyFilterSchema, actor: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            query: Dict[str, Any] = {"deletedAt": None}

            if filters.search and filters.search.strip():
                regex = {"$regex": filters.search.strip(), "$options": "i"}
                query["$or"] = [
                    {"companyId": regex},
                    {"slug": regex},
                    {"companyName": regex},
                    {"subDomain": regex},
                ]
            if filters.status:
                query["status"] = filters.status
            if filters.country:
                query["country"] = filters.country
            if filters.companySize:
                query["companySize"] = filters.companySize

            result = await self.repo.get_all(
                page=filters.page,
                limit=filters.limit,
                filters=query,
                populate=["primary_admin", "subscription"],
            )

            if not result:
                raise AppException(404, "Companies data not found")

            result = jsonable_encoder(result)

            for item in result["data"]:

                if "email" in item:
                    item["email"] = self.encryptor.decrypt_data(item["email"])

                if "number" in item:
                    item["number"] = self.encryptor.decrypt_data(item["number"])

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_by_id(self, company_id: str, actor: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not ObjectId.is_valid(company_id):
                raise AppException(400, "Invalid company Object ID")
         
            company = await self.repo.find_one(
                filter={"_id": PydanticObjectId(company_id), "deletedAt": None},
                populate=["subscription", "primary_admin"]
            )
            if not company:
                raise AppException(404, "Company not found")
            
            result = company.model_dump(mode="json")
            
            if "email" in result:
                result["email"] = self.encryptor.decrypt_data(result["email"])
            if "number" in result:
                result["number"] = self.encryptor.decrypt_data(result["number"])
            return result
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update(
        self,
        company_id: str,
        payload: CompanyUpdateSchema,
        actor: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            company = await self.repo.find_one(
                filter={"_id": PydanticObjectId(company_id), "deletedAt": None}
            )
            if not company:
                raise AppException(404, "Company not found")

            update_data = payload.model_dump(exclude_none=True, exclude_unset=True)
            if not update_data:
                raise AppException(400, "No fields provided for update")

            if "companyName" in update_data:
                update_data["slug"] = generate_slug(update_data["companyName"])

            for field, value in update_data.items():
                setattr(company, field, value)

            company.updatedAt = datetime.now(timezone.utc)
            company.updatedBy = PydanticObjectId(actor["_id"])
            await company.save()

            await self.activityRepo.create(
                activity_payload(
                    userId=PydanticObjectId(actor["_id"]),
                    entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                    entityId=PydanticObjectId(company_id),
                    action=ACTIVITY_ACTION.UPDATED.value,
                    title="Company updated",
                    description=f"Fields updated: {', '.join(update_data.keys())}",
                    metadata=update_data,
                    ipAddress=ip_address,
                    userAgent=user_agent,
                )
            )

            return jsonable_encoder(company)
        except AppException:
            raise
        except DuplicateKeyError as e:
            raise AppException(409, f"Duplicate value for {_extract_duplicate_key(e)}")
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update_status(
        self,
        company_id: str,
        status: COMPANY_STATUS,
        actor: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            company = await self.repo.find_one(
                filter={"_id": PydanticObjectId(company_id), "deletedAt": None}
            )
            if not company:
                raise AppException(404, "Company not found")
            if company.status == status:
                raise AppException(400, f"Company is already in '{status}' status")

            old_status = company.status
            company.status = status
            company.updatedAt = datetime.now(timezone.utc)
            company.updatedBy = PydanticObjectId(actor["_id"])
            await company.save()

            await self.activityRepo.create(
                activity_payload(
                    userId=PydanticObjectId(actor["_id"]),
                    entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                    entityId=PydanticObjectId(company_id),
                    action=ACTIVITY_ACTION.UPDATED.value,
                    title="Company status changed",
                    description=f"Status changed from '{old_status}' to '{status}'",
                    metadata={"from": old_status, "to": status},
                    ipAddress=ip_address,
                    userAgent=user_agent,
                )
            )

            return {"message": f"Company status updated to '{status}'"}
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def soft_delete(
        self,
        company_id: str,
        actor: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:

                    company = await self.repo.find_one(
                        filter={"_id": PydanticObjectId(company_id), "deletedAt": None},
                        session=session,
                    )

                    if not company:
                        raise AppException(404, "Company not found")

                    now = datetime.now(timezone.utc)
                    actor_id = PydanticObjectId(actor["_id"])

                    user = await self.userRepo.find_by_id(
                        PydanticObjectId(actor["_id"])
                    )
                    company.deletedAt = now
                    company.deletedBy = user
                    company.status = COMPANY_STATUS.DELETED
                    await company.save(session=session)

                    await self.userRepo.bulk_update(
                        filters={
                            "companyId": PydanticObjectId(company_id),
                            "deletedAt": None,
                        },
                        data={
                            "deletedAt": now,
                            "deletedBy": actor_id,
                            "isActive": False,
                        },
                        session=session,
                    )

                    await self.activityRepo.create(
                        activity_payload(
                            userId=actor_id,
                            entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                            entityId=PydanticObjectId(company_id),
                            action=ACTIVITY_ACTION.DELETE.value,
                            title="Company soft-deleted",
                            description=f"Company '{company.companyName}' and its users were deactivated",
                            ipAddress=ip_address,
                            userAgent=user_agent,
                        ),
                        session=session,
                    )

                    return {
                        "message": "Company and associated users have been deactivated"
                    }
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def restore(
        self,
        company_id: str,
        actor: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            company = await self.repo.find_one(
                filter={"_id": PydanticObjectId(company_id), "deletedAt": {"$ne": None}}
            )
            if not company:
                raise AppException(404, "Company not found or is not deleted")

            company.deletedAt = None
            company.deletedBy = None
            company.status = COMPANY_STATUS.ACTIVE
            company.updatedAt = datetime.now(timezone.utc)
            company.updatedBy = PydanticObjectId(actor["_id"])
            await company.save()

            await self.activityRepo.create(
                activity_payload(
                    userId=PydanticObjectId(actor["_id"]),
                    entityType=ACTIVITY_ENTITY_TYPE.COMPANY.value,
                    entityId=PydanticObjectId(company_id),
                    action=ACTIVITY_ACTION.RESTORE.value,
                    title="Company restored",
                    description=f"Company '{company.companyName}' was restored",
                    ipAddress=ip_address,
                    userAgent=user_agent,
                )
            )

            return {"message": "Company restored successfully"}
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_stats(self, actor: Dict[str, Any]) -> Dict[str, Any]:
        try:
            pipeline = [
                {"$match": {"deletedAt": None}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            ]
            raw = await CompanyModel.aggregate(pipeline).to_list()
            stats = {item["_id"]: item["count"] for item in raw}
            return {"total": sum(stats.values()), "byStatus": stats}
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


def _extract_duplicate_key(error: DuplicateKeyError) -> str:
    details = error.details or {}
    key_pattern = details.get("keyPattern", {})
    return ", ".join(key_pattern.keys()) if key_pattern else "unknown field"
