import { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { Permissions } from "../roles/roles.types";
import { TelephoneNumber } from "../communication/telephone.types";
import { Company, CompanyState, } from "../company/company.types";


export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean,
  user: User | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  companyId:string
}

export interface VerifyLoginOtpPayload {
  email: string;
  otp: number;
  password: string;
  companyId:string;
}

export interface ResendLoginOtpPayload {
  email: string;
  password: string;
  companyId?:string
}

export interface changePasswordPayload {
  oldPassword: string,
  newPassword: string
}

export interface changePassword{
  email: string;
  otp:string;
  password: string
}


export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  isDisabled?: boolean;
}

export interface GetAllUsers {
  page: number;
  limit: number;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  search?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  userRole: string[];
  companyId?: string;


}

export interface UserUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userRole: Array<string>;

  companyId?: string;
}



export enum USER_STATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",

}

export interface UserStatusPayload {
  status: string
}

export interface UserPasswordUpdatedByAdminPayload {
  password: string,
  confirmPassword: string
}

export interface AssignedPhoneNumber {
  assignedPhoneNumber: string
}


export interface UserRole {
  id: string;
  name: string;
  code: string;
  status: string;
  isSystemRole: boolean;
  power: number;
  canManageBelow: boolean;
  permissions: Permissions[];
  createdAt: string;
  updatedAt?: string;
}



export interface UserRef {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string
}


export interface TaskDataForUser {
  _id: string;
  title: string;
  rating?: number | null;
  remark?: string | null;
  assignedAt?: Date | string | null;
  dueDate?: Date | string | null;
  completedAt?: Date | string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  isOverdue?: boolean | null;
}

// ── Paginated Task Data ────────────────────────────────────────

export interface PaginatedTaskData {
  data: TaskDataForUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export interface User {
  id: string;
  _id?: string

  firstName: string;
  lastName?: string;


  email: string;
  phone: string;

  isEmailVerified: boolean;
  status: USER_STATUS;

  userRole: UserRole[];
  assignedPhoneNumber: TelephoneNumber

  companyId: string | Company;
  isActive: boolean;

  lastLogin?: Date | null;
  refreshToken?: string | null;

  createdBy?: UserRef | null;
  updatedBy?: UserRef | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: string | null;
  rating?: number | null;
  taskData?: PaginatedTaskData | null;
}

export interface UserRatingParams {
  page?: number;
  limit?: number;
}

// Props

export interface passwordCheck{

  label: string;
  valid: boolean;

}

export interface UserTableComponentProps {
  currentPage: number;
  pageLimit: number;
  userData: Array<User> | null;
  handleDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  isPopupShow: boolean;
  setIsPopupShow: Dispatch<SetStateAction<boolean>>;
  formData: RegisterPayload;
  roleData: UserRole[] | [];
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUserRoleChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleRemoveRole: (id: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  err: string | string[];
  loading: boolean,
  setPageLimit: Dispatch<SetStateAction<number>>,
  totalPage: number,
  setCurrentPages: Dispatch<SetStateAction<number>>,
  setSearchFilter: Dispatch<SetStateAction<string>>,
  setFormData: Dispatch<SetStateAction<RegisterPayload>>,
  isAdmin : boolean,
  companyData : Company[],
  // handleSearchFilter: Dispatch<SetStateAction<string>>;

  handleCompanyChange: (companyId: string) => void;
  handleCompanyFilter: (companyId: string) => void;
  companyLoading: boolean
companyHasMore: boolean
onCompanyScrollEnd: () => void
selectedCompanyId: string
checks:passwordCheck[]

}

export interface UserDetailPageProps {
  userData: User | null;
  isLoading: boolean;
}

export interface UserUpdatePageProps {
  formData: UserUpdatePayload;
  isLoading: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePassChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUserRoleChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleRemoveRole: (roleId: string) => void;
  roleData: UserRole[];
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  err: string | string[];
  statusErr: string | string[];
  handleStatus: (e: FormEvent<HTMLFormElement>) => void;
  handleStatusChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  statusData: UserStatusPayload;
  statusLoading: boolean;
  passwordData: UserPasswordUpdatedByAdminPayload;
  handlePasswordSubmit: (e: FormEvent<HTMLFormElement>) => void
  passErr: string | string[]
  isPassLoading: boolean,
  isAdmin:boolean
}

export interface ChangePasswordFormData {
  oldPassword: string,
  newPassword: string,
  confirmNewPassword: string

}

export interface ChangePasswordProps {
  formData: ChangePasswordFormData;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  err: string | null | string[]

}
export interface UserSelectProps {
  users: User[];
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  placeholder ?: string;
  cls?: string;
};

export interface countryCode {
  code: string;
  label: string;
}


// auth.types.ts — ADD these

export interface MonthlyTrendItem {
  month: string; // "2025-06"
  tasksCompleted: number;
  onTimeRate: number;
  avgRating: number | null;
}

export interface UserRatingStats {
  totalTasksDone: number;
  ratedTasksCount: number;
  unratedTasksCount: number;
  onTimeTasksCount: number;
  overdueTasksCount: number;
  onTimeRate: number;
  ratingRate: number;
  overallRating: number | null;
  avgActualHours: number;
  efficiencyRate: number | null;
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  monthlyTrend: MonthlyTrendItem[];
}


export interface UserRatingParams {
  page?: number;
  limit?: number;
  dateFilter?: DateFilterType;
  startDate?: string;
  endDate?: string;
  ratingFilter?: RatingFilterType;
  onTimeFilter?: OnTimeFilterType;
  trendMonths?: number;
}

// UPDATE existing User interface
export interface User {
  // ...existing fields
  stats?: UserRatingStats | null;
}


// ADD to your existing auth.types.ts

export interface MonthlyTrendItem {
  month: string; // "2025-06"
  tasksCompleted: number;
  onTimeRate: number;
  avgRating: number | null;
}

export interface RatingDistribution {
  "1": number;
  "2": number;
  "3": number;
  "4": number;
  "5": number;
}

export interface UserRatingStats {
  totalTasksDone: number;
  ratedTasksCount: number;
  unratedTasksCount: number;
  onTimeTasksCount: number;
  overdueTasksCount: number;
  onTimeRate: number;
  ratingRate: number;
  overallRating: number | null;
  avgActualHours: number;
  efficiencyRate: number | null;
  ratingDistribution: RatingDistribution;
  monthlyTrend: MonthlyTrendItem[];
}

export type DateFilterType = "all" | "today" | "week" | "month" | "year" | "custom";
export type RatingFilterType = "all" | "rated" | "unrated" | "1" | "2" | "3" | "4" | "5";
export type OnTimeFilterType = "all" | "onTime" | "overdue";

export interface UserRatingParams {
  page?: number;
  limit?: number;
  dateFilter?: DateFilterType;
  startDate?: string;
  endDate?: string;
  ratingFilter?: RatingFilterType;
  onTimeFilter?: OnTimeFilterType;
  trendMonths?: number;
}

// UPDATE your existing User interface — add this field
export interface User {
  // ...keep all existing fields
  stats?: UserRatingStats | null;
}