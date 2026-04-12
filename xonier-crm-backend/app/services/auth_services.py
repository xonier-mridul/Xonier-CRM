from app.utils.custom_exception import AppException
from app.repositories.user_repository import UserRepository
from app.core.security import hash_value
from app.db.db import Client
from typing import Dict, Any, List
from app.utils.otp_manager import generate_otp
from app.utils.email_manager import EmailManager
from app.core.enums import OTP_TYPE, OTP_EXPIRY, USER_STATUS, ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION
from datetime import datetime, timezone, timedelta
from app.core.config import get_setting
from fastapi.encoders import jsonable_encoder
from beanie import PydanticObjectId
from pydantic import ValidationError
from app.core.crypto import encryptor
from app.repositories.otp_repository import OtpRepository
from app.db.models.user_model import UserModel
from app.schemas.user_schema import UpdateUserSchema
from app.core.security import hash_password
from bson import ObjectId, DBRef

from app.core.constants import SUPER_ADMIN_CODE
from app.repositories.user_role_repository import UserRoleRepository
from app.utils.cache_key_generator import cache_key_generator_by_id
from app.repositories.activity_repository import ActivityRepository
from app.core.constants import GET_ME_NAMESPACE
from fastapi_cache import FastAPICache
import json
from typing import Optional

from app.utils.validate_admin import validate_admin
from app.utils.get_team_members import GetTeamMembers
from app.utils.activity_payload import activity_payload


