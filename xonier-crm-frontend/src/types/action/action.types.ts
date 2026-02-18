import { ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface Activity {
  id: string;

  userId: User;     

  entityType: ACTIVITY_ENTITY_TYPE;
  entityId?: string | null;

  perform: number;

  action: ACTIVITY_ACTION;
  title: string;
  description?: string | null;

  metadata?: Record<string, any> | null;

  createdAt: string;  
}

export interface TimeSeriesBucket {
  _id: string | number;
  count: number;
}

export interface ActivitySummary {
  range: {
    from: string;
    to: string;
    groupBy: "day" | "week" | "month";
  };

  leads: {
    created: TimeSeriesBucket[];
    lost: number;
  };

  deals: {
    created: TimeSeriesBucket[];
    won: number;
    lost: number;
  };

  quotations: {
    sent: number;
    accepted: number;
  };

  invoices: {
    created: number;
  };
}
