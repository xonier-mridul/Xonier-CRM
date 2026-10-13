from app.utils.custom_exception import AppException
from beanie import PydanticObjectId
from typing import Dict, Any, Optional
from pymongo.errors import DuplicateKeyError

from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.repositories.activity_repository import ActivityRepository
from app.utils.slug_generator import generate_slug
from fastapi.encoders import jsonable_encoder
from app.db.db import Client
from app.core.constants import MANGER_CODE
from app.core.enums import ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION
from bson import DBRef, ObjectId


class TeamService:
    def __init__(self):
        self.repo = TeamRepository()
        self.userRepo = UserRepository()
        self.activityRepo = ActivityRepository()
        self.client = Client

    async def get_all(self, page: int = 1, limit: int = 10, filters: Dict[str, Any] = {}):
        try:
            query = {}

            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"], "$options": "i"}

                query.update({"$or": [
                    {"name": regex_data},
                    {"slug": regex_data}
                ]})

            if "name" in filters:
                query.update({"name": filters["name"]})

            if "slug" in filters:
                query.update({"slug": filters["slug"]})

            if "active" in filters:
                query.update({"isActive": filters["active"]})

            result = await self.repo.get_all(page, limit, query, ["members", "category", "createdBy", "manager"], None, ["-createdAt"])

            if not result:
                raise AppException(400, "Failed to fetch teams data")

            return jsonable_encoder(result)

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def create(
        self,
        payload: Dict[str, Any],
        createdBy: PydanticObjectId,
        ipAddress: Optional[str] = None,
        userAgent: Optional[str] = None,
    ):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    slug = generate_slug(payload["name"])

                    is_exist = await self.repo.find_by_slug(slug, None, session)

                    if is_exist:
                        raise AppException(400, "team exist, please use different name")

                    new_payload: Dict[str, Any] = {
                        **payload,
                        "slug": slug,
                        "createdBy": createdBy
                    }

                    rr = any(item in payload["members"] for item in payload["manager"])

                    if rr:
                        raise AppException(400, "Manager user also selected in members list, please remove it")

                    team = await self.repo.create(new_payload, session)

                    if not team:
                        raise AppException(400, "Team creation failed")

                    # ✅ log team activity
                    await self.activityRepo.create({
                        "userId": createdBy,
                        "entityType": ACTIVITY_ENTITY_TYPE.TEAM,
                        "entityId": team.id,
                        "action": ACTIVITY_ACTION.CREATED,
                        "title": f"Team '{team.name}' created",
                        "description": (
                            f"Team '{team.name}' was created with "
                            f"{len(payload.get('members', []))} member(s) and "
                            f"{len(payload.get('manager', []))} manager(s)."
                        ),
                        "metadata": {
                            "teamName": team.name,
                            "members": [str(m) for m in payload.get("members", [])],
                            "managers": [str(m) for m in payload.get("manager", [])],
                        },
                        "ipAddress": ipAddress,
                        "userAgent": userAgent,
                    }, session)

                    return jsonable_encoder(team)

                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")

    async def get_by_id(self, id: PydanticObjectId, activityPage: int = 1, activityLimit: int = 10):
        try:
            result = await self.repo.find_by_id(id, ["members", "category", "manager", "createdBy"])

            if not result:
                raise AppException(404, "Team not found")

            team_data = result.model_dump(mode="json")


            activity_result = await self.activityRepo.get_by_entity(
                entityType=ACTIVITY_ENTITY_TYPE.TEAM,
                entityId=id,
                page=activityPage,
                limit=activityLimit,
            )

            team_data["activity"] = jsonable_encoder(activity_result)

            return team_data

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def update(
        self,
        id: str,
        payload: Dict[str, Any],
        updatedBy: PydanticObjectId,
        ipAddress: Optional[str] = None,
        userAgent: Optional[str] = None,
    ) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find_by_id(id=PydanticObjectId(id), session=session)

                    if not is_exist:
                        raise AppException(404, "Team not found")

                    managers = payload.get("manager", [])
                    members = payload.get("members", [])

                    for manager_id in managers:
                        if not ObjectId.is_valid(manager_id):
                            raise AppException(400, f"Invalid manager ObjectId: {manager_id}")

                    for member_id in members:
                        if not ObjectId.is_valid(member_id):
                            raise AppException(400, f"Invalid member ObjectId: {member_id}")

                    rr = any(item in members for item in managers)

                    if rr:
                        raise AppException(400, "Manager user also selected in members list, please remove it")

                    # ---------- build diff for activity log ----------
                    old_member_ids = {str(m.ref.id) for m in (is_exist.members or [])}
                    old_manager_ids = {str(m.ref.id) for m in (is_exist.manager or [])}

                    members_provided = "members" in payload
                    managers_provided = "manager" in payload

                    new_member_ids = set(members) if members_provided else old_member_ids
                    new_manager_ids = set(managers) if managers_provided else old_manager_ids

                    added_members = list(new_member_ids - old_member_ids) if members_provided else []
                    removed_members = list(old_member_ids - new_member_ids) if members_provided else []
                    added_managers = list(new_manager_ids - old_manager_ids) if managers_provided else []
                    removed_managers = list(old_manager_ids - new_manager_ids) if managers_provided else []

                    field_changes = {}
                    for field in ["name", "description", "isActive"]:
                        if field in payload and getattr(is_exist, field, None) != payload[field]:
                            field_changes[field] = {
                                "old": getattr(is_exist, field, None),
                                "new": payload[field],
                            }
                    # ---------------------------------------------------

                    manager_dbrefs = [
                        DBRef(collection="users", id=ObjectId(manager_id))
                        for manager_id in managers
                    ]

                    member_dbrefs = [
                        DBRef(collection="users", id=ObjectId(member_id))
                        for member_id in members
                    ]

                    slug = generate_slug(payload["name"])

                    updated_payload = {
                        **payload,
                        "slug": slug,
                        "manager": manager_dbrefs,
                        "members": member_dbrefs,
                        "updatedBy": updatedBy,
                    }

                    update = await self.repo.update(id=PydanticObjectId(id), data=updated_payload, session=session)

                    if not update:
                        raise AppException(400, "Team not updated")

                    # ✅ log team activity
                    changes_summary = []
                    if field_changes:
                        changes_summary.append(f"Updated fields: {', '.join(field_changes.keys())}")
                    if added_members:
                        changes_summary.append(f"{len(added_members)} member(s) added")
                    if removed_members:
                        changes_summary.append(f"{len(removed_members)} member(s) removed")
                    if added_managers:
                        changes_summary.append(f"{len(added_managers)} manager(s) added")
                    if removed_managers:
                        changes_summary.append(f"{len(removed_managers)} manager(s) removed")

                    description = "; ".join(changes_summary) if changes_summary else "Team details updated"

                    await self.activityRepo.create({
                        "userId": updatedBy,
                        "entityType": ACTIVITY_ENTITY_TYPE.TEAM,
                        "entityId": is_exist.id,
                        "action": ACTIVITY_ACTION.UPDATED,
                        "title": f"Team '{payload.get('name', is_exist.name)}' updated",
                        "description": description,
                        "metadata": {
                            "fieldChanges": field_changes,
                            "addedMembers": added_members,
                            "removedMembers": removed_members,
                            "addedManagers": added_managers,
                            "removedManagers": removed_managers,
                        },
                        "ipAddress": ipAddress,
                        "userAgent": userAgent,
                    }, session)

                    return True

                except AppException:
                    raise

                except DuplicateKeyError:
                    raise AppException(
                        status_code=409,
                        message="Team with this name already exists"
                    )

                except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")

    async def delete(
        self,
        id: str,
        deletedBy: Optional[PydanticObjectId] = None,
        ipAddress: Optional[str] = None,
        userAgent: Optional[str] = None,
    ) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find_by_id(PydanticObjectId(id), session=session)

                    if not is_exist:
                        raise AppException(404, "Team not found related this id")

                    result = await self.repo.delete_by_id(PydanticObjectId(id), session=session)

                    if not result:
                        raise AppException(400, "Team deletion failed")

                    # ✅ log team activity
                    await self.activityRepo.create({
                        "userId": deletedBy,
                        "entityType": ACTIVITY_ENTITY_TYPE.TEAM,
                        "entityId": PydanticObjectId(id),
                        "action": ACTIVITY_ACTION.DELETE,
                        "title": f"Team '{is_exist.name}' deleted",
                        "description": f"Team '{is_exist.name}' was permanently deleted.",
                        "metadata": {"teamName": is_exist.name},
                        "ipAddress": ipAddress,
                        "userAgent": userAgent,
                    }, session)

                    return True

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")

    async def get_activity(self, teamId: PydanticObjectId, page: int = 1, limit: int = 10):
        try:
            team = await self.repo.find_by_id(teamId)

            if not team:
                raise AppException(404, "Team not found")

            result = await self.activityRepo.get_by_entity(
                entityType=ACTIVITY_ENTITY_TYPE.TEAM,
                entityId=teamId,
                page=page,
                limit=limit,
            )

            return jsonable_encoder(result)

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")