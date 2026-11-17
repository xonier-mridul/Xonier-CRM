import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.services.revenue_forecast_service import revenue_forecast
from app.utils.custom_exception import AppException

deps = Dependencies()
router = APIRouter(dependencies=[Depends(deps.authorized), Depends(deps.company_active),
                             Depends(deps.company_context), Depends(deps.feature_access(FEATURE.CRM)),
                             Depends(deps.permissions(["deal:read"]))])


@router.get("")
async def report(request: Request, fromMonth: str = Query(""), toMonth: str = Query("")):
    current = datetime.now(timezone.utc)
    first = fromMonth or f"{current.year:04d}-{current.month:02d}"
    last = toMonth or f"{current.year + (current.month + 10) // 12:04d}-{(current.month + 10) % 12 + 1:02d}"
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", first) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", last):
        raise AppException(422, "Use YYYY-MM for forecast months")
    start_index = int(first[:4]) * 12 + int(first[5:])
    end_index = int(last[:4]) * 12 + int(last[5:])
    if end_index < start_index or end_index - start_index > 35:
        raise AppException(422, "Select a range of 1 to 36 months")
    return {"data": {"fromMonth": first, "toMonth": last,
                     **await revenue_forecast(request.state.user, first, last)}}
