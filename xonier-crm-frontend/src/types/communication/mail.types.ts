import { User } from "@/src/types";   
export interface EmailLog {
  id: number;
  to_emails: string[];
  from_email: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
  delivered_at?: string | null;
  failed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  "cc_emails": string[];
  template?: Template|null;
  "bcc_emails": string[];
  "from_name": string;
  "send_by": string;
  "provider": string;
  "provider_message_id": string | null;
  "opened_count": number;
  "clicked_count": number;
  "opened_at": string | null;
  "clicked_at": string | null;
    "retry_count": number;
    lead_id?: string | null;
    deal_id?: string | null;
    client_id?: string | null;
    invoice_id?: string | null;
    quotation_id?: string | null;
    prospect_id?: string | null;
    reply_to?: string | null;
    html_body?: string | null;
    sent_by?: User | null;
    variables_used?: Record<string, string> | null;
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