import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { CompanySetting, CompanySettingFormErrors, CompanySettingUpdatePayload } from "../types/companySetting/company.types";
import CompanyService from "../services/company.service";
import { validateCompanyForm } from "../app/utils/validation/companyValidation";

export const useCompanySettings = () => {
  const [company, setCompany] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<CompanySettingFormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchCompanyDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CompanyService.getCompanyDetails();
      setCompany(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const updateCompany = async (data: CompanySettingUpdatePayload) => {
    const validationErrors = validateCompanyForm(data);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    try {
      setSaving(true);
      setErrors({});
      
      const updatedCompany = await CompanyService.updateCompanySettings(data);
      setCompany(updatedCompany);
      setHasUnsavedChanges(false);
      
      toast.success("Company settings updated successfully");
      return true;
    } catch (error: any) {
      const backendErrors = error.response?.data?.errors;
      
      if (backendErrors) {
        setErrors(backendErrors);
      } else {
        toast.error(error.response?.data?.message || "Failed to update company settings");
      }
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    company,
    loading,
    saving,
    errors,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    setErrors,
    updateCompany,
    refetch: fetchCompanyDetails,
  };
};