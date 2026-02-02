import { QuotationStatus } from "@/src/constants/enum";
import { Deal } from "../deals/deal.types";
import { User } from "../auth/auth.types";

export interface Quotation {
  id: string;              
  quoteId: string;

  title?: string;
  description?: string;

  deal: Deal;             

  customerId: string;
  customerName: string;

  customerEmail: string;
  customerEmailHash?: string | null;

  customerPhone?: string | null;
  customerPhoneHash?: string | null;

  companyName?: string | null;

  subTotal: number;
  total: number;

  quotationStatus: QuotationStatus;

  issueDate: string;         
  valid: string;    
  
  createdBy: User
  updatedBy?: User

  createdAt: string;         
  updatedAt: string;         
}

export interface QuotationCreatePayload {
          
  quoteId: string;

  title?: string;
  description?: string;

  deal: Deal;             

  customerId: string;
  customerName: string;

  customerEmail: string;
  customerEmailHash?: string | null;

  customerPhone?: string | null;
  customerPhoneHash?: string | null;

  companyName?: string | null;

  subTotal: number;
  total: number;

  quotationStatus: QuotationStatus;

  issueDate: string;  
}
