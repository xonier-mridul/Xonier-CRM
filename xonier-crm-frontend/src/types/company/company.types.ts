import {
  BILLING_CYCLE,
  COMPANY_STATUS,
  COUNTRY_CODE,
  NUMBER_OF_EMPLOYEES,
} from "../../constants/enum";
import { Subscription } from "../subscription/subscription.types";

export interface Company {
  id: string;
  companyId: string;
  slug: string;
  subDomain?: string;
  industry: string;
  companyName: string;
  email: string;
  number: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  website?: string;
  timezone?: string;
  registrationNumber?: string;
  isEmailVerified: boolean;

  tradeNumber?: string;
  primary_admin?: string;
  subscription?: Subscription | string;
  userLimit?: number;
  subscriptionCount: number;
  country?: COUNTRY_CODE;
  status: COMPANY_STATUS;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CompanyCreatePayload {
  industry: string;
  companyName: string;
  number: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  website?: string;
  timezone?: string;
  registrationNumber?: string;
  tradeNumber?: string;
  adminFirstName: string;
  adminLastName?: string;
  adminEmail: string;
  adminPhone: string;
  password: string;
  userLimit?: number;
  country?: COUNTRY_CODE;
  planId?: string;
  billingCycle?: BILLING_CYCLE;
}

export interface CompanySelfRegisterPayload {
  industry: string;
  companyName: string;
  number: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  website?: string;
  timezone?: string;
  registrationNumber?: string;
  tradeNumber?: string;
  adminFirstName: string;
  adminLastName?: string;
  adminEmail: string;
  adminPhone: string;
  password: string;
  country?: COUNTRY_CODE;
  planId?: string;
  billingCycle?: BILLING_CYCLE;
}

export interface CompanyUpdatePayload {
  industry?: string;
  companyName?: string;
  number?: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  website?: string;
  timezone?: string;
  registrationNumber?: string;
  tradeNumber?: string;
  userLimit?: number;
  country?: COUNTRY_CODE;
  subDomain?: string;
  status?: COMPANY_STATUS;
}

export interface CompanyFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: COMPANY_STATUS;
  country?: COUNTRY_CODE;
  companySize?: NUMBER_OF_EMPLOYEES;
}



export interface CompanyDeletedFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: COUNTRY_CODE;
  companySize?: NUMBER_OF_EMPLOYEES;
}

export interface VerifyOtpPayload {
  userId: string;
  email:string;
  otp: number;
}



export interface ResendOtpPayload {
  userId: string;
}

export interface CompanyStats {
  total: number;
  byStatus: Partial<Record<COMPANY_STATUS, number>>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedCompanies {
  data: Company[];
  pagination: Pagination;
}

export interface CreateCompanyResponse {
  companyId: string;
  userId: string;
  subscriptionId: string | null;
  data: any;
  message: string;
}

export interface SelfRegisterResponse {
  companyId: string;
  userId: string;
  subscriptionId: string | null;
  message: string;
}

export interface VerifyOtpResponse {
  message: string;
}

export interface ResendOtpResponse {
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}




export interface CompanyUpdateFormProps {
  company: Company;
  isSubmitting: boolean;
  isVerifying: boolean;
  error: string | string[];
  onUpdate: (payload: CompanyUpdatePayload) => Promise<void>;
  onVerifyOtp: (userId: string, email: string, otp: number) => Promise<void>;
  onResendOtp: (userId: string) => Promise<void>;
  loading: boolean
}

export interface CompanyState {
  id: string;
  companyName: string;
}


export interface CompanySelectProps {
  companyData: CompanyState[];
  company: string;
  handleCompanyChange: (
      companyId: string
   ) => void;
 

}
