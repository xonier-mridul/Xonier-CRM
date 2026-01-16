import { PRIORITY, PROJECT_TYPES, SALES_STATUS, SOURCE } from "@/src/constants/enum";
import { User, UserRef } from "../auth/auth.types";
import { Dispatch, FormEvent, SetStateAction } from "react";



export interface EnquiryData {
  id: string;
  enquiry_id: string;

  fullName: string;
  email: string;
  phone: string;
  companyName?: string | null;

  projectType: PROJECT_TYPES;
  status: SALES_STATUS;
  isActive: boolean;
  priority: PRIORITY;
  source: SOURCE;

  message?: string | null;

  assignTo?: UserRef | null;
  createdBy: UserRef;
  updatedBy?: UserRef | null;

  createdAt: string;   
  updatedAt: string;   
  deletedAt?: string | null;
}




export interface GetEnquiryPayload {
    page: number
    limit: number
    enquiry_id?: string
    fullName?: string
    email?: string
    phone?:string
    companyName?:string
    projectType?:string
    priority?:string

}


export interface CreateEnquiryPayload {
  fullName: string;
  email: string;
  phone: string;

  companyName?: string | null;

  projectType: PROJECT_TYPES;
  priority: PRIORITY;
  source: SOURCE;

  assignTo?: string | null; 
  message?: string | null;
}

export interface BulkCreateEnquiryPayload {
  enquiries: CreateEnquiryPayload[]
}



export interface UpdateEnquiryFromData {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string | null;
  projectType: PROJECT_TYPES | string;
  priority: PRIORITY | string;
  source: SOURCE | string;
  assignTo?: string | null; 
  message?: string | null;
}


export interface UpdateEnquiryPayload {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string | null;
  projectType: PROJECT_TYPES;
  priority: PRIORITY;
  source: SOURCE;
  assignTo?: string | null; 
  message?: string | null;
}

export interface UpdateEnquiryCompProps {
  isLoading: boolean,
  formData: UpdateEnquiryFromData,
  setFormData: Dispatch<SetStateAction<UpdateEnquiryFromData>>,
  handleSubmit: (e: FormEvent<HTMLFormElement>)=>Promise<void>,
  usersData: User[]|null,
  err: string | string[]

}
