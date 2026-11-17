import { EventType } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface CalendarEvent {
  id: string; 

  title: string;
  description?: string | null;

  eventType: EventType;
  meetingLink?: string | null;
  start: string; 
  end?: string | null; 

  isAllDay: boolean;

  priority?: "low" | "medium" | "high";

  createdBy: User;
  updatedBy?: User | null;

  createdAt: string; 
  updatedAt: string; 
  entityType?: "lead" | "deal" | null;
  entityId?: string | null;
  entityName?: string | null;
  followUpEntity?: "lead" | "deal" | "quotation" | "invoice" | "enquiry";
  followUpRecordId?: string;
}

export interface CalendarEventPayload {
  title: string;
  description: string ;

  eventType: EventType;
  meetingLink: string | null;
  start: string; 
  end: string | null ; 

  isAllDay: boolean;

  priority: "low" | "medium" | "high";
  entityType?: "lead" | "deal" | "" | null;
  entityId?: string | null;
  entityName?: string | null;
}

export interface BulkCalenderEventPayload {
  events: Array<CalendarEventPayload>
}
