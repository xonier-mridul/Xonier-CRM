from app.utils.custom_exception import AppException
from typing import Dict, Any
from app.repositories.sms_history_repository import SMSHistoryRepository
from app.core.enums import MESSAGE_STATUS
from datetime import datetime, timezone


class SMSWebhookService:
    def __init__(self):
        self.repo = SMSHistoryRepository()

    async def get_sms_status(self, formData: Dict[str, Any]):
        try:

            message_sid = formData.get("MessageSid")
            message_status = formData.get("MessageStatus")
            error_code = formData.get("ErrorCode")
            error_message = formData.get("ErrorMessage")

            sms_history = await self.repo.find_one(
                {"provider_message_sid": message_sid}
            )

            if not sms_history:
                raise AppException(400, "SMS not found")

            status_map = {
                "queued": MESSAGE_STATUS.QUEUED,
                "sent": MESSAGE_STATUS.SENT,
                "delivered": MESSAGE_STATUS.DELIVERED,
                "failed": MESSAGE_STATUS.FAILED,
                "undelivered": MESSAGE_STATUS.UNDELIVERED,
                "read": MESSAGE_STATUS.READ,
                "received": MESSAGE_STATUS.RECEIVED,
            }

            sms_history.status = status_map.get(message_status, sms_history.status)
            sms_history.updatedAt = datetime.now(timezone.utc)

            if message_status == "sent":
                sms_history.sent_at = datetime.now(timezone.utc)

            elif message_status == "delivered":
                sms_history.delivered_at = datetime.now(timezone.utc)

            elif message_status in ["failed", "undelivered"]:
                sms_history.failed_at = datetime.now(timezone.utc)
                sms_history.error_code = str(error_code) if error_code else None
                sms_history.error_message = error_message

            await sms_history.save()

            return True

        except AppException as e:

            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
