import { BILLING_CYCLE, SUBSCRIPTION_STATUS } from "@/src/constants/enum";

export interface Subscription {
  _id: string;
  subscriptionId: string;
  planId: string;
  companyId: string;
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