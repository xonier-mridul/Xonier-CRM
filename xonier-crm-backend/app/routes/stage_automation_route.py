from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.services.stage_automation_service import company_id, rules_collection, save_rule, serialize
from app.utils.custom_exception import AppException

deps = Dependencies()
router = APIRouter(dependencies=[Depends(deps.authorized), Depends(deps.company_active),
                             Depends(deps.company_context), Depends(deps.feature_access(FEATURE.CRM))])


def require_manager(request: Request):
    roles = request.state.user.get("userRole", [])
    if not any(role.get("code") in {"MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN", "ADMIN"} for role in roles):
        raise AppException(403, "Only managers can configure stage automations")


class RuleInput(BaseModel):
    stageKey: str = Field(min_length=1, max_length=64)
    kind: Literal["call", "email", "meeting", "task", "whatsapp", "other"]
    title: str = Field(min_length=1, max_length=200)
    delayDays: int = Field(ge=1, le=365)
    enabled: bool = True

    @field_validator("title")
    @classmethod
    def nonempty_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Activity title is required")
        return value


@router.get("/rules")
async def list_rules(request: Request):
    require_manager(request)
    rows = await rules_collection().find({"companyId": company_id()}).sort("stageKey", 1).to_list(length=500)
    return {"data": [serialize(row) for row in rows]}


@router.post("/rules", status_code=201)
async def create_rule(request: Request, payload: RuleInput):
    require_manager(request)
    return {"data": {"id": await save_rule(payload.model_dump())}}


@router.put("/rules/{rule_id}")
async def update_rule(request: Request, rule_id: str, payload: RuleInput):
    require_manager(request)
    return {"data": {"id": await save_rule(payload.model_dump(), rule_id)}}


@router.delete("/rules/{rule_id}")
async def delete_rule(request: Request, rule_id: str):
    require_manager(request)
    result = await rules_collection().delete_one({"companyId": company_id(), "id": rule_id})
    if not result.deleted_count:
        raise AppException(404, "Automation rule not found")
    return {"data": True}
