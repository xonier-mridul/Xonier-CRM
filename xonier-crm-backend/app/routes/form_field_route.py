from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.form_field_controller import FormFieldController

router = APIRouter()
dependencies = Dependencies()
controller = FormFieldController()


@router.get("/get-all", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_form_fields(request: Request):
    return await controller.get_all(request)

@router.get("/lead/all", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_lead_form_fields(request: Request):
    return await controller.get_leads_fields(request)

@router.get("/deal/all", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_lead_form_fields(request: Request):
    return await controller.get_deals_fields(request=request)