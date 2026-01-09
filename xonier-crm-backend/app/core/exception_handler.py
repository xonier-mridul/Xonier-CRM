from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from app.utils.custom_response import ApiResponse
from app.utils.custom_exception import AppException


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            status_code=exc.status_code,
            message=exc.detail,
            data=None,
        ).model_dump(),
    )


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            status_code=exc.status_code,
            message=exc.message,
            data=None,
        ).model_dump(),
    )


