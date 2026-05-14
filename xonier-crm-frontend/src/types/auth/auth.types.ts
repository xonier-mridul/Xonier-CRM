import { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { Permissions } from "../roles/roles.types";
import { TelephoneNumber } from "../communication/telephone.types";
import { Company } from "../company/company.types";


export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean,
  user: User | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyLoginOtpPayload {
  email: string;
  otp: number;
  password: string;
}

export interface ResendLoginOtpPayload {
  email: string;
  password: string;
}

export interface changePasswordPayload {
  oldPassword: string,
  newPassword: string
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
  companyId?: string

}

export interface UserUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userRole: Array<string>;

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
}

// Props

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
  setFormData: Dispatch<SetStateAction<RegisterPayload>>
  getCompanyData: Company[]

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