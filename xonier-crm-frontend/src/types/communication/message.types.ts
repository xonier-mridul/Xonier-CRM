export interface Message {
  id?: string;
  provider_message_sid: string | null;
  conversation_id: string | null;
  sent_by: {
    ref: string;
    id: string;
  };
  sent_to_number: string;
  sent_from_number: string;
  message: string;
  direction: "inbound" | "outbound";
  status: "queued" | "sent" | "delivered" | "failed" | string;
  channel: "twilio" | "whatsapp" | "sms" | string;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  cost: number | null;
  cost_currency: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}