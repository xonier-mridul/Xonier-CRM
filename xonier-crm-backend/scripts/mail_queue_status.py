"""Read-only worker/backlog health for operators with the backend environment."""
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_setting
from app.services.mail_operations import MailOperations


async def main():
    settings = get_setting()
    client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True)
    try:
        result = await MailOperations(client[settings.DATABASE_NAME]).overview()
        print(json.dumps(result, default=str, indent=2))
        if set(result["healthyLanes"]) != {"critical", "general"}:
            raise SystemExit(2)
        if result["requiresReview"] or result["oldestQueuedSeconds"] > 120:
            raise SystemExit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
