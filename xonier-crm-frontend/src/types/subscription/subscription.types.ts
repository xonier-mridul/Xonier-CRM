import { BILLING_CYCLE, SUBSCRIPTION_STATUS } from "@/src/constants/enum";
import { Plan } from "../plan/plan.types";
import { Company } from "../company/company.types";

export interface Subscription {
  id: string;
  subscriptionId: string;
  planId: string | Plan;
  companyId: string | Company;
  billingCycle: BILLING_CYCLE;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  status: SUBSCRIPTION_STATUS;
  startSubscriptionDate: string;
  endSubscriptionDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionTableProps { 
  currentPage: number,
  totalPages: number,
  onPageChange : (page:number)=>void,
  isLoading: boolean,
  subScriptionData:Subscription[],
  pageLimit:number

}

export interface subScriptionView {
  subScriptionData: Subscription,
  isLoading: boolean
}