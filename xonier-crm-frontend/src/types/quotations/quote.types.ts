import { QuotationCurrency, QuotationPaymentStatus, QuotationStatus } from "@/src/constants/enum";
import { Deal } from "../deals/deal.types";
import { User } from "../auth/auth.types";



export interface QuotationLineItem {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  discount?: number | null;
  taxRate?: number | null;
  total: number;
}

export interface Quotation {
  id: string;
  quoteId: string;

  title?: string;
  description?: string;

  deal: Deal;

  customerName: string;
  customerEmail: string;
  customerEmailHash?: string | null;
  customerPhone?: string | null;
  customerPhoneHash?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyWebsite?: string | null;

  lineItems?: QuotationLineItem[];

  currency: QuotationCurrency;
  subTotal: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  taxAmount?: number | null;
  taxPercent?: number | null;
  shippingAmount?: number | null;
  total: number;

  quotationStatus: QuotationStatus;
  paymentStatus: QuotationPaymentStatus;
  paymentTerms?: string | null;
  paymentMethod?: string | null;

  issueDate: string;
  valid?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  viewedAt?: string | null;
  sentAt?: string | null;

  termsAndConditions?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  attachments?: string[];

  confirmToken?: string | null;
  confirmedByName?: string | null;
  confirmedByEmail?: string | null;

  viewCount: number;
  lastViewedAt?: string | null;
  version: number;
  isLatestVersion: boolean;

  convertedToInvoice: boolean;
  invoiceId?: string | null;

  createdBy: User;
  updatedBy?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationLineItemPayload {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  discount?: number | null;
  taxRate?: number | null;
  total: number;
}

export interface QuotationCreatePayload {
  title: string;
  description?: string;

  deal: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyWebsite?: string | null;

  lineItems?: QuotationLineItemPayload[];

  currency?: QuotationCurrency;
  subTotal: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  taxAmount?: number | null;
  taxPercent?: number | null;
  shippingAmount?: number | null;
  total: number;

  quotationStatus?: QuotationStatus;
  paymentTerms?: string | null;
  paymentMethod?: string | null;

  issueDate: string;
  valid?: string | null;

  termsAndConditions?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  attachments?: string[];
}

export interface QuotationUpdatePayload extends Partial<QuotationCreatePayload> {}

export interface QuoteStatusUpdatePayload {
  quotationStatus: string;
}