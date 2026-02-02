from redis.asyncio import Redis
from fastapi_cache import FastAPICache

from fastapi_cache.backends.redis import RedisBackend
from app.core.config import get_setting

settings = get_setting()

redis: Redis | None = None

async def init_cache():
    global redis
    redis = Redis(
        port=settings.REDIS_PORT,
        host=settings.REDIS_HOST,
        decode_responses=True
    )
    FastAPICache.init(RedisBackend(redis), prefix="crm-cache")
    print("Redis cache initialized successfully")