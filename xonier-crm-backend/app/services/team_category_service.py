from typing import Dict, Any
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.utils.slug_generator import generate_slug
from app.repositories.team_category_repository import TeamCategoryRepository
from app.repositories.team_repository import TeamRepository
from app.db.db import Client
from fastapi.encoders import jsonable_encoder
from typing import Optional


class TeamCategoryService:
    def __init__(self):
        self.repo = TeamCategoryRepository()
        self.team_repo = TeamRepository()
        self.client = Client

    async def create(self, payload: Dict[str, Any], createdBy: str):
        async with await self.client.start_session() as session:
          async with session.start_transaction():
            try:
                name = payload.get("name")
                if not name:
                    raise AppException(400, "Category name is required")

                slug = generate_slug(name)

                is_exist = await self.repo.find_by_slug(slug, None, session)

                if is_exist:
                    raise AppException(400, "Category already exist, please use different name")
                
                new_payload = {
                    **payload,
                    "slug": slug,
                    "createdBy": PydanticObjectId(createdBy)
                }

                team_category = await self.repo.create(new_payload, session)

                if not team_category:
                    raise AppException(400, "Team category creation failed")
                
                return team_category.model_dump(mode="json")



            except AppException:
                raise

            except Exception as e:
                raise AppException(status_code=500, message="internal server error")


    async def get_all(self, filters: Dict[str, Any] = {}):
        try:
            
            page:int = 1
            limit: int = 10
            if "page" in filters:
                page:int = int(filters["page"])

            if "limit" in filters:
                limit:int = int(filters["limit"])

            query: Dict[str, Any] = {}

            if "name" in filters:
                query.update({"name": filters["name"]})

            if "slug" in filters:
                query.update({"slug": filters["slug"]})
          
            result = await self.repo.get_all(page, limit, query, ["createdBy"])

            if not result:
                raise AppException(404, "Team categories data not found")
            
            return jsonable_encoder(result)

        except AppException:
            raise 

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")


    async def get_all_without_pagination(self, filters: Optional[Dict[str, Any]] = {}):
        try:
            query = {}

            print("filters: ", filters)


            if "name" in filters:
                query.update({"name": filters["name"]})


            if "slug" in filters:
                query.update({"slug": filters["slug"]})

            result = await self.repo.get_all_without_pagination(query)

            if not result:
                raise AppException(404, "Team category not found")
            

            return jsonable_encoder(result)



        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def delete(self, id: str)->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find_by_id(id=PydanticObjectId(id), session=session)

                    if not is_exist:
                        raise AppException(404, "Category not found")
                    
                    used_in = await self.team_repo.find_by_category(categoryId=PydanticObjectId(id), session=session)

                    if used_in:
                        raise AppException(400, f"Not deleted,category used in '{used_in.name}' team, so delete this team first")
                    
                    
                    is_delete = await self.repo.delete_by_id(id=PydanticObjectId(id), session=session)

                    if not is_delete:
                        raise AppException(400, f"Category not deleted {id}")
                    
                    return True


                except Exception:
                    raise

                except Exception as e:
                    raise AppException(status_code=500, message="internal server error")

        