export type TicketStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "RESOLVED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Attachment {
  id: string;
  name: string;
  size: string;
  url: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  status: TicketStatus;
  completed: boolean;
  active: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  issueType: string;
  product: string;
  module: string;
  status: TicketStatus;
  priority: TicketPriority;
  raisedBy: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  estimatedResponse: string;
  attachments: Attachment[];
  history: TimelineEvent[];
}

export interface PreviousTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  updatedAt: string;
}