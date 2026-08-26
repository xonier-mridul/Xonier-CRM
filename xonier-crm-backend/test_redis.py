import asyncio
from redis.asyncio import Redis

async def main():
    try:
        r = Redis(host='localhost', port=6379, decode_responses=True)
        await r.ping()
        print("Redis ping successful")
        keys = await r.keys('*')
        print(f"Found {len(keys)} keys")
    except Exception as e:
        print(f"Redis error: {e}")

asyncio.run(main())
