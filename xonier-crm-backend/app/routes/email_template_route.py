
from fastapi import APIRouter, Request, Depends
from app.controllers.email_template_controller import EmailTemplateController
from app.schemas.email_template_schema import (
    CreateEmailTemplateSchema,
    UpdateEmailTemplateSchema,
    BulkDeleteEmailTemplateSchema
)

from app.core.dependencies import Dependencies

router = APIRouter()

controller = EmailTemplateController()

dependencies = Dependencies()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:create"]))])
async def create_template(request: Request, payload: CreateEmailTemplateSchema):
    return await controller.create(
        request=request,
        payload=payload.model_dump()
    )


@router.get("/all",status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:read"]))])
async def get_all_templates(request: Request):
    return await controller.get_all(request=request)


@router.get("/get/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:read"]))])
async def get_template_by_id(request: Request, id: str):
    return await controller.get_by_id(request=request, id=id)


@router.patch("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:update"]))])
async def update_template(request: Request, id: str, payload: UpdateEmailTemplateSchema):
    if not payload.has_updates():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No fields to update")
    return await controller.update(
        request=request,
        id=id,
        payload=payload.model_dump(exclude_none=True)
    )


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:delete"]))])
async def soft_delete_template(request: Request, id: str):
    return await controller.soft_delete(request=request, id=id)


@router.post("/preview/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:read"]))])
async def render_preview(request: Request, id: str, payload: dict):
    return await controller.render_preview(
        request=request,
        id=id,
        payload=payload
    )



@router.delete("/bulk-delete", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["emailTemplate:delete"]))])
async def bulk_delete_templates(request: Request, payload: BulkDeleteEmailTemplateSchema):
    return await controller.bulk_delete(
        request=request,
        payload=payload.model_dump()
    )