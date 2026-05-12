import api from "../lib/axios";
import {
  ApiResponse,
  SelfRegisterResponse,
  CompanySelfRegisterPayload,
  VerifyOtpPayload,
  VerifyOtpResponse,
  ResendOtpPayload,
  ResendOtpResponse,
  CompanyCreatePayload,
  CreateCompanyResponse,
  CompanyFilterParams,
  PaginatedCompanies,
  CompanyStats,
  Company,
  CompanyUpdatePayload,
  MessageResponse,
} from "../types/company/company.types";

import { COMPANY_STATUS } from "../constants/enum";

const CompanyService = {
  selfRegister: (
    payload: CompanySelfRegisterPayload,
  ): Promise<ApiResponse<SelfRegisterResponse>> =>
    api.post("/companies/register", payload),

  verifyOtp: (
    payload: VerifyOtpPayload,
  ): Promise<ApiResponse<VerifyOtpResponse>> =>
    api.post("/companies/verify-otp", payload),

  resendOtp: (
    payload: ResendOtpPayload,
  ): Promise<ApiResponse<ResendOtpResponse>> =>
    api.post("/companies/resend-otp", payload),

  create: (
    payload: CompanyCreatePayload,
  ): Promise<ApiResponse<CreateCompanyResponse>> =>
    api.post("/companies/", payload),

  getAll: (
    params?: CompanyFilterParams,
  ) =>
    api.get("/companies/", { params }),

  getStats: (): Promise<ApiResponse<CompanyStats>> =>
    api.get("/companies/stats"),

  getById: (companyId: string) =>
    api.get(`/companies/${companyId}`),

  update: (
    companyId: string,
    payload: CompanyUpdatePayload,
  ): Promise<ApiResponse<Company>> =>
    api.patch(`/companies/${companyId}`, payload),

  updateStatus: (
    companyId: string,
    status: COMPANY_STATUS,
  ): Promise<ApiResponse<MessageResponse>> =>
    api.patch(`/companies/${companyId}/status`, null, { params: { status } }),

  softDelete: (companyId: string): Promise<ApiResponse<MessageResponse>> =>
    api.delete(`/companies/${companyId}`),

  restore: (companyId: string): Promise<ApiResponse<MessageResponse>> =>
    api.patch(`/companies/${companyId}/restore`),
};

export default CompanyService;
