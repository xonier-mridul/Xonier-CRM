import { QuotationStatus } from "@/src/constants/enum";
import { User } from "../auth/auth.types";
import { Quotation } from "./quote.types";


export interface QuotationHistory {
  id: string;

  quotation: Quotation;

  eventType: string; 

  delta?: Record<
    string,
    {
      old: any;
      new: any;
    }
  > | null;

  previousStatus?: QuotationStatus | null;
  newStatus?: QuotationStatus | null;

  performedBy?: User | null;

  createdAt: string; 
}
