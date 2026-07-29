import { register } from "module";
import api from "../lib/axios";
import {
  VerifyLoginOtpPayload,
  ResendLoginOtpPayload,
  GetAllUsers,
  changePasswordPayload,
  RegisterPayload,
  UserUpdatePayload,
  UserStatusPayload,
  UserPasswordUpdatedByAdminPayload,
  AssignedPhoneNumber,
  UserRatingParams,
  changePassword,
  AdminLogin,
  VerifyAdminLoginOtpPayload,
  ResendAdminLoginOtpPayload,
} from "../types";
import { ParamValue } from "next/dist/server/request/params";
import { verifyPasswordOtp } from "../app/(auth)/change-password/page";
import { verifyEmail } from "../app/(auth)/forgot-password/page";


export const AuthService = {
  getAll: (data: GetAllUsers) => {
    const params = new URLSearchParams();

    params.append("page", String(data.page));
    params.append("limit", String(data.limit));

    if (data.firstName) params.append("firstName", data.firstName);
    if (data.lastName) params.append("lastName", data.lastName);
    if (data.search) params.append("search", data.search);
    if (data.companyId) params.append("companyId", data.companyId);

    return api.get(`/auth/all?${params.toString()}`);
  },
  getAllActiveWithoutPagination: () =>
    api.get("/auth/active/all-without-pagination"),

  getAllTeamUsers: (data: { search?: string; page?: number }) =>
    api.get(
      `/auth/by-team?${data.search ? `search=${data.search}` : ""}${data.page ? `&page=${data.page}` : ""}`,
    ),

  emailVerify:(payload:verifyEmail)=>{
  return api.post('/auth/forgot-password',payload)},

  verifyChangePassword:(payload:verifyPasswordOtp)=>{
    return api.post('/auth/verify-forgot-pass-otp',payload)

  },

  adminLogin: (payload:AdminLogin)=> api.post("/auth/admin-login",payload),
   
  verifyAdminLoginOtp:(data:VerifyAdminLoginOtpPayload)=>
    api.post("/auth/verify-admin-login-otp",data),

 

  create: (payload: RegisterPayload) => api.post("/auth/register", payload),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: () => api.post("/auth/logout", {}),
  verifyLoginOtp: (data: VerifyLoginOtpPayload) =>
    api.post("/auth/verify-login-otp", data),
  resendAdminOTP: (data: ResendAdminLoginOtpPayload) =>
    api.post("/auth//resend-admin-login-otp", data),

  
  resendOTP: (data: ResendLoginOtpPayload) =>
    api.post("/auth/resend-login-otp", data),
  getUserById: (id: ParamValue) => api.get(`/auth/user/${id}`),
  me: () => api.get("/auth/me"),
  update: (id: ParamValue, payload: UserUpdatePayload) =>
    api.put(`/auth/update/${id}`, payload),
  updateStatus: (id: ParamValue, statusPayload: UserStatusPayload) =>
    api.patch(`/auth/update-status/${id}`, statusPayload),
  changePassword: (data: changePasswordPayload) =>
    api.patch("/auth/reset-password", data),
  changePasswordByAdmin: (
    id: ParamValue,
    data: UserPasswordUpdatedByAdminPayload,
  ) => api.patch(`auth/reset-user-password/${id}`, data),
  softDelete: (id: ParamValue) => api.patch(`/auth/user/${id}/soft-delete`, {}),
  assignNumber: (id: string, payload: AssignedPhoneNumber) =>
    api.patch(`/auth/assign-phone-number/${id}`, payload),
  clearNumber: (id: string) => api.patch(`/auth/clear-phone-number/${id}`, {}),
  deletedUser: (filter: { page: number; limit: number; search: string }) =>
    api.get(
      `/auth/all-deleted?page=${filter.page}&limit=${filter.limit}&search=${filter.search}`,
    ),

  // getDepartments:(search:string)=>{api.get(``)},
  permanentDelete: (id: string) => api.delete(`/auth/permanent-delete/${id}`),
  bulkPermanentDelete: (payload: { userIds: string[] }) =>
    api.delete(`/auth/bulk-permanent-delete`, {
      data: { userIds: payload.userIds },
    }),
  restore: (id: string) => api.patch(`/auth/restore/${id}`, {}),
  bulkRestore: (payload: { userIds: string[] }) =>
    api.patch(`/auth/bulk-restore`, {
      userIds: payload.userIds,
    }),

  refreshAccessToken: () => api.post("/auth/refresh"),
  // REPLACE your existing getUserRatingData with this

getUserRatingData: (id: ParamValue, params?: UserRatingParams) => {
  const queryParams = new URLSearchParams();

  queryParams.append("page", String(params?.page || 1));
  queryParams.append("limit", String(params?.limit || 20));
  queryParams.append("trendMonths", String(params?.trendMonths || 6));

  if (params?.dateFilter && params.dateFilter !== "all") {
    queryParams.append("dateFilter", params.dateFilter);
  }
  if (params?.dateFilter === "custom") {
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
  }
  if (params?.ratingFilter && params.ratingFilter !== "all") {
    queryParams.append("ratingFilter", params.ratingFilter);
  }
  if (params?.onTimeFilter && params.onTimeFilter !== "all") {
    queryParams.append("onTimeFilter", params.onTimeFilter);
  }

  return api.get(`/auth/task-data/${id}?${queryParams.toString()}`);
},
};
