import { DEAL_PIPELINE, DEAL_STAGES, DEAL_STATUS, DEAL_TYPE, FORECAST_CATEGORY } from "@/src/constants/enum";
import { Lead } from "../leads/leads.types";
import { User } from "../auth/auth.types";


export interface Deal {
  id: string;                 

  deal_id: string;
  lead_id?: Lead | null;
  organizationId?: string | null;
  personId?: string | null;
  organization?: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    notes?: string | null;
    cnpj?: string | null;
  } | null;
  person?: {
    id: string;
    fullName: string;
    organizationId?: string | null;
    organizationName?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    city?: string | null;
    country?: string | null;
    notes?: string | null;
  } | null;

  dealName: string;
  dealPipeline: string;
  dealStage: string;
  dealType: DEAL_TYPE;

  dealOwner?: string | null;

  createDate: string;           
  closeDate?: string | null;

  amount: number;               

  dealCollaborator?: string | null;
  dealDescription?: string | null;
  extraFields?: Record<string, string | number | boolean | null>;
  followUpAt?: string | null;
  followUpOwnerId?: string | null;

  dealProbability?: number | null;      
  forecastProbability?: number | null;  

  nextStep?: string | null;
  forecastCategory?: FORECAST_CATEGORY | null;

  closedWonReason?: string | null;
  closedLostReason?: string | null;

  originalTrafficSource?: string | null;
  inQuotation: boolean;
  status: DEAL_STATUS;
  createdBy: User;            
  updatedBy?:  null | User;    
  assignedTo?: null | User;   // ✅ Assigned user via bulk-assign
  
  createdAt: string;            
  updatedAt: string;            
  deletedAt?: string | null;
}

export interface DealPayload {
  lead_id?: string | null;
  organizationId?: string | null;
  personId?: string | null;

  dealName: string;
  dealPipeline?: DEAL_PIPELINE;
  dealStage: string;
  dealType: DEAL_TYPE;

  dealOwner?: string | null;

  createDate: string | Date;            
  closeDate?: string | null;

  amount: number;

  dealCollaborator?: string | null;
  dealDescription?: string | null;
  extraFields?: Record<string, string | number | boolean | null>;

  dealProbability?: number | null;      
  forecastProbability?: number | null;  

  nextStep?: string | null;
  forecastCategory?: FORECAST_CATEGORY | null;

  closedWonReason?: string | null;
  closedLostReason?: string | null;

  originalTrafficSource?: string | null;
}
export interface DealUpdatePayload {
  organizationId?: string | null;
  personId?: string | null;

  dealName: string;
  dealPipeline?: DEAL_PIPELINE | null;
  dealStage: string;
  dealType: DEAL_TYPE;

  dealOwner?: string | null;

  createDate: string | Date;            
  closeDate?: string | null;

  amount: number;

  dealCollaborator?: string | null;
  dealDescription?: string | null;

  dealProbability?: number | null;      
  forecastProbability?: number | null;  

  nextStep?: string | null;
  forecastCategory?: FORECAST_CATEGORY | null;

  closedWonReason?: string | null;
  closedLostReason?: string | null;

  originalTrafficSource?: string | null;
}

export interface DealStageUpdatePayload {
  dealStage: string;
  closeDate?: string | null;
  closedWonReason?: string | null;
  closedLostReason?: string | null;
  dealProbability?: number | null;
  forecastProbability?: number | null;
  forecastCategory?: FORECAST_CATEGORY | null;
  nextStep?: string | null;
  amount?: number;
}

export interface UpdateDealStatusPayload{
  status: DEAL_STATUS
}

export interface GetAllParams {
   page: number, limit: number
}
