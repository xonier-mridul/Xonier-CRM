import { User } from "@/src/types";   
export interface EmailLog {
  id: number;
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  status: "sent" | "delivered" | "opened" | "failed" | "queued";
  provider_message_id?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  failed_at?: string;
  error_message?: string;
  created_at?: string;
}
export type TemplateVariable = {
  key: string;
  label: string;
  description: string;
  default_value: string;
  is_required: boolean;
};


export type Template = {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  status: string;
  subject: string;
  html_body: string;
  text_body?: string | null;
  variables?: Variable[];
  thumbnail_url?: string | null;
  tags: string[];
  usage_count?: number;
  last_used_at?: string | null;
  is_global?: boolean;
  created_by?: User;
  updated_by?: User | null;
  created_at?: string;
  updated_at?: string;
  deleted_by?: string | null;
  deleted_at?: string | null;
  privacy: "PUBLIC" | "PRIVATE"|string;
};
export interface CustomVarForm {
  key: string;
  label: string;
  description: string;
  default_value: string;
  is_required: boolean;
}
export interface Variable {
  key: string;
  label: string;
  description?: string;
  default_value?: string;
  is_required: boolean;
  isCustom?: boolean;
}