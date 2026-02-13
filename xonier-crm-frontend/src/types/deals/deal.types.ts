import { DEAL_PIPELINE, DEAL_STAGES, DEAL_STATUS, DEAL_TYPE, FORECAST_CATEGORY } from "@/src/constants/enum";
import { Lead } from "../leads/leads.types";
import { User } from "../auth/auth.types";


export interface Deal {
  id: string;                 

  deal_id: string;
  lead_id:  Lead;              

  dealName: string;
  dealPipeline: DEAL_PIPELINE;
  dealStage: DEAL_STAGES;
  dealType: DEAL_TYPE;

  dealOwner?: string | null;

  createDate: string;           
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
  inQuotation: boolean;
  status: DEAL_STATUS;
  createdBy: User;            
  updatedBy?:  null | User;    
  
  createdAt: string;            
  updatedAt: string;            
  deletedAt?: string | null;
}

export interface DealPayload {
  lead_id: string;

  dealName: string;
  dealPipeline: DEAL_PIPELINE;
  dealStage: DEAL_STAGES;
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
export interface DealUpdatePayload {


  dealName: string;
  dealPipeline: DEAL_PIPELINE;
  dealStage: DEAL_STAGES;
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

export interface UpdateDealStatusPayload{
  status: DEAL_STATUS
}

export interface GetAllParams {
   page: number, limit: number
}