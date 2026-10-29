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
  CompanyStats,
  Company,
  CompanyUpdatePayload,
  MessageResponse,
} from "../types/company/company.types";

import { COMPANY_STATUS } from "../constants/enum";
import { CompanySetting, CompanySettingUpdatePayload } from "../types/companySetting/company.types";

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

   getCompanyDetails: async (): Promise<CompanySetting> => {
    const response = await api.get("/companies/me/settings");
    return response.data.data;
  },

  updateCompanySettings: async (data: CompanySettingUpdatePayload): Promise<CompanySetting> => {
    const response = await api.patch("/companies/me/settings", data);
    return response.data.data;
  },

  uploadCompanyLogo: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/companies/me/logo", formData);
    return response.data.data.logoFileId;
  },

  getCompanyLogo: async (): Promise<Blob> => {
    const response = await api.get("/companies/me/logo", { responseType: "blob" });
    return response.data;
  }
  
};

export default CompanyService;
