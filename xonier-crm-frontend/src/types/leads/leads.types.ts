import { COUNTRY_CODE, EMPLOYEE_SENIORITY, INDUSTRIES, LANGUAGE_CODE, LEAD_SOURCE_TYPE, PRIORITY, PROJECT_TYPES, SALES_STATUS, SOURCE } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface Lead {
  id: string;                
  lead_id: string;

  fullName: string;
  email: string;              
  phone: string;

  priority: PRIORITY;
  source: string;
  projectType: PROJECT_TYPES;
  status: SALES_STATUS;
  leadSource: LEAD_SOURCE_TYPE
  createdBy: User;          
  updatedBy?: User | null;  

  companyName?: string | null;
  city?: string | null;
  country?: COUNTRY_CODE | null;
  postalCode?: number | null;
  language?: LANGUAGE_CODE | null;

  industry?: INDUSTRIES | null;
  employeeRole?: string | null;
  employeeSeniority?: EMPLOYEE_SENIORITY | null;

  assignedTo?: User[] | null;   
  assignedBy?: User | null;     
  assignedAt?: string | null;   
  isAssigned?: boolean;     
  dataTag?: string | null;

  message?: string | null;
  membershipNotes?: string | null;

  inDeal?: boolean
  connectStatus?: string | null;
  createdAt: string;          
  updatedAt: string;          
  deletedAt?: string | null;
  extraFields?: Record<string, string | number | boolean | null> | null;
}

export interface LeadPayload {
  fullName: string;
  email: string;
  phone?: string | null;

  priority?: PRIORITY | "";
  source?: string | "";
  projectType?: string | "";
  status?: SALES_STATUS | "";

  companyName?: string;
  city?: string;
  country?: string | null;
  postalCode?: number | null;
  language?: LANGUAGE_CODE | null;
  

  industry?: INDUSTRIES | null;
  employeeRole?: string;
  employeeSeniority?: EMPLOYEE_SENIORITY | null;

  message?: string | null;
  membershipNotes?: string | null;

  extraFields?: Record<string, string | number | boolean | null> | null;
}

export interface BulkLeadPayload {
  dataTag?: string | null;
  leads: LeadPayload[];
}

export interface UpdateLeadStatusPayload {
  status: SALES_STATUS
}

export interface BulkReassignLeadSchema{
    userId: string;
    leadsId: Array<string>
}
export enum LeadEngagementStatus {
  INTERESTED = "interested",
  NOT_INTERESTED = "not_interested",
  CONNECTED = "connected",
  NOT_CONNECTED = "not_connected",
  NOT_REACHED = "not_reached",
}

export interface LeadEngagementStatusPayload {
  status: LeadEngagementStatus
}