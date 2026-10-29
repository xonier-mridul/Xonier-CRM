import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { CompanySetting, CompanySettingFormErrors, CompanySettingUpdatePayload } from "../types/companySetting/company.types";
import CompanyService from "../services/company.service";
import { validateCompanyForm } from "../app/utils/validation/companyValidation";
import { isAxiosError } from "axios";

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback;

  const responseData = error.response?.data;
  if (typeof responseData?.message === "string") return responseData.message;
  if (typeof responseData?.detail === "string") return responseData.detail;
  if (Array.isArray(responseData?.detail)) {
    return responseData.detail
      .map((item: { loc?: (string | number)[]; msg?: string }) => {
        const field = item.loc?.at(-1);
        return `${field ? `${String(field)}: ` : ""}${item.msg || "Invalid value"}`;
      })
      .join("; ");
  }
  return fallback;
};

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
    } catch (error: unknown) {
      toast.error(getRequestErrorMessage(error, "Failed to load company details"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Start the asynchronous settings request when the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (error: unknown) {
      toast.error(getRequestErrorMessage(error, "Failed to update company settings"));
      
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
