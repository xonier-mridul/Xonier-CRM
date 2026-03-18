from app.config.twilio_client import twilio_client
from app.utils.custom_exception import AppException
from app.utils.communication.sms_manager import SMSManager
from typing import Dict, Any
from app.db.models.communications.sms_hostory import SMSHistory
from app.repositories.sms_history_repository import SMSHistoryRepository
from datetime import datetime, timezone
from app.core.enums import MESSAGE_STATUS
import math
from bson import ObjectId
from app.utils.validate_admin import validate_admin
from beanie import PydanticObjectId


class SMSService:
    def __init__(self):
        self.sms_manager = SMSManager()
        self.repo = SMSHistoryRepository()

    async def send_sms(self, payload: Dict[str, Any], user: Dict[str, Any]):
        if user["assignedPhoneNumber"]:
            phone_num = user["assignedPhoneNumber"].get("phoneNumber")
            if not phone_num:
                raise AppException(400, "User not have assigned valid phone number")
            
        else:
            raise AppException(400, "User not have assigned phone number")

        
        user_id = user["_id"]

        history = SMSHistory(
                sent_to_number=payload["sendTo"],
                sent_by=user_id,
                sent_from_number=phone_num,
                message=payload["message"],
                sent_at=datetime.now(timezone.utc),
            )

        await history.insert()

        try:


            send = await self.sms_manager.send_sms(send_to=payload["sendTo"], from_to=phone_num, message=payload["message"])

            if not send:
                raise AppException(400, "SMS send failed")

            
            
            history.provider_message_sid = send["sid"]
            history.status = send["status"]
            history.cost = send["price"]

            await history.save()

            return {"sid": send["sid"], "history_id": str(history.id)}
            

        
        except AppException as e:
            history.status = MESSAGE_STATUS.FAILED
            history.error_code = str(e.code)
            history.error_message = e.msg
            history.failed_at = datetime.now(timezone.utc)
            history.updatedAt = datetime.now(timezone.utc)
            await history.save()
            raise e
        
        except Exception as e:
             raise AppException(500, f"Internal server error: {e}")



    async def get_all_sms_history(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            skip = (page - 1) * limit

            query = {"isDeleted": False}

            
            if "number" in filters:
                query["$or"] = [
                    {"sent_to_number": filters["number"]},
                    {"sent_from_number": filters["number"]}
                ]

                

            
            if "status" in filters:
                query["status"] = filters["status"]

            if "dateFrom" in filters:
                query[""]

            if "dateTo" in filters:
                query[""]

            
            if "direction" in filters:
                query["direction"] = filters["direction"]

            docs = await self.repo.find(
                filter=query,
                skip=skip,
                limit=limit,
                sort=[("createdAt", -1)],
                populate=["sent_by"]
            )

            total = await self.repo.model.find(query).count()
            total_pages = math.ceil(total / limit)

            return {
                "data": [doc.model_dump(mode="json") for doc in docs],
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            }

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    
    async def get_sms_by_id(self, id:str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid SMS Object Id")
            

            is_admin = validate_admin(user["userRole"])



            message = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["sent_by"])

            if not message:
                raise AppException(404, "Message not found in database")
            
            return message.model_dump(mode="json")


        except AppException as e:
            
            raise e
        
        except Exception as e:
             raise AppException(500, f"Internal server error: {e}")

    async def get_conversation(self, sent_to: str, sent_from: str, filters: Dict[str, Any]):
        try:
            if sent_to and not sent_to.startswith("+"):
               sent_to = "+" + sent_to.strip()
            if sent_from and not sent_from.startswith("+"):
                sent_from = "+" + sent_from.strip()
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 20))
            skip = (page - 1) * limit

            
            query = {
                "isDeleted": {"$ne": True},
                "$or": [
                    {"sent_to_number": sent_to, "sent_from_number": sent_from},
                    {"sent_to_number": sent_from, "sent_from_number": sent_to},
                ]
            }

            
            docs = await self.repo.find(
                filter=query,
                skip=skip,
                limit=limit,
                sort=[("createdAt", -1)],
                populate=["sent_by"]
            )

            

            total = await self.repo.model.find(query).count()
            total_pages = math.ceil(total / limit)

            return {
                "data": [doc.model_dump(mode="json") for doc in docs],
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            }

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

