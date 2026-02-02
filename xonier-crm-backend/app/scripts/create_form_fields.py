import asyncio
from app.db.db import connect_db
from app.core.form_field import FORM_FIELDS
from app.db.models.form_field_model import CustomFieldModel

async def create_form():
    try:
        await connect_db()
        print(" Seeder started")

        for item in FORM_FIELDS:
            

            field_data = {
                **item,
                "type": item["type"].lower()
            }

            is_exist = await CustomFieldModel.find_one(
                CustomFieldModel.key == field_data["key"]
            )

            if not is_exist:
                await CustomFieldModel(**field_data).insert()
                print(f"{field_data['name']} created")
            else:
                print(f"{field_data['name']} already exists")

        

    except Exception as e:
        print(f"Seeder crashed: {e}")
        raise e


if __name__ == "__main__":
    asyncio.run(create_form())
