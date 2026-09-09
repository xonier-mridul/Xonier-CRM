# app/routers/company_router.py
from fastapi import APIRouter, Depends, Request, Query
from typing import Optional
from app.schemas.company_schema import (
    CompanyCreateSchema,
    CompanySelfRegisterSchema,
    CompanyUpdateSchema,
    CompanyFilterSchema,
    VerifyCompanyOtpSchema,
    ResendOtpSchema,
    CompanyUserFilterSchema,
)
from app.core.enums import COMPANY_STATUS, COUNTRY_CODE, NUMBER_OF_EMPLOYEES
from app.core.dependencies import Dependencies
from app.controllers.company_controller import CompanyController

router = APIRouter()
dependencies = Dependencies()
controller = CompanyController()

admin_only = [
    Depends(dependencies.authorized),
    Depends(dependencies.onlyForAdmin),
    Depends(dependencies.company_context),
]

authorized = [
    Depends(dependencies.authorized),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
]
public = []


@router.post("/register", status_code=201, dependencies=public)
async def self_register(request: Request, payload: CompanySelfRegisterSchema):
    return await controller.self_register(request=request, payload=payload)


@router.post("/verify-otp", dependencies=public)
async def verify_otp(request: Request, payload: VerifyCompanyOtpSchema):
    return await controller.verify_otp(request=request, payload=payload)


@router.post("/resend-otp", dependencies=public)
async def resend_otp(request: Request, payload: ResendOtpSchema):
    return await controller.resend_otp(request=request, payload=payload)


@router.post("/", status_code=201, dependencies=admin_only)
async def create(request: Request, payload: CompanyCreateSchema):
    return await controller.create(request=request, payload=payload)


@router.get("/stats", dependencies=admin_only)
async def get_stats(request: Request):
    return await controller.get_stats(request=request)


@router.get("/", dependencies=admin_only)
async def get_all(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[COMPANY_STATUS] = Query(None),
    country: Optional[COUNTRY_CODE] = Query(None),
    companySize: Optional[NUMBER_OF_EMPLOYEES] = Query(None),
):
    filters = CompanyFilterSchema(
        page=page,
        limit=limit,
        search=search,
        status=status,
        country=country,
        companySize=companySize,
    )
    return await controller.get_all(request=request, filters=filters)


@router.get(
    "/{company_id}/users",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["company_user:read"])),
        Depends( dependencies.company_active),
        Depends(dependencies.company_context),
    ],
)
async def get_all_companies_users(
    request: Request,
    company_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[COMPANY_STATUS] = Query(None),
):
    filters = CompanyUserFilterSchema(
        page=page, limit=limit, search=search, status=status
    )

    return await controller.get_all_companies_users(
        request=request, companyId=company_id, filters=filters
    )


@router.get("/deleted", dependencies=admin_only)
async def get_all_deleted(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[COMPANY_STATUS] = Query(None),
    country: Optional[COUNTRY_CODE] = Query(None),
    companySize: Optional[NUMBER_OF_EMPLOYEES] = Query(None),
):
    filters = CompanyFilterSchema(
        page=page,
        limit=limit,
        search=search,
        status=status,
        country=country,
        companySize=companySize,
    )
    return await controller.get_all_deleted(request=request, filters=filters)


@router.get("/{company_id}", dependencies=authorized)
async def get_by_id(request: Request, company_id: str):
    return await controller.get_by_id(request=request, company_id=company_id)


@router.get("/{company_id}/deleted", dependencies=admin_only)
async def get_by_id(request: Request, company_id: str):
    return await controller.get_by_id_deleted(request=request, company_id=company_id)


@router.patch("/{company_id}", dependencies=authorized)
async def update(request: Request, company_id: str, payload: CompanyUpdateSchema):
    return await controller.update(
        request=request, company_id=company_id, payload=payload
    )


@router.patch("/{company_id}/status", dependencies=admin_only)
async def update_status(
    request: Request,
    company_id: str,
    status: COMPANY_STATUS = Query(...),
):
    return await controller.update_status(
        request=request, company_id=company_id, status=status
    )


@router.delete("/{company_id}", dependencies=admin_only)
async def soft_delete(request: Request, company_id: str):
    return await controller.soft_delete(request=request, company_id=company_id)


@router.patch("/{company_id}/restore", dependencies=admin_only)
async def restore(request: Request, company_id: str):
    return await controller.restore(request=request, company_id=company_id)
