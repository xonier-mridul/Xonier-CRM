import React, { Dispatch, SetStateAction } from "react";
import { CategoryItem } from "./category.types";
// ── Permissions Enum ──────────────────────────────────────────────────────────

export enum StatusPermissions {
  CREATE_STATUS = "CREATE_STATUS",
  EDIT_STATUS   = "EDIT_STATUS",
  DELETE_STATUS = "DELETE_STATUS",
  VIEW_STATUS   = "VIEW_STATUS",
}

// ── API payload sent on create / update ──────────────────────────────────────
export interface StatusPayload {
  name:        string;
  description: string;
  color:       string;
  icon:        string;
  category: string;
  isFinal: boolean;
  order: number;
}

// ── Shape returned by the API ─────────────────────────────────────────────────
export interface StatusItem {
  id:          string;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  createdAt:   string;
  updatedAt:   string;
  category: CategoryItem;
  isFinal: boolean;
  order: number
}

// ── Paginated API response wrapper ────────────────────────────────────────────
export interface PaginatedStatusResponse {
  data:  StatusItem[];
  page:  number | string;
  limit: number | string;
  total: number;
}

export interface StatusTableProps {
  statusData:       StatusItem[];
  currentPage:      number;
  pageLimit:        number;
  isLoading:        boolean;
  loading:          boolean;
  isPopupShow:      boolean;
  setIsPopupShow:   Dispatch<SetStateAction<boolean>>;
  formData:         StatusPayload;
  setFormData:      Dispatch<SetStateAction<StatusPayload>>;
  editTarget:       StatusItem | null;
  handleSubmit:     () => Promise<void>;
  handleUpdate:     () => Promise<void>;
  handleEdit:       (status: StatusItem) => void;
  handleDelete:     (id: string) => Promise<void>;
  handleClosePopup: () => void;
  hasPermissions:   (permission: string) => boolean;
  totalPages: number;
  handlepagechange: (page: number) => void;
  handleSearch:     (search: string) => void;
  handleCategory :  (category: string) => void;
  err:              string | string[] | null;
}

export interface ColorOption {
  label: string;
  bg:    string;
  text:  string;
  hex:   string;
}

export interface ModalProps {
  formData:         StatusPayload;
  setFormData:      Dispatch<SetStateAction<StatusPayload>>;
  editTarget:       StatusItem | null;
  isLoading:        boolean;
  handleSubmit:     () => Promise<void>;
  handleUpdate:     () => Promise<void>;
  handleClosePopup: () => void;
  err:              string | string[] | null;
  isFinal:          boolean;
}

export interface getPayLoad {
  currentPage: number;
  pageLimit: number;
  search?:string;
  category?:string;
}