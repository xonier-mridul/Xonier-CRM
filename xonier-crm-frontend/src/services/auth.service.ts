
import { register } from "module";
import api from "../lib/axios";
import { VerifyLoginOtpPayload, ResendLoginOtpPayload, GetAllUsers, changePasswordPayload, RegisterPayload, UserUpdatePayload, UserStatusPayload, UserPasswordUpdatedByAdminPayload, AssignedPhoneNumber } from "../types";
import { ParamValue } from "next/dist/server/request/params";



export const AuthService = {

getAll: (data: GetAllUsers) => {
  const params = new URLSearchParams();

  params.append("page", String(data.page));
  params.append("limit", String(data.limit));

  if (data.firstName) params.append("firstName", data.firstName);
  if (data.lastName) params.append("lastName", data.lastName);
  if (data.search) params.append("search", data.search);

  return api.get(`/auth/all?${params.toString()}`);
},
    getAllActiveWithoutPagination: () => api.get("/auth/active/all-without-pagination"),
    getAllTeamUsers: (search?: string) => api.get(`/auth/by-team?${search ? `search=${search}` : ""}`),
    create: (payload: RegisterPayload) => api.post("/auth/register", payload),
    login: (data: { email: string, password: string }) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout", {}),
    verifyLoginOtp: (data: VerifyLoginOtpPayload) => api.post("/auth/verify-login-otp", data),
    resendOTP: (data: ResendLoginOtpPayload) => api.post("/auth/resend-login-otp", data),
    getUserById: (id: ParamValue) => api.get(`/auth/user/${id}`),
    me: () => api.get("/auth/me"),
    update: (id: ParamValue, payload: UserUpdatePayload) => api.put(`/auth/update/${id}`, payload),
    updateStatus: (id: ParamValue, statusPayload: UserStatusPayload) => api.patch(`/auth/update-status/${id}`, statusPayload),
    changePassword: (data: changePasswordPayload) => api.patch("/auth/reset-password", data),
    changePasswordByAdmin: (id: ParamValue, data: UserPasswordUpdatedByAdminPayload) => api.patch(`auth/reset-user-password/${id}`, data),
    softDelete: (id: ParamValue) => api.patch(`/auth/user/${id}/soft-delete`, {}),
    assignNumber: (id: string, payload: AssignedPhoneNumber) => api.patch(`/auth/assign-phone-number/${id}`, payload),
    clearNumber: (id: string) => api.patch(`/auth/clear-phone-number/${id}`, {}),
    deletedUser: (filter: { page: number, limit: number, search: string }) => api.get(`/auth/all-deleted?page=${filter.page}&limit=${filter.limit}&search=${filter.search}`),
    permanentDelete: (id: string) => api.delete(`/auth/permanent-delete/${id}`),
    bulkPermanentDelete: (payload: { userIds: string[] }) =>
        api.delete(`/auth/bulk-permanent-delete`, {
            data:{userIds: payload.userIds,}
        }),
    restore: (id: string) => api.patch(`/auth/restore/${id}`, {}),
    bulkRestore: (payload: { userIds: string[] }) =>
        api.patch(`/auth/bulk-restore`, {
            userIds:payload.userIds,
        }),

    refreshAccessToken: ()=> api.post("/auth/refresh")

}


