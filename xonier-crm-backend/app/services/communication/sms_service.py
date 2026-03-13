from app.config.twilio_client import twilio_client
from app.utils.custom_exception import AppException
from app.utils.communication.sms_manager import SMSManager
from typing import Dict, Any
from app.db.models.communications.sms_hostory import SMSHistory
from datetime import datetime, timezone
from app.core.enums import MESSAGE_STATUS


class SMSService:
    def __init__(self):
        self.sms_manager = SMSManager()

    async def send_sms(self, payload: Dict[str, Any], user: Dict[str, Any]):
        phone_num = user["assignedPhoneNumber"].get("phoneNumber")
        if not phone_num:
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

