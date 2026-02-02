
import { register } from "module";
import api from "../lib/axios";
import { VerifyLoginOtpPayload, ResendLoginOtpPayload , GetAllUsers, changePasswordPayload, RegisterPayload, UserUpdatePayload, UserStatusPayload, UserPasswordUpdatedByAdminPayload} from "../types";
import { ParamValue } from "next/dist/server/request/params";



export const AuthService = {
   
    getAll: (data:GetAllUsers) => api.get(`/auth/all?page=${data.page}&limit=${data.limit}&${data.firstName && `firstName=${data.firstName}`}&${data.lastName && `lastName=${data.lastName}`}`),
    getAllActiveWithoutPagination: ()=> api.get("/auth/active/all-without-pagination"),
    create: (payload: RegisterPayload)=> api.post("/auth/register", payload),
    login: (data:{email: string, password: string })=> api.post("/auth/login", data),
    logout: ()=> api.post("/auth/logout", {}),
    verifyLoginOtp: (data: VerifyLoginOtpPayload) => api.post("/auth/verify-login-otp", data),
    resendOTP: (data: ResendLoginOtpPayload)=> api.post("/auth/resend-login-otp", data),
    getUserById: (id: ParamValue)=> api.get(`/auth/user/${id}`),
    me:()=>api.get("/auth/me"),
    update:(id: ParamValue, payload: UserUpdatePayload)=> api.put(`/auth/update/${id}`, payload),
    updateStatus: (id: ParamValue, statusPayload: UserStatusPayload)=> api.patch(`/auth/update-status/${id}`, statusPayload),
    changePassword: (data: changePasswordPayload) => api.patch("/auth/reset-password", data),
    changePasswordByAdmin: (id: ParamValue, data: UserPasswordUpdatedByAdminPayload)=> api.patch(`auth/reset-user-password/${id}`,data),
    softDelete: (id: ParamValue)=> api.patch(`/auth/user/${id}/soft-delete`, {})

}


