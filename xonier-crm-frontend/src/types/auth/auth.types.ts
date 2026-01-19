import { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { Permissions } from "../roles/roles.types";


export interface AuthState{
    isAuthenticated: boolean;
    user: User | null;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface VerifyLoginOtpPayload{
    email: string;
    otp: number;
    password: string;
}

export interface ResendLoginOtpPayload{
    email: string;
    password: string;
}

 export interface changePasswordPayload{
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

}

export interface RegisterPayload {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    userRole: string[];
    company: string;
}

export interface UserUpdatePayload{
  firstName: string;
    lastName: string;
    email: string;
    phone: string;
    userRole: Array<string>;
    company:string
}


export enum USER_STATUS {
  ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    DELETED = "deleted",

}


export interface UserRole {
  id: string;
  name: string;
  code: string;
  status: string;
  isSystemRole: boolean;
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

  firstName: string;
  lastName?: string;

  email: string;
  phone: string;

  isEmailVerified: boolean;
  status: USER_STATUS;

  userRole: UserRole[];

  company: string;
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

export interface UserTableComponentProps{
    currentPage: number;
    pageLimit: number;
    userData: Array<User> | null;
    handleDelete: (id:string)=> Promise<void>;
    isLoading: boolean;
    isPopupShow: boolean;
    setIsPopupShow: Dispatch<SetStateAction<boolean>>;
    formData: RegisterPayload;
    roleData: UserRole[] | [];
    handleChange: (e:ChangeEvent<HTMLInputElement>)=>void;
    handleUserRoleChange: (e: ChangeEvent<HTMLSelectElement>)=>void;
    handleRemoveRole:(id:string)=>void;
    handleSubmit:(e:FormEvent<HTMLFormElement>)=>void;
    err: string | string[];
    loading: boolean
}

export interface UserDetailPageProps {
  userData: User | null;
  isLoading: boolean;
}

export interface UserUpdatePageProps {
  formData: UserUpdatePayload;
  isLoading: boolean;
  handleChange: (e:ChangeEvent<HTMLInputElement>)=>void;
  handleUserRoleChange: (e:ChangeEvent<HTMLSelectElement>)=>void;
  handleRemoveRole: (roleId: string)=>void;
  roleData: UserRole[];
  handleSubmit: (e:FormEvent<HTMLFormElement>)=>void;
  loading: boolean
  err: string | string[]
 
}

export interface ChangePasswordFormData {
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string

  }

  export interface ChangePasswordProps {
    formData:  ChangePasswordFormData;
    handleChange: (e: ChangeEvent<HTMLInputElement>)=>void;
    onSubmit: (e: FormEvent<HTMLFormElement>)=>Promise<void>;
    isLoading: boolean;
    err: string | null |string[]

  }
