import { EventType } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface CalendarEvent {
  id: string; 

  title: string;
  description?: string | null;

  eventType: EventType;

  start: string; 
  end?: string | null; 

  isAllDay: boolean;

  priority?: "low" | "medium" | "high";

  createdBy: User;
  updatedBy?: User | null;

  createdAt: string; 
  updatedAt: string; 
}

export interface CalendarEventPayload {
    title: string;
  description: string ;

  eventType: EventType;

  start: string; 
  end: string | null ; 

  isAllDay: boolean;

  priority: "low" | "medium" | "high";
}
