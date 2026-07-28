// src/types/company/company.types.ts

export enum CompanyStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum NUMBER_OF_EMPLOYEES {
  EMPLOYEES_1_10 = "1-10",
  EMPLOYEES_11_50 = "11-50",
  EMPLOYEES_51_200 = "51-200",
  EMPLOYEES_201_500 = "201-500",
  EMPLOYEES_501_1000 = "501-1000",
  EMPLOYEES_1000_PLUS = "1000+",
}

export enum COUNTRY_CODE {
  US = "US",
  GB = "GB",
  IN = "IN",
  CA = "CA",
  AU = "AU",
  DE = "DE",
  FR = "FR",
  AE = "AE",
  // Add more countries as needed
}

export interface CompanySetting {
  id: string;
  companyName: string;
  industry: string;
  companyEmail: string;
  companyPhoneNumber: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  country?: COUNTRY_CODE;
  timezone?: string;
  website?: string;
  registrationNumber?: string;
  tradeNumber?: string;
  
  // Read-only fields
  slug?: string;
  subdomain?: string;
  primaryAdmin?: string;
  subscription?: string;
  userLimit?: number;
  subscriptionCount?: number;
  status?: CompanyStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanySettingUpdatePayload {
  companyName: string;
  industry: string;
  companyEmail: string;
  companyPhoneNumber: string;
  companySize?: NUMBER_OF_EMPLOYEES;
  country?: COUNTRY_CODE;
  timezone?: string;
  website?: string;
  registrationNumber?: string;
  tradeNumber?: string;
}

export interface CompanySettingFormErrors {
  companyName?: string;
  industry?: string;
  companyEmail?: string;
  companyPhoneNumber?: string;
  website?: string;
  general?: string;
}