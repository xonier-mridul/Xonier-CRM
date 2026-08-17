// src/utils/validation/companyValidation.ts

import { CompanySettingFormErrors, CompanySettingUpdatePayload } from "@/src/types/companySetting/company.types";


export const validateCompanyForm = (data: CompanySettingUpdatePayload): CompanySettingFormErrors => {
  const errors: CompanySettingFormErrors = {};

  // Company Name validation
  if (!data.companyName || data.companyName.trim().length === 0) {
    errors.companyName = "Company name is required";
  } else if (data.companyName.trim().length < 3) {
    errors.companyName = "Company name must be at least 3 characters";
  } else if (data.companyName.length > 100) {
    errors.companyName = "Company name must not exceed 100 characters";
  }

  // Industry validation
  if (!data.industry || data.industry.trim().length === 0) {
    errors.industry = "Industry is required";
  }

  // Email validation
  if (!data.companyEmail || data.companyEmail.trim().length === 0) {
    errors.companyEmail = "Company email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.companyEmail)) {
      errors.companyEmail = "Please enter a valid email address";
    }
  }

  // Phone validation
  if (!data.companyPhoneNumber || data.companyPhoneNumber.trim().length === 0) {
    errors.companyPhoneNumber = "Phone number is required";
  }

  // Website validation (optional but must be valid if provided)
  if (data.website && data.website.trim().length > 0) {
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlRegex.test(data.website)) {
      errors.website = "Please enter a valid URL";
    }
  }


  return errors;
};