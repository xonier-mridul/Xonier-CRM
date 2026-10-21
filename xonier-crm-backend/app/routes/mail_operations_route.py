from fastapi import APIRouter, Depends, Request, Query
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from app.core.dependencies import Dependencies
from app.services.mail_operations import MailOperations
from app.utils.custom_response import successResponse

dependencies = Dependencies()
router = APIRouter(dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])


class Redrive(BaseModel):
    acknowledgePossibleDuplicate: bool = False


@router.get("")
async def overview():
    return successResponse(data=jsonable_encoder(await MailOperations().overview()))


@router.get("/jobs")
async def failed_jobs(state: str = Query("failed", pattern="^(failed|uncertain)$")):
    rows = await MailOperations().db.email_jobs.find({"state": state}, {
        "_id": 1, "state": 1, "kind": 1, "attempts": 1, "error": 1,
        "errorCode": 1, "errorCategory": 1, "createdAt": 1,
    }).sort("createdAt", -1).limit(100).to_list(100)
    return successResponse(data=jsonable_encoder(rows))


@router.post("/jobs/{job_id}/retry")
async def redrive(job_id: str, command: Redrive, request: Request):
    return successResponse(data=await MailOperations().redrive(job_id, request.state.user, command.acknowledgePossibleDuplicate),
                           message="Mail job queued for retry")
