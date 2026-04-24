import { INVOICE_STATUS } from "@/src/constants/enum"
import { Deal } from "../deals/deal.types"
import { Quotation } from "../quotations/quote.types"
import { User } from "../auth/auth.types"

export interface QuotationLineItem {
  description: string
  quantity: number
  unit?: string | null
  unitPrice: number
  discount?: number | null
  taxRate?: number | null
  total: number
}

export interface Invoice {
  id: string
  invoiceId: string
  sourceQuoteId?: string | null
  deal: Deal
  quotation: Quotation
  customerName: string
  customerEmail: string
  customerEmailHash?: string | null
  customerPhone?: string | null
  customerPhoneHash?: string | null
  companyName?: string | null
  companyAddress?: string | null
  companyWebsite?: string | null
  billingAddress?: string | null
  lineItems?: QuotationLineItem[]
  currency: string
  subTotal: number
  discountAmount?: number | null
  discountPercent?: number | null
  taxAmount?: number | null
  taxPercent?: number | null
  shippingAmount?: number | null
  total: number
  issueDate?: string | null
  dueDate: string
  status: INVOICE_STATUS
  paymentTerms?: string | null
  notes?: string | null
  termsAndConditions?: string | null
  internalNotes?: string | null
  paidAmount: number
  lastPaymentDate?: string | null
  createdBy: User
  updatedBy?: User | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}