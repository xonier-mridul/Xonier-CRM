import { COUNTRY_CODE, EMPLOYEE_SENIORITY, INDUSTRIES, LANGUAGE_CODE, PRIORITY, PROJECT_TYPES, SALES_STATUS, SOURCE } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface Lead {
  id: string;                
  lead_id: string;

  fullName: string;
  email: string;              
  phone: string;              

  priority: PRIORITY;
  source: SOURCE;
  projectType: PROJECT_TYPES;
  status: SALES_STATUS;

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

  message?: string | null;
  membershipNotes?: string | null;

  inDeal?: boolean

  createdAt: string;          
  updatedAt: string;          
  deletedAt?: string | null;
  extraFields?: Record<string, string | number | boolean | null> | null;
}

export interface LeadPayload {
  fullName: string;
  email: string;
  phone: string;

  priority: PRIORITY | "";
  source: SOURCE | "";
  projectType: PROJECT_TYPES | "";
  status: SALES_STATUS | "";

  companyName?: string;
  city?: string;
  country?: COUNTRY_CODE | null;
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
  leads: LeadPayload[];
}
