
from app.repositories.task_report_repository import TaskReportRepository
from app.utils.get_team_members import GetTeamMembers
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone, date
from typing import Dict, Any
from bson import ObjectId
from app.core.enums import TASK_ITEM_STATUS, TASK_REPORT_STATUS, TIMELOG_STATUS
from app.repositories.task_timelog_repository import TaskTimeLogRepository
from app.db.models.task_timelog_model import TaskTimeLogModel


class TaskReportService:
    def __init__(self):
        self.repo = TaskReportRepository()
        self.client = Client
        self.getTeamMembers = GetTeamMembers()
        self.timelogRepo = TaskTimeLogRepository()

    async def _get_report_or_raise(self, report_id: str, session=None):
        if not ObjectId.is_valid(report_id):
            raise AppException(400, "Invalid report id")

        report = await self.repo.find_by_id(
            id=PydanticObjectId(report_id),
            populate=["createdBy"],
            session=session
        )

        if not report or report.deletedAt is not None:
            raise AppException(404, "Task report not found")

        return report

    def _get_report_user_id(self, report) -> str:
        try:
            return str(report.user.ref.id)
        except AttributeError:
            return str(report.user.id)

    async def _resolve_access(self, user: Dict[str, Any]) -> Dict[str, Any]:
        is_admin = validate_admin(user["userRole"])
        is_manager = await self.getTeamMembers.validate_manager(str(user["_id"]))

        member_ids = []
        if is_manager:
            members = await self.getTeamMembers.get_team_members(str(user["_id"]))
            member_ids = [str(m) for m in members]

        return {
            "is_admin": is_admin,
            "is_manager": is_manager,
            "member_ids": member_ids,
        }

    async def _check_read_access(self, report, user: Dict[str, Any]):
        access = await self._resolve_access(user)

        if access["is_admin"]:
            return

        report_user_id = self._get_report_user_id(report)

        if access["is_manager"]:
            if report_user_id == str(user["_id"]) or report_user_id in access["member_ids"]:
                return
            raise AppException(403, "You are not authorized to view this report")

        if report_user_id != str(user["_id"]):
            raise AppException(403, "You are not authorized to view this report")

    async def _check_write_access(self, report, user: Dict[str, Any]):
        access = await self._resolve_access(user)

        if access["is_admin"]:
            return

        report_user_id = self._get_report_user_id(report)

        if access["is_manager"]:
            if report_user_id == str(user["_id"]) or report_user_id in access["member_ids"]:
                return
            raise AppException(403, "You are not authorized to modify this report")

        if report_user_id != str(user["_id"]):
            raise AppException(403, "You are not authorized to modify this report")

    def _build_access_query(self, user: Dict[str, Any], access: Dict[str, Any]) -> Dict[str, Any]:
        if access["is_admin"]:
            return {}

        user_oid = ObjectId(user["_id"])

        if access["is_manager"]:
            allowed_ids = [ObjectId(mid) for mid in access["member_ids"]]
            allowed_ids.append(user_oid)
            return {"user.$id": {"$in": allowed_ids}}

        return {"user.$id": user_oid}

    
    async def submit_morning_agenda(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    today = date.today()

                    existing = await self.repo.find_one({
                        "user.$id": ObjectId(user["_id"]),
                        "reportDate": today,
                        "deletedAt": None
                    })

                    if existing:
                        if existing.morningAgenda.isSubmitted:
                            raise AppException(409, "Morning agenda already submitted for today")

                        morning_data = payload.get("morningAgenda", {})
                        morning_data["isSubmitted"] = True
                        morning_data["submittedAt"] = datetime.now(timezone.utc)

                        await self.repo.update(
                            id=PydanticObjectId(str(existing.id)),
                            data={
                                "morningAgenda": morning_data,
                                "updatedBy": PydanticObjectId(user["_id"]),
                            },
                            session=session
                        )

                        return jsonable_encoder(await self._get_report_or_raise(str(existing.id)))

                    morning_data = payload.get("morningAgenda", {})
                    morning_data["isSubmitted"] = True
                    morning_data["submittedAt"] = datetime.now(timezone.utc)

                    new_payload = {
                        "reportDate": today,
                        "user": PydanticObjectId(user["_id"]),
                        "createdBy": PydanticObjectId(user["_id"]),
                        "morningAgenda": morning_data,
                        "status": TASK_REPORT_STATUS.EVENING_PENDING.value
                    }

                    result = await self.repo.create(data=new_payload, session=session)

                    if not result:
                        raise AppException(400, "Failed to create task report")

                    return jsonable_encoder(result)

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def update_morning_agenda(self, report_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    report = await self._get_report_or_raise(report_id, session)
                    await self._check_write_access(report, user)

                    if report.morningAgenda.isSubmitted:
                        submitted_at = report.morningAgenda.submittedAt

                        # if submitted_at is None:
                        #     raise AppException(400, "Cannot update morning agenda: submission timestamp is missing")

                        
                        if submitted_at.tzinfo is None:
                            submitted_at = submitted_at.replace(tzinfo=timezone.utc)

                        now = datetime.now(timezone.utc)
                        elapsed = now - submitted_at
                        hours_elapsed = elapsed.total_seconds() / 3600

                        if hours_elapsed > 3:
                            raise AppException(
                                400,
                                f"Morning agenda can only be updated within 3 hours of submission. "
                                f"Submission window closed {hours_elapsed - 3:.1f} hour(s) ago."
                            )

                    morning_data = payload.get("morningAgenda", {})

                    await self.repo.update(
                        id=PydanticObjectId(report_id),
                        data={
                            "morningAgenda": {
                                **report.morningAgenda.model_dump(),
                                **morning_data,
                            },
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )

                    return jsonable_encoder(await self._get_report_or_raise(report_id))

                except AppException as e:
                    raise e
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    # async def submit_evening_report(self, report_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
    #     async with await self.client.start_session() as session:
    #         async with session.start_transaction():
    #             try:
    #                 report = await self._get_report_or_raise(report_id, session)
    #                 await self._check_write_access(report, user)

    #                 if not report.morningAgenda.isSubmitted:
    #                     raise AppException(400, "Please submit morning agenda first")

    #                 if report.eveningReport.isSubmitted:
    #                     raise AppException(400, "Evening report already submitted")
                    
    #                 if str(report.createdBy.id).strip() != str(user["_id"]):
    #                     raise AppException(403, "Only creator can submit task report")

    #                 evening_data = payload.get("eveningReport", {})
    #                 evening_data["isSubmitted"] = True
    #                 evening_data["submittedAt"] = datetime.now(timezone.utc)

    #                 await self.repo.update(
    #                     id=PydanticObjectId(report_id),
    #                     data={
    #                         "eveningReport": evening_data,
    #                         "updatedBy": PydanticObjectId(user["_id"]),
    #                         "status": TASK_REPORT_STATUS.SUBMITTED.value
    #                     },
    #                     session=session
    #                 )

    #                 timelogs = await self.timelogRepo.find_active_by_user(userId=user["_id"], populate=["createdBy"])


    #                 timelogs = jsonable_encoder(timelogs)

    #                 if len(timelogs)>1:
    #                     raise AppException(400, "Please stop first your task timer")
                    
    #                 prev_id = timelogs[0]["id"]

    #                 currentLog = await self.timelogRepo.find_by_id(id=ObjectId(prev_id))

    #                 currentLog = currentLog.model_dump(mode="json")

    #                 currentLog["segment"]


                    
    #                 # payload = {
    #                 #     "status": TIMELOG_STATUS.PAUSED.value, "segments": ""
    #                 # }
                    
    #                 # update = await self.timelogRepo.update(id=PydanticObjectId(timelogs[0]["id"]),data=)

    #                 return jsonable_encoder(await self._get_report_or_raise(report_id))

    #             except AppException:
    #                 raise
    #             except Exception as e:
    #                 raise AppException(500, f"Internal server error: {e}")
                

    async def submit_evening_report(self, report_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    report = await self._get_report_or_raise(report_id, session)
                    await self._check_write_access(report, user)
 
                    if not report.morningAgenda.isSubmitted:
                        raise AppException(400, "Please submit morning agenda first")
 
                    if report.eveningReport.isSubmitted:
                        raise AppException(400, "Evening report already submitted")
 
                    if str(report.createdBy.id).strip() != str(user["_id"]):
                        raise AppException(403, "Only creator can submit task report")
 
                    
                    active_logs = await self.timelogRepo.find_active_by_user(
                        userId=str(user["_id"])
                    )
 
                    if active_logs and len(active_logs) > 1:
                        
                        raise AppException(
                            400,
                            f"You have {len(active_logs)} active task timers running. "
                            "Please stop all timers manually before submitting your evening report."
                        )
 
                    if active_logs and len(active_logs) == 1:
                       
                        log: TaskTimeLogModel = active_logs[0]
                        now = datetime.now(timezone.utc)
 
                        if log.segments:
                            last = log.segments[-1]
                            if last.pausedAt is None:
                                last.pausedAt = now
                                started_at = last.startedAt
                                if started_at.tzinfo is None:
                                    started_at = started_at.replace(tzinfo=timezone.utc)
                                last.durationSeconds = int((now - started_at).total_seconds())
 
                        log.status = TIMELOG_STATUS.STOPPED
                        log.stoppedAt = now
                        log.totalSeconds = sum(s.durationSeconds for s in log.segments)
                        log.note = "Auto-stopped on evening report submission"
 
                        await log.save()
 
                    
                    evening_data = payload.get("eveningReport", {})
                    evening_data["isSubmitted"] = True
                    evening_data["submittedAt"] = datetime.now(timezone.utc)
 
                    await self.repo.update(
                        id=PydanticObjectId(report_id),
                        data={
                            "eveningReport": evening_data,
                            "updatedBy": PydanticObjectId(user["_id"]),
                            "status": TASK_REPORT_STATUS.COMPLETED_PENDING_REVIEW.value
                        },
                        session=session
                    )
 
                    return jsonable_encoder(await self._get_report_or_raise(report_id))
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 

    async def update_evening_report(self, report_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    report = await self._get_report_or_raise(report_id, session)
                    await self._check_write_access(report, user)

                    if not report.morningAgenda.isSubmitted:
                        raise AppException(400, "Please submit morning agenda first")

                    if report.eveningReport.isSubmitted:
                        raise AppException(400, "Cannot update evening report after submission")

                    evening_data = payload.get("eveningReport", {})

                    await self.repo.update(
                        id=PydanticObjectId(report_id),
                        data={
                            "eveningReport": {
                                **report.eveningReport.model_dump(),
                                **evening_data,
                            },
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )

                    return jsonable_encoder(await self._get_report_or_raise(report_id))

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def review_task_report(self, report_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    report = await self._get_report_or_raise(report_id, session)
                    access = await self._resolve_access(user)

                    if not access["is_admin"] and not access["is_manager"]:
                        raise AppException(403, "Only managers or admins can review reports")

                    if access["is_manager"] and not access["is_admin"]:
                        report_user_id = self._get_report_user_id(report)
                        if report_user_id not in access["member_ids"] and report_user_id != str(user["_id"]):
                            raise AppException(403, "You can only review your team members reports")

                    if not report.eveningReport.isSubmitted:
                        raise AppException(400, "Cannot review an incomplete report")

                    if report.isReviewed:
                        raise AppException(400, "Report already reviewed")

                    await self.repo.update(
                        id=PydanticObjectId(report_id),
                        data={
                            "managerComment": payload.get("managerComment"),
                            "isReviewed": True,
                            "managerReviewedAt": datetime.now(timezone.utc),
                            "reviewedBy": PydanticObjectId(user["_id"]),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )

                    

                    return jsonable_encoder(await self._get_report_or_raise(report_id))

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def get_all_reports(self, user: Dict[str, Any], filters: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))

            access = await self._resolve_access(user)
            query: Dict[str, Any] = {"deletedAt": None}
            query.update(self._build_access_query(user, access))

            if "userId" in filters:
                if not ObjectId.is_valid(filters["userId"]):
                    raise AppException(400, "Invalid userId")

                requested_uid = str(filters["userId"])

                if access["is_admin"]:
                    query["user.$id"] = ObjectId(requested_uid)
                elif access["is_manager"]:
                    if requested_uid not in access["member_ids"] and requested_uid != str(user["_id"]):
                        raise AppException(403, "You can only filter reports of your team members")
                    query["user.$id"] = ObjectId(requested_uid)
                else:
                    if requested_uid != str(user["_id"]):
                        raise AppException(403, "You can only view your own reports")
                    query["user.$id"] = ObjectId(requested_uid)

            if "status" in filters:
                query["status"] = filters["status"]

            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        date_filter["$gte"] = date.fromisoformat(filters["fromDate"])
                    except ValueError:
                        raise AppException(400, "Invalid fromDate format. Use YYYY-MM-DD")
                if "toDate" in filters:
                    try:
                        date_filter["$lte"] = date.fromisoformat(filters["toDate"])
                    except ValueError:
                        raise AppException(400, "Invalid toDate format. Use YYYY-MM-DD")
                query["reportDate"] = date_filter

            if "search" in filters and filters["search"].strip():
                query["$or"] = [
                    {"morningAgenda.goals": {"$regex": filters["search"].strip(), "$options": "i"}},
                    {"eveningReport.achievements": {"$regex": filters["search"].strip(), "$options": "i"}},
                    
                ]

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["user", "createdBy", "updatedBy", "reviewedBy"],
                sort=["-reportDate"]
            )

            if not result:
                raise AppException(404, "No reports found")

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_my_reports(self, user: Dict[str, Any], filters: Dict[str, Any]):
        filters["userId"] = str(user["_id"])
        return await self.get_all_reports(user, filters)

    async def get_report_by_id(self, report_id: str, user: Dict[str, Any]):
        try:
            report = await self._get_report_or_raise(report_id)
            await self._check_read_access(report, user)
            return jsonable_encoder(report)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        


    async def get_reports_by_user_ids(self, user: Dict[str, Any], filters: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))

            raw_ids = filters.get("userIds", "")
            user_ids = [uid.strip() for uid in raw_ids.split(",") if uid.strip()]

            if not user_ids:
                raise AppException(400, "At least one user id is required")

            if len(user_ids) > 50:
                raise AppException(400, "Cannot query more than 50 users at once")

            for uid in user_ids:
               
                if not ObjectId.is_valid(uid):
                    raise AppException(400, f"Invalid user id: {uid}")

            access = await self._resolve_access(user)

            if not access["is_admin"]:
                if access["is_manager"]:
                    allowed_ids = set(access["member_ids"] + [str(user["_id"])])
                    unauthorized = [uid for uid in user_ids if uid not in allowed_ids]
                    if unauthorized:
                        raise AppException(
                            403,
                            f"You are not authorized to view reports for users: {', '.join(unauthorized)}"
                        )
                else:
                    unauthorized = [uid for uid in user_ids if uid != str(user["_id"])]
                    if unauthorized:
                        raise AppException(403, "You can only view your own reports")

            query: Dict[str, Any] = {
                "deletedAt": None,
                "user.$id": {"$in": [ObjectId(uid) for uid in user_ids]}
            }

            if "status" in filters and filters["status"]:
                query["status"] = filters["status"]

            if filters.get("fromDate") or filters.get("toDate"):
                date_filter = {}
                if filters.get("fromDate"):
                    try:
                        date_filter["$gte"] = date.fromisoformat(filters["fromDate"])
                    except ValueError:
                        raise AppException(400, "Invalid fromDate format. Use YYYY-MM-DD")
                if filters.get("toDate"):
                    try:
                        date_filter["$lte"] = date.fromisoformat(filters["toDate"])
                    except ValueError:
                        raise AppException(400, "Invalid toDate format. Use YYYY-MM-DD")
                query["reportDate"] = date_filter

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["user", "createdBy", "updatedBy", "reviewedBy"],
                sort=["-reportDate"]
            )

            if not result or not result.get("data"):
                raise AppException(404, "No reports found for given users")

            grouped: Dict[str, Any] = {}
            for report in result["data"]:
                try:
                    report_uid = str(report["user"]["id"])
                except (KeyError, TypeError):
                    report_uid = str(report.get("user", "unknown"))

                if report_uid not in grouped:
                    grouped[report_uid] = {
                        "userId": report_uid,
                        "user": report.get("user"),
                        "reports": []
                    }
                grouped[report_uid]["reports"].append(report)

            return {
                "data": list(grouped.values()),
                "page": result["page"],
                "totalPages": result["totalPages"],
                "limit": result["limit"],
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def delete_task_report(self, report_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    report = await self._get_report_or_raise(report_id, session)
                    await self._check_write_access(report, user)

                    if report.isReviewed:
                        raise AppException(400, "Cannot delete a reviewed report")

                    await self.repo.update(
                        id=PydanticObjectId(report_id),
                        data={
                            "deletedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )

                    return {"deleted": True}

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")