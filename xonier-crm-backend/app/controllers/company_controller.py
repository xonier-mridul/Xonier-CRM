# app/controllers/company_controller.py
from fastapi import Request
from app.utils.custom_exception import AppException
from app.services.company_service import CompanyService
from app.utils.custom_response import successResponse
from app.schemas.company_schema import (
    CompanyCreateSchema,
    CompanySelfRegisterSchema,
    CompanyUpdateSchema,
    CompanyFilterSchema,
    VerifyCompanyOtpSchema,
    ResendOtpSchema,
)
from app.core.enums import COMPANY_STATUS


def _extract_meta(request: Request) -> tuple[str, str]:
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return ip, ua


class CompanyController:
    def __init__(self):
        self.service = CompanyService()

    async def create(self, request: Request, payload: CompanyCreateSchema):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.create(
                payload=payload, actor=request.state.user, ip_address=ip, user_agent=ua
            )
            return successResponse(201, "Company registered — verification OTP sent", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def self_register(self, request: Request, payload: CompanySelfRegisterSchema):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.self_register(
                payload=payload, ip_address=ip, user_agent=ua
            )
            return successResponse(201, "Registration successful — check your email for OTP", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def verify_otp(self, request: Request, payload: VerifyCompanyOtpSchema):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.verify_otp(
                payload=payload, ip_address=ip, user_agent=ua
            )
            return successResponse(200, "Email verified successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def resend_otp(self, request: Request, payload: ResendOtpSchema):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.resend_otp(
                payload=payload, ip_address=ip, user_agent=ua
            )
            return successResponse(200, "OTP resent successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_all(self, request: Request, filters: CompanyFilterSchema):
        try:
            result = await self.service.get_all(filters=filters, actor=request.state.user)
            return successResponse(200, "Companies fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def get_all_companies_users(self, request: Request, companyId:str, filters: CompanyFilterSchema):
        try:
            result = await self.service.get_all_companies_users(filters=filters, company_id=companyId, actor=request.state.user)
            return successResponse(200, "Companies Users fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def get_all_deleted(self, request: Request, filters: CompanyFilterSchema):
        try:
            result = await self.service.get_all_deleted(filters=filters, actor=request.state.user)
            return successResponse(200, "Deleted companies fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_by_id(self, request: Request, company_id: str):
        try:
            result = await self.service.get_by_id(company_id=company_id, actor=request.state.user)
            return successResponse(200, "Company fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

        
    async def get_by_id_deleted(self, request: Request, company_id: str):
        try:
            result = await self.service.get_by_id_deleted(company_id=company_id, actor=request.state.user)
            return successResponse(200, "Company fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update(self, request: Request, company_id: str, payload: CompanyUpdateSchema):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.update(
                company_id=company_id, payload=payload,
                actor=request.state.user, ip_address=ip, user_agent=ua,
            )
            return successResponse(200, "Company updated successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update_status(self, request: Request, company_id: str, status: COMPANY_STATUS):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.update_status(
                company_id=company_id, status=status,
                actor=request.state.user, ip_address=ip, user_agent=ua,
            )
            return successResponse(200, "Company status updated", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def soft_delete(self, request: Request, company_id: str):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.soft_delete(
                company_id=company_id, actor=request.state.user,
                ip_address=ip, user_agent=ua,
            )
            return successResponse(200, f"{result.get("message", "Company deleted successfully")}", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def restore(self, request: Request, company_id: str):
        try:
            ip, ua = _extract_meta(request)
            result = await self.service.restore(
                company_id=company_id, actor=request.state.user,
                ip_address=ip, user_agent=ua,
            )
            return successResponse(200, "Company restored successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_stats(self, request: Request):
        try:
            result = await self.service.get_stats(actor=request.state.user)
            return successResponse(200, "Stats fetched successfully", result)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")