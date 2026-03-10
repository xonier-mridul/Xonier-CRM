from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies


router = APIRouter()

dependencies = Dependencies()


# @router.post('/sms/send', status_code=200, dependencies=[Depends(dependencies.authorized)])
# async def send_sms(request: Request, )