class AuthServices:
    def __init__(self):
        self.client = Client
        self.repo = UserRepository()
        self.otp_repo = OtpRepository()
        self.role_repo = UserRoleRepository()
        self.email_manager = EmailManager()
        self.settings = get_setting()
        self.get_team_members = GetTeamMembers()
        self.activityRepo = ActivityRepository()
        self.crypto = encryptor

    async def getAll(self, page:int=1, limit:int = 10, filters: Dict[str, Any] = {})->List[UserModel]:
        try:
           query = {"$or": [
               {"status": USER_STATUS.ACTIVE},
               {"status": USER_STATUS.INACTIVE},
               {"status": USER_STATUS.SUSPENDED},
           ]}

           if "search" in filters and filters["search"].strip():
               regex_data = {"$regex": filters["search"].strip(), "$options": "i"}

               query.update({"$or": [
                   {"firstName": regex_data},
                   {"lastName": regex_data},
                   {"company": regex_data}
               ]})
               


           if "status" in filters:
               if filters["status"] != USER_STATUS.DELETED:
                   query.update({"status": filters["status"]})
                   
               
           if "company" in filters:
               query.update({"company": filters["company"]})


           users = await self.repo.get_all(page, limit, query, populate=["userRole", "createdBy"], sort=["-createdAt"])

           if not users:
               raise AppException(404, "Users not found")
           
           
           parsed_users = jsonable_encoder(users["data"], exclude={"password", "refreshToken"})
           for item in parsed_users:
               item["email"] = encryptor.decrypt_data(item["email"])
               item["phone"] = encryptor.decrypt_data(item["phone"])

           users["data"]=parsed_users

           return users
         
        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_user_by_team(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            is_admin = validate_admin(user["userRole"])
            is_manager = False

            query = {}

            if not is_admin:
                members = await self.get_team_members.get_team_members(user["_id"])

                obj_members = [PydanticObjectId(item) for item in members]

                print("mem: ", obj_members)

                if members:
                    query.update({"_id": {"$in": obj_members}})
                    is_manager = True

                else:
                    query.update({"_id": PydanticObjectId(user["_id"])})

            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i" }

                query.update({"$or": [{"firstName": regex_data}, {"lastName": regex_data}]})

            if not is_admin and not is_manager and query == {}:
                raise AppException(409, "You are not authorized to get this data")
            
            print("11: ", query)

            result = await self.repo.get_all(page=int(page), limit=int(limit) ,filters=query, sort=["-createdAt"] )

            if not result:
                raise AppException(404, "Users not found")
            
            
            result = jsonable_encoder(result["data"])

            
            for item in result:
                if item and item.get("email"):
                    item["email"] = self.crypto.decrypt_data(item["email"])

            return result


        except Exception as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
        


    async def get_all_for_frontend(self, page:int=1, limit:int = 10, filters: Dict[str, Any] = {})->List[UserModel]:
        try:
           query = {}

           if "firstName" in filters:
               query.update({"firstName": filters["firstName"]})

           if "lastName" in filters:
               query.update({"lastName": filters["lastName"]})

           
           query.update({"status": USER_STATUS.ACTIVE})

           if "company" in filters:
               query.update({"company": filters["company"]})
            

           users = await self.repo.get_all(page, limit, query, populate=["userRole", "createdBy"])

           if not users:
               raise AppException(404, "Users not found")
           
           parsed_users = jsonable_encoder(users["data"], exclude={"password", "refreshToken"})
           for item in parsed_users:
               item["email"] = encryptor.decrypt_data(item["email"])
               item["phone"] = encryptor.decrypt_data(item["phone"])
           users["data"]=parsed_users

           return users
         
        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_all_active_without_pagination(self, filters:Dict[str, Any]):
        try:
            query = {}

            query.update({"status": USER_STATUS.ACTIVE.value})
           

            result = await self.repo.get_all_without_pagination(query, populate=["userRole", "createdBy", "assignedPhoneNumber"])

            if not result:
                raise AppException(404, "Users not found")
             
            return jsonable_encoder(result, exclude={"password"})


        except AppException:
            
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
    
    async def get_all_deleted_users(self, page: int = 1, limit: int = 10, user: Dict[str, Any] = {}, filters: Dict[str, Any] = {}):
        try:
            is_admin = validate_admin(user["userRole"])
 
            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can access deleted users")
 
            query = {"status": USER_STATUS.DELETED.value}

            if "search" in filters and filters["search"].strip():
                search_regex = {"$regex": filters["search"].strip(), "$options": "i"}

                query.update({"$or": [
                    {"firstName": search_regex},
                    {"lastName": search_regex},
                    {"company": search_regex}
                ] })
 
            
 
            if "email" in filters:
                hashed_email = hash_value(filters["email"].lower())
                query["hashedEmail"] = {"$regex":hashed_email, "$options": "i"}
 
            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD")
 
                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid toDate format. Use ISO format: YYYY-MM-DD")
 
                if date_filter:
                    query["deletedAt"] = date_filter
 
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["userRole", "deletedBy", "createdBy"],
                sort=["-deletedAt"]
            )
 
            if not result:
                raise AppException(404, "No deleted users found")
 
            result = jsonable_encoder(result)
 
            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                if item.get("phone"):
                    item["phone"] = encryptor.decrypt_data(item["phone"])
                item.pop("password", None)
                item.pop("refreshToken", None)
                item.pop("hashedEmail", None)
                item.pop("hashedPhone", None)
 
            return result
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
        

    async def get_user_by_id(self,id: PydanticObjectId, user: Dict[str, Any]):
        try:
          
          is_admin = validate_admin(user["userRole"])
          is_manager = False
          is_creator = False

          exist_user = await self.repo.find_by_id(id, populate=["userRole", "createdBy"])

          if not exist_user:
              raise AppException(404, "User not found for this Id")

          if not is_admin:
              members = await self.get_team_members.get_team_members(user["_id"])



              if exist_user.id in members:
                  is_manager = True

          
          if str(exist_user.id) == str(user["_id"]):
              is_creator = True

                 
          if not is_admin and not is_manager and not is_creator:
              raise AppException(403, "Permission denied, you can not access this user profile data")
          user = jsonable_encoder(exist_user, exclude={"password", "refreshToken"})

          user["email"] = encryptor.decrypt_data(user["email"])
          user["phone"] = encryptor.decrypt_data(user["phone"])

          
          return user

        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
    

    async def get_user_profile(self, user: Dict[str, Any]):
        try:
          
          is_admin = validate_admin(user["userRole"])
          is_manager = False
          is_creator = False

          exist_user = await self.repo.find_by_id(PydanticObjectId(user["_id"]), populate=["userRole", "createdBy"])

          if not exist_user:
              raise AppException(404, "User not found for this Id")

          if not is_admin:
              members = await self.get_team_members.get_team_members(user["_id"])



              if exist_user.id in members:
                  is_manager = True

          
          if str(exist_user.id) == str(user["_id"]):
              is_creator = True

                 
          if not is_admin and not is_manager and not is_creator:
              raise AppException(403, "Permission denied, you can not access this user profile data")
          user = jsonable_encoder(exist_user, exclude={"password", "refreshToken"})

          user["email"] = encryptor.decrypt_data(user["email"])
          user["phone"] = encryptor.decrypt_data(user["phone"])

          
          return user

        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")


    async def create(self, user: Dict[str, Any], data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            hashed_email = hash_value(data["email"])

            is_user_exist = await self.repo.find_user_by_hashMail(
                hashMail=hashed_email, populate=["userRole"], session=session
            )

            if is_user_exist:
                raise AppException(400, "User already exist, please use another email")
            
            for item in data["userRole"]:

              get_role = await self.role_repo.find_by_id(id=PydanticObjectId(item), session=session)
              
              if get_role.code == SUPER_ADMIN_CODE:
                  raise AppException(400, "Super admin user creation is invalid, please use different role")
                
            
            userModel = await self.repo.find_by_id(id=user["_id"], session=session)

            if not userModel:
                raise AppException(404, "Current user not found")

            new_user = await self.repo.create(
                data={**data, "createdBy": userModel.id}, session=session
            )

            if not new_user:
                raise AppException(400, "User not created")
            
            activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.USER, entityId=PydanticObjectId(new_user.id), action=ACTIVITY_ACTION.CREATED, title="create user", metadata={"userName": f"{new_user.firstName} {new_user.lastName}", "company":new_user.company})

            is_activity = await self.activityRepo.create(data=activity, session=session)

            if not is_activity:
                raise AppException(400, "Activity creation failed")

            await session.commit_transaction()

            return new_user.model_dump(mode="json")

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")
        
        except ValidationError as e:
            raise AppException(
                status_code=422,
                message=e.errors()
            )

        finally:
            await session.end_session()

    async def login(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:

            session.start_transaction()
           
            hashed_mail = hash_value(data["email"])
            encrypt_email = self.crypto.encrypt_data(data["email"])
           
            isUserExist = await self.repo.find_user_by_hashMail(
                hashMail=hashed_mail, projections=None, session=session
            )

            if not isUserExist:
                raise AppException(404, "User not found, Please create account first")
            

            if not isUserExist.isEmailVerified:
                raise AppException(400, "Email is not verified, please verified first")

            if isUserExist.status == USER_STATUS.SUSPENDED.value:
                raise AppException(
                    400, "Your account is suspended, please contact with support team"
                )

            if isUserExist.status == USER_STATUS.INACTIVE.value:
                raise AppException(
                    400,
                    "Your account is inactive, please contact with support team or admin",
                )

            if isUserExist.status == USER_STATUS.DELETED.value:
                raise AppException(400, "Your account is deleted, please connect with support team")
           
            is_password_valid = isUserExist.compare_password(data["password"])

            if not is_password_valid:
                raise AppException(400, "Password is not valid, please try again")

            otp = generate_otp(6)

            print("otp: ", otp)

            hashed_otp = hash_value(str(otp))
            encrypt_opt = self.crypto.encrypt_data(str(otp))


            send_email = await self.email_manager.send_otp_email(
                to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            )

            if not send_email:
                raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )

            create_otp = await self.otp_repo.create(
                {
                    "encrypt_mail": encrypt_email,
                    "email": hashed_mail,
                    "otp": hashed_otp,
                    "encrypt_opt": encrypt_opt,
                    "otp_type": OTP_TYPE.LOGIN,
                    "expires_at": expire_time,
                },
                session=session,
            )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")
            
            

            await session.commit_transaction()

            return isUserExist.model_dump()

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")
        
        finally:
            await session.end_session()

    async def resend_verification_otp(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            hashed_mail = hash_value(data["email"])

            isUserExist = await self.repo.find_user_by_hashMail(
                hashMail=hashed_mail, projections=None, session=session
            )

            if not isUserExist:
                raise AppException(404, "User not found, bad request")
            
            isPasswordValid =  isUserExist.compare_password(data["password"])


            if not isPasswordValid:
                raise AppException(400, "Password not match, please back to the login page and try again")
            
            isOtpSend = await self.otp_repo.find_latest_otp({"email": data["email"], "otp_type": OTP_TYPE.LOGIN.value}, session)

            if isOtpSend:
                now = datetime.now(timezone.utc)
                otp_created_time = isOtpSend.createdAt

                if (now - otp_created_time) < timedelta(minutes=5):
                    raise AppException(
                        429,
                        "OTP already sent. Please wait 5 minutes before requesting a new OTP."
                    )
            
            otp = generate_otp(6)
            
            hashed_otp = hash_value(str(otp))

            send_email = await self.email_manager.send_otp_email(
                to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            )

            if not send_email:
                raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )

            create_otp = await self.otp_repo.create(
                {
                    "email": hashed_mail,
                    "otp": hashed_otp,
                    "otp_type": OTP_TYPE.LOGIN,
                    "expires_at": expire_time,
                },
                session=session,
            )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")
            
            


            await session.commit_transaction()
            return True
            

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")
        
        finally:
            await session.end_session()

    async def verify_login_otp(self, data: Dict[str, Any], ip: Optional[str] = None, agent: Optional[str] = None):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            hashed_mail = hash_value(data["email"])
            hashed_otp = hash_value(str(data["otp"]))
            user = await self.repo.find_user_by_hashMail(
                hashMail=hashed_mail, projections=None, populate=["userRole"], session=session
            )

            if not user:
                raise AppException(404, "User not found, Please create account first")
            
            isPasswordValid = user.compare_password(data["password"])

            if not isPasswordValid:
                raise AppException(400, "Password not match, please back to the login page and try again")

            latest_otp = await self.otp_repo.find_latest_otp(
                {"email": hashed_mail, "otp_type": OTP_TYPE.LOGIN.value},
                session=session,
            )

            if not latest_otp:
                raise AppException(404, "Otp not found, please try again")

            # if latest_otp.expires_at < datetime.now(timezone.utc):
            #     raise AppException(400, "Expired OTP, please regenerate otp")

            if latest_otp.is_used == True:
                raise AppException(400, "Used Otp, not valid")

            if latest_otp.otp != hashed_otp:
                raise AppException(400, "Invalid Otp, Please try again")

            latest_otp.is_used = True

            await latest_otp.save(session=session)

            access_token = user.generate_access_token()
            refresh_token = user.generate_refresh_token()

            hash_refresh_token = hash_value(refresh_token)

            await user.set(
                {
                    "refreshToken": hash_refresh_token,
                    "updatedAt": datetime.now(timezone.utc),
                    "lastLogin": datetime.now(timezone.utc),
                },
                session=session,
            )

            await session.commit_transaction()

            usr =  await self.repo.find_by_id_nested(user.id, ["userRole", "userRole.permissions"])

            activity = activity_payload(userId=PydanticObjectId(user.id), entityType=ACTIVITY_ENTITY_TYPE.AUTH, entityId=PydanticObjectId(user.id), action=ACTIVITY_ACTION.LOGIN, title="Login user", metadata={"userName": f"{user.firstName} {user.lastName}", "company":user.company, "email": user.email}, ipAddress=ip, userAgent=agent)

            is_activity = await self.activityRepo.create(data=activity, session=session)

            if not is_activity:
                raise AppException(400, "Activity creation failed")

            return {
                "user": jsonable_encoder(usr,exclude={"password", "refreshToken"}),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
             await session.abort_transaction()
             raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def getMe(self, userId: PydanticObjectId)->bool:
        try:
         
        

         user = await self.repo.find_by_id_nested(userId, ["userRole", "userRole.permissions"])
         
         if not user:
             raise AppException(400, "User not found")
         
         
         
         result = jsonable_encoder(user, exclude={"password", "refreshToken"})

         
         
         return result
        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def update(self, userId: PydanticObjectId, updatedBy: PydanticObjectId, payload: Dict[str, Any])->bool:
        session = await self.client.start_session()
        try:
            session.start_transaction()
             
            payload = {
                **payload, "updatedBy": updatedBy 
            }

            updated_user = await self.repo.update_with_encryption(userId, payload, session)
            if not updated_user:
                raise AppException(400, "User not updated")
            
            await session.commit_transaction()
            return True

        except AppException:
            await session.abort_transaction()
            raise 
        except Exception as e:
            await session.abort_transaction()
            raise

        finally:
            await session.end_session()

    
    async def update_status(self, userId: str, updatedBy: str, payload: Dict[str, Any])->bool:
        try:

            is_exist = await self.repo.find_by_id(id=PydanticObjectId(userId))

            if not is_exist:
                raise AppException(404, "User not found")
            
            new_payload = {
                **payload, "updatedBy": PydanticObjectId(updatedBy)
            }
            
            updated = await self.repo.update_with_encryption(PydanticObjectId(userId), data=new_payload)


            if not updated:
                raise AppException(400, "User status updating failed")
            
            return True


        except AppException:
            raise 

        except Exception as e:
           
            raise

    async def logout(self, user_id: str, ip: Optional[str] = None, agent: Optional[str] = None):
        session = await self.client.start_session()

        try:
            session.start_transaction()
            user = await self.repo.find_by_id(user_id, False, session)

            if not user:
                raise AppException(401, "Unauthorized user")

            await user.set(
                {"refreshToken": None, "updatedAt": datetime.now(timezone.utc)},
                session=session,
            )

            activity = activity_payload(userId=PydanticObjectId(user.id), entityType=ACTIVITY_ENTITY_TYPE.AUTH, entityId=PydanticObjectId(user.id), action=ACTIVITY_ACTION.LOGOUT, title="Logout user", metadata={"userName": f"{user.firstName} {user.lastName}", "company":user.company, "email": user.email}, ipAddress=ip, userAgent=agent)

            is_activity = await self.activityRepo.create(data=activity, session=session)

            if not is_activity:
                raise AppException(400, "Activity creation failed")
            await session.commit_transaction()

            

            return user.model_dump()

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    
    async def soft_delete(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            user = await self.repo.find_by_id(userId, ["userRole"], session=session)

            if not user:
                raise AppException(404, "User not found")

            roles = jsonable_encoder(user.userRole)

            for item in roles:
                if item["code"] == SUPER_ADMIN_CODE:
                    raise AppException(400, "Super Admin user deletion not allowed")
            

            
            if user.status == USER_STATUS.DELETED.value:
                raise AppException(400, "User already deleted")
            
           
            
            updatedUser = await self.repo.update(userId, {
                "status": USER_STATUS.DELETED, "updatedBy": user, "deletedBy": user, "deletedAt": datetime.now(timezone.utc)
            }, session=session)

            if not updatedUser:
                raise AppException(400, "User not updated")

            await session.commit_transaction()
            
            return jsonable_encoder(obj=user, exclude={"password", "refreshToken"})

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def permanent_delete(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
 
            is_admin = validate_admin(user["userRole"])
 
            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can permanently delete users")
 
            target_user = await self.repo.find_by_id(userId, ["userRole"], session=session)
 
            if not target_user:
                raise AppException(404, "User not found")
 
            roles = jsonable_encoder(target_user.userRole)
 
            for item in roles:
                if item["code"] == SUPER_ADMIN_CODE:
                    raise AppException(400, "Super Admin user deletion not allowed")
 
            if target_user.status != USER_STATUS.DELETED.value:
                raise AppException(400, "Only soft-deleted users can be permanently deleted. Please soft delete the user first.")
 
            deleted = await self.repo.delete_by_id(userId, session=session)
 
            if not deleted:
                raise AppException(400, "Permanent deletion failed")
 
            await session.commit_transaction()
 
            return True
 
        except AppException:
            await session.abort_transaction()
            raise
 
        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")
 
        finally:
            await session.end_session()
    
    async def bulk_permanent_delete(self, payload: Dict[str, Any], user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            
            session.start_transaction()
 
            is_admin = validate_admin(user["userRole"])
 
            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can permanently delete users")
            
            user_ids = payload.get("userIds", [])
 
            if not user_ids:
                raise AppException(400, "userIds are required")
            
            for uid in user_ids:
                
                if not ObjectId.is_valid(uid):
                    raise AppException(400, f"Invalid user ObjectId: {uid}")
 
            user_object_ids = [PydanticObjectId(uid) for uid in user_ids]
 
            users = await self.repo.find_many(
                filters={"_id": {"$in": user_object_ids}},
                populate=["userRole"]
            )
 
            if not users:
                raise AppException(404, "No users found for the provided ids")
 
            found_ids = {str(u.id) for u in users}
            missing_ids = [uid for uid in user_ids if uid not in found_ids]
 
            failed_users = []
 
            for uid in missing_ids:
                failed_users.append({
                    "id": uid,
                    "reason": "User not found"
                })
 
            eligible_users = []
 
            for target in users:
                roles = jsonable_encoder(target.userRole)
 
                is_super_admin = any(r["code"] == SUPER_ADMIN_CODE for r in roles)
                if is_super_admin:
                    failed_users.append({
                        "id": str(target.id),
                        "reason": "Super Admin user deletion not allowed"
                    })
                    continue
 
                if target.status != USER_STATUS.DELETED.value:
                    failed_users.append({
                        "id": str(target.id),
                        "reason": "User is not soft-deleted. Please soft delete first before permanent deletion"
                    })
                    continue
 
                eligible_users.append(target)
 
            deleted_count = 0
 
            if eligible_users:
                eligible_ids = [PydanticObjectId(u.id) for u in eligible_users]
 
                for uid in eligible_ids:
                    await self.repo.delete_by_id(uid, session=session)
 
                deleted_count = len(eligible_users)
 
            await session.commit_transaction()
 
            deleted = deleted_count
            failed = len(failed_users)
 
            if deleted == 0:
                message = "No users were permanently deleted"
            elif failed == 0:
                message = f"All {deleted} user{'s' if deleted > 1 else ''} permanently deleted successfully"
            else:
                message = f"{deleted} user{'s' if deleted > 1 else ''} permanently deleted, {failed} failed"
 
            return {
                "message": message,
                "totalRequested": len(user_ids),
                "deletedCount": deleted_count,
                "failedCount": len(failed_users),
                "failedUsers": failed_users
            }
 
        except AppException:
            await session.abort_transaction()
            raise
 
        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")
 
        finally:
            await session.end_session()
 

    async def assign_phone_number(self,id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid user object id")
            
            if not ObjectId.is_valid(payload["assignedPhoneNumber"]):
                raise AppException(400, "Invalid telephone object id")
            
            user = await self.repo.find_by_id(id=PydanticObjectId(id))

            if not user:
                raise AppException(400, "User not found")
            
            if user.assignedPhoneNumber:
                raise AppException(400, "Phone  already assigned to the user")
            
            if user.status == USER_STATUS.DELETED:
                raise AppException(400, "User is deleted")
            
            payload = {
                "assignedPhoneNumber": DBRef(collection="telephones", id=PydanticObjectId(payload["assignedPhoneNumber"])),
                "updatedAt": datetime.now(timezone.utc)
            }
           
            update = await self.repo.update(id=PydanticObjectId(id), data=payload)

            if not update:
                raise AppException(400, "Phone number updation failed")
            
            

            return user.model_dump(mode="json")


        except AppException as e:
            
            raise e

        except Exception as e:
            
            raise AppException(status_code=500, message=f"internal server error: {e}")
        

    async def clear_phone_number(self,id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid user object id")
            
           
            
            user = await self.repo.find_by_id(id=PydanticObjectId(id))

            if not user:
                raise AppException(400, "User not found")
            
            if not user.assignedPhoneNumber:
                raise AppException(400, "Phone data already empty")
            
            if user.status == USER_STATUS.DELETED:
                raise AppException(400, "User is deleted")
            
            payload = {
                "assignedPhoneNumber": None,
                "updatedAt": datetime.now(timezone.utc)
            }
           
            update = await self.repo.update(id=PydanticObjectId(id), data=payload)

            if not update:
                raise AppException(400, "Phone number clearation failed")
            
            

            return user.model_dump(mode="json")


        except AppException as e:
            
            raise e

        except Exception as e:
            
            raise AppException(status_code=500, message=f"internal server error: {e}")


    async def reset_password(self, userId: str, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            
            
            user = await self.repo.find_by_id(ObjectId(userId), False, session=session)

            if not user:
                raise AppException(404, "User not found")
            
            isPasswordCorrect = user.compare_password(data["oldPassword"])
           
            if not isPasswordCorrect:
                
                raise AppException(400, "Old password is incorrect")
            
            if data["oldPassword"] == data["newPassword"]:
                raise AppException(400, "Your new password is same as old password")
            
            hashed = hash_password(data["newPassword"])



            result = await self.repo.update(
                id=ObjectId(userId),
                data={
                    "password": hashed,
                    "updatedAt": datetime.now(timezone.utc)
                },
                session=session
            )

            if not result:
                raise AppException(400, "Password not updated")
            
            await session.commit_transaction()
            
            return True


        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")


        finally:
            await session.end_session()


    async def reset_user_password(self, userId: str, payload: Dict[str, Any], updatedBy: Dict[str, Any] )->bool:
        try:
            print("one", userId)
            is_exist = await self.repo.find_by_id(id=PydanticObjectId(userId))
            print("isEx", payload)
            if(payload.get("password") != payload.get("confirmPassword")):
                raise AppException(400, "Password and Confirm Password not matching, please check and try again")
            print("tow")
            if not is_exist:
                raise AppException(404, "User not found")
            
            is_super_admin = False

            for role in updatedBy.get("userRole", []):
                if role.get("code") == "SUPER_ADMIN":
                    is_super_admin = True
                    break
            print("three")
            if not is_super_admin:
                raise AppException(403, "Permission denied")
            
            hashed = hash_password(payload["password"])
            
            new_payload = {
                "password": hashed,
                "updatedBy": PydanticObjectId(updatedBy.get("_id")),
                "updatedAt": datetime.now(timezone.utc)
            }
            print("four", new_payload)

            update = await self.repo.update_with_encryption(PydanticObjectId(userId), new_payload)
            print("five", update)
            if not update:
                raise AppException(400, "User update failed")
            
            
            
            return True


        
        except AppException:
            
            raise

        except Exception as e:
            
            raise AppException(status_code=500, message="internal server error")


    async def restore_user(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
 
            is_admin = validate_admin(user["userRole"])
 
            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can restore users")
 
            target_user = await self.repo.find_by_id(userId, ["userRole"], session=session)
 
            if not target_user:
                raise AppException(404, "User not found")
 
            if target_user.status != USER_STATUS.DELETED.value:
                raise AppException(400, "User is not deleted, only deleted users can be restored")
 
            updated = await self.repo.update(
                userId,
                {
                    "status": USER_STATUS.ACTIVE,
                    "deletedBy": None,
                    "deletedAt": None,
                    "updatedBy": DBRef(collection="users", id=user["_id"]),
                    "updatedAt": datetime.now(timezone.utc),
                },
                session=session
            )
 
            if not updated:
                raise AppException(400, "User restore failed")
 
            await session.commit_transaction()
 
            result = target_user.model_dump(mode="json")
            result.pop("password", None)
            result.pop("refreshToken", None)
            result.pop("hashedEmail", None)
            result.pop("hashedPhone", None)
 
            result["email"] = encryptor.decrypt_data(target_user.email)
            if target_user.phone:
                result["phone"] = encryptor.decrypt_data(target_user.phone)
 
            return result
 
        except AppException:
            await session.abort_transaction()
            raise
 
        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")
 
        finally:
            await session.end_session()
 
 
    async def bulk_restore_users(self, payload: Dict[str, Any], user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
 
            is_admin = validate_admin(user["userRole"])
 
            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can restore users")
 
            user_ids = payload.get("userIds", [])
 
            if not user_ids:
                raise AppException(400, "userIds are required")
 
            for uid in user_ids:
                if not ObjectId.is_valid(uid):
                    raise AppException(400, f"Invalid user ObjectId: {uid}")
 
            user_object_ids = [PydanticObjectId(uid) for uid in user_ids]
 
            users = await self.repo.find_many(
                filters={"_id": {"$in": user_object_ids}},
                populate=["userRole"]
            )
 
            found_ids = {str(u.id) for u in users} if users else set()
            missing_ids = [uid for uid in user_ids if uid not in found_ids]
 
            failed_users = []
 
            for uid in missing_ids:
                failed_users.append({
                    "id": uid,
                    "reason": "User not found"
                })
 
            eligible_users = []
 
            for target in (users or []):
                if target.status != USER_STATUS.DELETED.value:
                    failed_users.append({
                        "id": str(target.id),
                        "reason": f"User is not deleted (current status: {target.status}), only deleted users can be restored"
                    })
                    continue
 
                eligible_users.append(target)
 
            restored_count = 0
 
            if eligible_users:
                eligible_ids = [PydanticObjectId(u.id) for u in eligible_users]
 
                await self.repo.bulk_update(
                    filters={"_id": {"$in": eligible_ids}},
                    data={
                        "status": USER_STATUS.ACTIVE,
                        "deletedBy": None,
                        "deletedAt": None,
                        "updatedBy": DBRef(collection="users", id=user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                    },
                    session=session
                )
 
                restored_count = len(eligible_users)
 
            await session.commit_transaction()
 
            failed = len(failed_users)
 
            if restored_count == 0:
                message = "No users were restored"
            elif failed == 0:
                message = f"All {restored_count} user{'s' if restored_count > 1 else ''} restored successfully"
            else:
                message = f"{restored_count} user{'s' if restored_count > 1 else ''} restored, {failed} failed"
 
            return {
                "message": message,
                "totalRequested": len(user_ids),
                "restoredCount": restored_count,
                "failedCount": failed,
                "failedUsers": failed_users
            }
 
        except AppException:
            await session.abort_transaction()
            raise
 
        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")
 
        finally:
            await session.end_session()
 
    async def verify_refresh_token(self, payload: Dict[str, Any]):
        try:
           
            user_obj = await self.repo.find_by_id(
                PydanticObjectId(payload["_id"]), 
                populate=["userRole"]
            )

            

            if not user_obj:
                raise AppException(404, "User not found")

            if user_obj.status == USER_STATUS.DELETED.value:
                raise AppException(400, "Your account has been deleted")

            if user_obj.status == USER_STATUS.SUSPENDED.value:
                raise AppException(400, "Your account is suspended, please contact the admin")

            
            if not user_obj.refreshToken:
                raise AppException(401, "Session expired, please login again")

            
            incoming_token = payload.get("raw_token")
            
            hashed_incoming = hash_value(incoming_token)

            

            if hashed_incoming != user_obj.refreshToken:
                raise AppException(401, "Invalid refresh token, please login again")

           
            access_token = user_obj.generate_access_token()
            refresh_token = user_obj.generate_refresh_token()

            
            await user_obj.set({
                "refreshToken": hash_value(refresh_token),
                "updatedAt": datetime.now(timezone.utc),
            })

            usr = await self.repo.find_by_id_nested(user_obj.id, ["userRole", "userRole.permissions"])

            return {
                "message": "Token refreshed successfully",
                "user": jsonable_encoder(usr, exclude={"password", "refreshToken"}),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")
        


  

            


