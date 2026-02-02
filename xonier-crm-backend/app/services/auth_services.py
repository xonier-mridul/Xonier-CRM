from app.utils.custom_exception import AppException
from app.repositories.user_repository import UserRepository
from app.core.security import hash_value
from app.db.db import Client
from typing import Dict, Any, List
from app.core.enums import USER_ROLES, USER_STATUS
from app.utils.otp_manager import generate_otp
from app.utils.email_manager import EmailManager
from app.core.enums import OTP_TYPE, OTP_EXPIRY
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
from bson import ObjectId
from app.core.enums import USER_STATUS
from app.core.constants import SUPER_ADMIN_CODE
from app.repositories.user_role_repository import UserRoleRepository
from app.utils.cache_key_generator import cache_key_generator_by_id
from app.core.constants import GET_ME_NAMESPACE
from fastapi_cache import FastAPICache
import json


class AuthServices:
    def __init__(self):
        self.client = Client
        self.repo = UserRepository()
        self.otp_repo = OtpRepository()
        self.role_repo = UserRoleRepository()
        self.email_manager = EmailManager()
        self.settings = get_setting()

    async def getAll(self, page:int=1, limit:int = 10, filters: Dict[str, Any] = {})->List[UserModel]:
        try:
           query = {}

           if "firstName" in filters:
               query.update({"firstName": filters["firstName"]})

           if "lastName" in filters:
               query.update({"lastName": filters["lastName"]})

           if "status" in filters:
               query.update({"status": filters["status"]})

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
           

            result = await self.repo.get_all_without_pagination(query, populate=["userRole", "createdBy"])

            if not result:
                raise AppException(404, "Users not found")
             
            return jsonable_encoder(result, exclude={"password"})


        except AppException:
            
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_user_by_id(self,id: PydanticObjectId):
        try:
    
          user = await self.repo.find_by_id(id, populate=["userRole", "createdBy"])

          if not user:
              raise AppException(404, "User not found for this Id")
          
          user = jsonable_encoder(user, exclude={"password", "refreshToken"})

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

            await session.commit_transaction()

            return new_user.model_dump(mode="json")

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            print("errr: ", e)
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

            hashed_otp = hash_value(str(otp))

            # send_email = await self.email_manager.send_otp_email(
            #     to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            # )

            # if not send_email:
            #     raise AppException(400, "Email send Failed")

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
            print("otp: ", otp)
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

    async def verify_login_otp(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            hashed_mail = hash_value(data["email"])
            hashed_otp = hash_value(str(data["otp"]))
            user = await self.repo.find_user_by_hashMail(
                hashMail=hashed_mail, projections=None, session=session
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

            return {
                "user": jsonable_encoder(user,exclude={"password", "refreshToken"}),
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

    async def logout(self, user_id: str):
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
            
            print("user role: ", jsonable_encoder(user.userRole))

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


