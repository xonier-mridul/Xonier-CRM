
from fastapi import APIRouter, Depends, Request, HTTPException
from app.core.dependencies import Dependencies
from app.controllers.communication.email_controller import EmailController
from app.schemas.communication.email_schema import (
    SendEmailSchema,
    SendBulkEmailSchema,
    ResendEmailSchema,
    UpdateEmailSchema,
    BulkDeleteEmailSchema,
)

router = APIRouter(prefix="/api/email")
controller = EmailController()
dependencies = Dependencies()


@router.post(
    "/send",
    status_code=201,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:send"]))
    ]
)
async def send_email(request: Request, payload: SendEmailSchema):
    return await controller.send_email(
        request=request,
        payload=payload.model_dump()
    )


@router.post(
    "/send/bulk",
    status_code=201,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:send"]))
    ]
)
async def send_bulk_email(request: Request, payload: SendBulkEmailSchema):
    return await controller.send_bulk_email(
        request=request,
        payload=payload.model_dump()
    )


@router.get(
    "/all",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:read"]))
    ]
)
async def get_all_emails(request: Request):
    return await controller.get_all(request=request)


@router.get(
    "/get/{id}",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:read"]))
    ]
)
async def get_email_by_id(request: Request, id: str):
    return await controller.get_by_id(request=request, id=id)


@router.post(
    "/resend/{id}",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:send"]))
    ]
)
async def resend_email(request: Request, id: str, payload: ResendEmailSchema):
    return await controller.resend_email(
        request=request,
        id=id,
        payload=payload.model_dump(exclude_none=True)
    )


@router.patch(
    "/update/{id}",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:update"]))
    ]
)
async def update_email(request: Request, id: str, payload: UpdateEmailSchema):
    if not payload.has_updates():
        raise HTTPException(status_code=400, detail="No fields to update")
    return await controller.update(
        request=request,
        id=id,
        payload=payload.model_dump(exclude_none=True)
    )


@router.delete(
    "/delete/{id}",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:delete"]))
    ]
)
async def delete_email(request: Request, id: str):
    return await controller.delete(request=request, id=id)


@router.delete(
    "/bulk-delete",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["email:delete"]))
    ]
)
async def bulk_delete_emails(request: Request, payload: BulkDeleteEmailSchema):
    return await controller.bulk_delete(
        request=request,
        payload=payload.model_dump()
    )