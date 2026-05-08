import asyncio
from app.db.db import connect_db
from app.core.features import FEATURE_DATA
from app.db.models.feature_model import FeatureModel


async def seed_features():
    try:
        await connect_db()

        for item in FEATURE_DATA:
            exist = await FeatureModel.find_one({"feature_key": item["feature_key"]})

            if not exist:
                await FeatureModel(**item).insert()
                print(f"{item["name"]} feature inserted successfully")

            else:
                print(f"{item["name"]} feature already exist")

    

    except Exception as e:
        return {"error": "Permission seeding failed"}
    

if __name__ == "__main__":
    asyncio.run(seed_features())