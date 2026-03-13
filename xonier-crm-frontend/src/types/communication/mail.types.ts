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