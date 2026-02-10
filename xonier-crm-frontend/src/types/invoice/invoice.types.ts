import { INVOICE_STATUS } from "@/src/constants/enum"
import { Deal } from "../deals/deal.types"
import { Quotation } from "../quotations/quote.types"
import { User } from "../auth/auth.types"

export interface Invoice {
  id: string

  invoiceId: string

  deal:  Deal
  quotation: Quotation

  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  billingAddress?: string

  subTotal: number
  total: number

  issueDate?: string          
  dueDate: string            

  status: INVOICE_STATUS

  notes?: string

  paidAmount: number
  lastPaymentDate?: string    

  createdBy: User
  updatedBy?: User | null

  createdAt: string           
  updatedAt: string           
  deletedAt?: string
}