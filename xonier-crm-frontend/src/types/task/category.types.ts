import { User } from "@/src/types";
// ── Permissions Enum ──────────────────────────────────────────────────────────
export enum CategoryPermissions {
  CREATE_CATEGORY = "CREATE_CATEGORY",
  EDIT_CATEGORY   = "EDIT_CATEGORY",
  DELETE_CATEGORY = "DELETE_CATEGORY",
  VIEW_CATEGORY   = "VIEW_CATEGORY",
}

// ── API payload sent on create / update ──────────────────────────────────────
export interface CategoryPayload {
  name:        string;
  description: string;
  color:       string;
  icon:        string;
  visibility:  string;
  isDefault:   boolean;
}

// ── Shape returned by the API ─────────────────────────────────────────────────
export interface CategoryItem {
  id:          string;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  createdAt:   string;
  updatedAt:   string;
  visibility:  string;
  isDefault:   boolean;
  createdBy?:   User;
}

// ── Paginated API response wrapper ────────────────────────────────────────────
export interface PaginatedCategoryResponse {
  data:  CategoryItem[];
  page:  number | string;
  limit: number | string;
  total: number;
}

// ── ColorOption (shared with StatusTable pattern) ─────────────────────────────
export interface ColorOption {
  label: string;
  bg:    string;
  text:  string;
  hex:   string;
}

// ── Table component props ─────────────────────────────────────────────────────
import { Dispatch, SetStateAction } from "react";

export interface CategoryTableProps {
  categoryData:     CategoryItem[];
  currentPage:      number;
  pageLimit:        number;
  isLoading:        boolean;
  loading:          boolean;
  isPopupShow:      boolean;
  setIsPopupShow:   Dispatch<SetStateAction<boolean>>;
  formData:         CategoryPayload;
  setFormData:      Dispatch<SetStateAction<CategoryPayload>>;
  editTarget:       CategoryItem | null;
  handleSubmit:     () => Promise<void>;
  handleUpdate:     () => Promise<void>;
  handleEdit:       (category: CategoryItem) => void;
  handleDelete:     (id: string) => Promise<void>;
  handleClosePopup: () => void;
  hasPermissions:   (permission: string) => boolean;
  totalPages: number;
  handlepagechange: (page: number) => void;
  handleSearch:     (search: string) => void;
  err:              string | string[] | null;
}

export interface getPayLoad {
  currentPage?: number;
  pageLimit?: number;
  search?:string;
}