"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import Input from "@/src/components/ui/Input";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import Select from "@/src/components/ui/Select";
import LeadService from "@/src/services/lead.service";
import { UserFormService } from "@/src/services/userForm.service";
import { LeadPayload } from "@/src/types/leads/leads.types";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import React, { JSX, useState, useEffect, FormEvent, ChangeEvent } from "react";
import { GrDocumentUpdate } from "react-icons/gr";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import InformationComponent from "@/src/components/ui/InformationComponent";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { SALES_STATUS } from "@/src/constants/enum";
import { Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NewCustomField {
  tempId: string;
  key: string;
  value: string;
}

const KNOWN_LEAD_KEYS = new Set([
  "fullName",
  "email",
  "phone",
  "priority",
  "source",
  "projectType",
  "status",
  "companyName",
  "city",
  "country",
  "postalCode",
  "language",
  "industry",
  "employeeRole",
  "employeeSeniority",
  "message",
  "membershipNotes",
]);

const REQUIRED_FIELDS = [
  "fullName",
  "email",
  "source",
  "status",
] as const;

const EMPTY_FORM: Record<string, string | number | null> = {
  fullName: "",
  email: "",
  phone: "",
  priority: "",
  source: "",
  projectType: "",
  status: "",
  companyName: "",
  city: "",
  country: null,
  postalCode: null,
  language: null,
  industry: null,
  employeeRole: "",
  employeeSeniority: null,
  message: null,
  membershipNotes: null,
};

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userFormData, setUserFormData] = useState<UserForm[]>([]);
  const [userFormField, setUserFormField] = useState<CustomField[]>([]);
  const [statusData, setStatusData] = useState({ status: SALES_STATUS.NEW });
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [extraFieldKeys, setExtraFieldKeys] = useState<string[]>([]);
  const [newCustomFields, setNewCustomFields] = useState<NewCustomField[]>([]);

  const router = useRouter();
  const { id } = useParams();

  const [flatFormData, setFlatFormData] =
    useState<Record<string, string | number | null>>(EMPTY_FORM);

  const getLeadData = async () => {
    setIsLoading(true);
    try {
      const result = await LeadService.getById(id);
      if (result.status === 200) {
        const data = result.data.data;
        setStatusData({ status: data.status ?? SALES_STATUS.NEW });

        const extra = data.extraFields ?? {};
        setExtraFieldKeys(Object.keys(extra));

        setFlatFormData({
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          priority: data.priority ?? "",
          source: data.source ?? "",
          projectType: data.projectType ?? "",
          status: data.status ?? "",
          companyName: data.companyName ?? "",
          city: data.city ?? "",
          country: data.country ?? null,
          postalCode: data.postalCode ?? null,
          language: data.language ?? null,
          industry: data.industry ?? null,
          employeeRole: data.employeeRole ?? "",
          employeeSeniority: data.employeeSeniority ?? null,
          message: data.message ?? null,
          membershipNotes: data.membershipNotes ?? null,
          ...extra,
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        setUserFormData(result.data.data);
        setUserFormField(result.data.data.selectedFormFields);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<FormElement>) => {
    const { name, value } = e.target;
    setFlatFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: ChangeEvent<FormElement>) => {
    setStatusData({ status: e.target.value as SALES_STATUS });
  };

  useEffect(() => {
    getFormFields();
    getLeadData();
  }, []);

  const handleAddNewField = () => {
    setNewCustomFields((prev) => [
      ...prev,
      { tempId: `new_field_${Date.now()}`, key: "", value: "" },
    ]);
  };

  const handleNewFieldKeyChange = (tempId: string, rawKey: string) => {
    const key = rawKey.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    setNewCustomFields((prev) =>
      prev.map((f) => (f.tempId === tempId ? { ...f, key } : f)),
    );
  };

  const handleNewFieldValueChange = (tempId: string, value: string) => {
    setNewCustomFields((prev) =>
      prev.map((f) => (f.tempId === tempId ? { ...f, value } : f)),
    );
  };

  const handleRemoveNewField = (tempId: string) => {
    setNewCustomFields((prev) => prev.filter((f) => f.tempId !== tempId));
  };

  const buildPayload = (): LeadPayload => {
    const knownFields: Record<string, unknown> = {};
    const extraFields: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(flatFormData)) {
      if (KNOWN_LEAD_KEYS.has(key)) {
        knownFields[key] = value;
      } else {
        extraFields[key] = value;
      }
    }

    for (const field of newCustomFields) {
      if (field.key.trim()) {
        extraFields[field.key.trim()] = field.value;
      }
    }

    return {
      ...(knownFields as unknown as LeadPayload),
      ...(Object.keys(extraFields).length > 0 ? { extraFields } : {}),
    };
  };

  const isMissingRequiredFields = REQUIRED_FIELDS.some(
    (key) => !flatFormData[key],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      if (!id) {
        toast.info("Lead id not found");
        return;
      }

      const payload = buildPayload();
      const result = await LeadService.update(id, payload);

      if (result.status === 200) {
        toast.success(`${flatFormData.fullName} lead updated successfully`);

        setFlatFormData((prev) => {
          const reset: Record<string, string | number | null> = {
            ...EMPTY_FORM,
          };
          for (const key of Object.keys(prev)) {
            if (!KNOWN_LEAD_KEYS.has(key)) {
              reset[key] = "";
            }
          }
          return reset;
        });

        setTimeout(() => {
          router.back();
        }, 2000);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setStatusLoading(true);
    setErr("");

    try {
      if (!id) {
        toast.info("Lead id not found");
        return;
      }

      const result = await LeadService.updateStatus(String(id), statusData);

      if (result.status === 200) {
        toast.success(`status updated to ${statusData.status} successfully`);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  type SelectOption = {
    label: string;
    value: string;
  };

  const SALES_STATUS_OPTIONS: SelectOption[] = Object.values(SALES_STATUS)
    .filter((status) => status !== SALES_STATUS.DELETE)
    .filter((status) => status !== SALES_STATUS.WON)
    .map((status) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: status,
    }));

  const knownFormFieldKeys = new Set(userFormField.map((f) => f.key));
  const orphanExtraKeys = extraFieldKeys.filter(
    (key) => !knownFormFieldKeys.has(key),
  );

  const formatExtraFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  };

  const getExtraFieldType = (value: string | number | null): string => {
    if (typeof value === "number") return "number";
    return "text";
  };

  return (
    <div className={`p-6 `}>
      <div className="flex flex-col w-full gap-6">
        <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-8 p-6 rounded-xl border border-slate-900/10 w-full">
          <div className="flex items-center gap-5 justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
                {t("update_leads")}
              </h2>
              <p className="text-slate-500 dark:text-slate-300">
                {t("you_can_customize_your_fields_if_you_want_then_click_edit")}
              </p>
            </div>

            <PrimaryButton
              text={
                userFormData.length <= 0
                  ? "Create Form Fields"
                  : "Edit Form Fields"
              }
              link="/leads/update-form"
              icon={<GrDocumentUpdate />}
            />
          </div>

          {isMissingRequiredFields && (
            <InformationComponent message="Full Name, Email, Phone, Source, Priority, Project Type and Status fields are mandatory" />
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
            {!isLoading ? (
              userFormField && userFormField.length > 0 ? (
                <>
                  {userFormField.map((item) => {
                    const fieldValue = flatFormData[item.key] ?? "";

                    if (
                      item.type === "text" ||
                      item.type === "email" ||
                      item.type === "number"
                    ) {
                      return (
                        <Input
                          key={item.id}
                          name={item.key}
                          type={item.type}
                          label={item.name}
                          placeholder={item.placeholder ?? ""}
                          value={fieldValue as string}
                          onChange={handleChange}
                          required={item.required}
                        />
                      );
                    }

                    if (item.type === "select") {
                      return (
                        <Select
                          key={item.id}
                          name={item.key}
                          label={item.name}
                          options={item.options ?? []}
                          placeholder={item.placeholder ?? "Select"}
                          value={fieldValue as string}
                          onChange={handleChange}
                          required={item.required}
                        />
                      );
                    }

                    return null;
                  })}

                  {(orphanExtraKeys.length > 0 || newCustomFields.length > 0) && (
                    <>
                      <div className="col-span-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-slate-200 dark:bg-gray-500" />
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-300 whitespace-nowrap">
                            {t("additional_fields")}
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-gray-500" />
                        </div>
                      </div>

                      {orphanExtraKeys.map((key) => {
                        const value = flatFormData[key] ?? "";
                        return (
                          <Input
                            key={key}
                            name={key}
                            type={getExtraFieldType(value as string | number | null)}
                            label={formatExtraFieldLabel(key)}
                            placeholder={`Enter ${formatExtraFieldLabel(key)}`}
                            value={String(value ?? "")}
                            onChange={handleChange}
                            required={false}
                          />
                        );
                      })}

                      {newCustomFields.map((field) => (
                        <div key={field.tempId} className="col-span-1 flex flex-col gap-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t("new_field")}
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder={t("field_name")}
                              value={field.key}
                              onChange={(e) => handleNewFieldKeyChange(field.tempId, e.target.value)}
                              className="w-2/5 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <input
                              type="text"
                              placeholder={t("value")}
                              value={field.value}
                              onChange={(e) => handleNewFieldValueChange(field.tempId, e.target.value)}
                              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveNewField(field.tempId)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={handleAddNewField}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 border border-dashed border-cyan-400 dark:border-cyan-500 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    >
                      <Plus size={16} />
                      {t("add_more_field")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center flex-col justify-center col-span-2 py-5">
                  <Image
                    src={"/images/Cry.gif"}
                    alt={t("cry_img")}
                    height={200}
                    width={200}
                  />
                  <p>{t("no_form_fields_found_please_select")}</p>
                </div>
              )
            ) : (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton
                      height={18}
                      width={100}
                      borderRadius={10}
                      className="animate-pulse"
                    />
                    <Skeleton
                      height={38}
                      width={500}
                      borderRadius={14}
                      className="animate-pulse"
                    />
                  </div>
                ))}
              </>
            )}

            <div className="col-span-2">{err && <ErrorComponent error={err} />}</div>
            <FormButton
              className="col-span-2"
              isLoading={loading}
              disabled={isMissingRequiredFields || loading}
            >
              {t("update_lead")}
            </FormButton>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-8 p-6 rounded-xl border border-slate-900/10 w-full">
          <div className="flex items-center gap-5 justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
                {t("update_status")}
              </h2>
              <p className="text-slate-500 dark:text-slate-300">
                {t("update_leads_status")}
              </p>
            </div>
          </div>
          <form
            onSubmit={handleStatusSubmit}
            className="grid grid-cols-1 gap-8"
          >
            <Select
              name="sales"
              label={t("lead_status")}
              options={SALES_STATUS_OPTIONS}
              placeholder={t("select_status_type")}
              value={statusData.status}
              onChange={handleStatusChange}
              required={true}
            />
            {err && <ErrorComponent error={err} />}

            <FormButton
              isLoading={statusLoading}
              disabled={statusLoading || !statusData.status}
            >
              {t("update_status")}
            </FormButton>
          </form>
        </div>
      </div>
    </div>
  );
};

export default page;