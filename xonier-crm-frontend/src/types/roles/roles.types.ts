import { Dispatch, SetStateAction } from "react";
import { User } from "../auth/auth.types";

export interface GetAllRolesPayload {
    currentPage: number,
    pageLimit: number,
    
}

export interface Permissions{
    _id: string;
    code: string;
    module: string;
    action: string;
    title: string;
    description: string;
    is_active: boolean;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
}





export interface UserRole {
    _id: string;
    name: string;
    code: string;
    permissions: Array<Permissions>;
    status: boolean;
    isSystemRole: boolean;
    createdBy?:User | null;
    updatedBy?: User | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}

// Props

export interface RoleTableProps {
    roleData: UserRole[];
  permissionData: Array<Permissions> | null;
  currentPage: number;
  pageLimit: number;
  handleDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
  isPopupShow: boolean;
  setIsPopupShow: Dispatch<SetStateAction<boolean>>;

  formData: UserRolePayload;
  setFormData: Dispatch<SetStateAction<UserRolePayload>>;
  handleSubmit: () => Promise<void>;
  hasPermissions: (permission: string)=>boolean
}


export interface UserRolePayload {
    name: string;
    permissions: string[]
}