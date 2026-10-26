"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import axios from "axios";
import { DEAL_STAGES, DEAL_TYPE, PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import dealService from "@/src/services/deal.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import { getCompanyCurrency } from "@/src/app/utils/currency.utils";
import { UserFormService } from "@/src/services/userForm.service";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";

const CreateDealPage = () => {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [dealName, setDealName] = useState("");
  const [dealStage, setDealStage] = useState<DEAL_STAGES>(DEAL_STAGES.QUALIFICATION);
  const [dealType, setDealType] = useState<DEAL_TYPE>(DEAL_TYPE.NEW_BUSINESS);
  const [createDate, setCreateDate] = useState(new Date().toISOString().slice(0, 10));
  const [closeDate, setCloseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [dealDescription, setDealDescription] = useState("");
  const [error, setError] = useState<string | string[]>("");
  const [saving, setSaving] = useState(false);
  const [extraFields, setExtraFields] = useState<CustomField[]>([]);
  const [extraValues, setExtraValues] = useState<Record<string, string | number | boolean | null>>({});

  useEffect(() => {
    UserFormService.getAllDeal().then((response) => {
      const form = response.data?.data as UserForm;
      setExtraFields((form.selectedFormFields ?? []).filter((field) => {
        const normalizedKey = field.key.toLowerCase().replace(/[\s_-]/g, "");
        const normalizedName = field.name.toLowerCase().replace(/[\s_-]/g, "");
        return normalizedKey !== "dealpipeline" && normalizedName !== "dealpipeline" &&
          !["dealName", "amount", "dealStage", "dealType", "createDate", "closeDate", "dealDescription"].includes(field.key);
      }));
    }).catch(() => setExtraFields([]));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!hasPermission(PERMISSIONS.createDeal)) {
      toast.error("You do not have permission to create deals");
      return;
    }
    setSaving(true);
    try {
      const result = await dealService.create({
        dealName: dealName.trim(),
        dealStage,
        dealType,
        dealOwner: null,
        createDate,
        closeDate: closeDate || null,
        amount: Number(amount),
        dealDescription: dealDescription.trim() || null,
        ...(Object.keys(extraValues).length > 0 ? { extraFields: extraValues } : {}),
      });
      if (result.status === 201) {
        toast.success("Deal created successfully");
        router.push("/deals");
      }
    } catch (caught) {
      const message = axios.isAxiosError(caught)
        ? extractErrorMessages(caught)
        : "Unable to create deal";
      setError(message);
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-200";

  if (!hasPermission(PERMISSIONS.createDeal)) {
    return <div className="p-8 text-center text-slate-600 dark:text-gray-300">You do not have permission to create deals.</div>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Deal</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Add a deal directly without linking it to a lead.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leads/update-form?module=deal" className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300">{extraFields.length ? "Edit Form Fields" : "Create Form Fields"}</Link>
          <Link href="/deals" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Back to deals</Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <ErrorComponent error={error} />
        <section>
          <h2 className="mb-5 border-b border-slate-100 pb-3 text-lg font-semibold text-slate-800 dark:border-gray-700 dark:text-white">Deal details</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="dealName">Deal name <span className="text-rose-500">*</span></label>
              <input id="dealName" className={inputClass} minLength={4} maxLength={120} required value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="e.g. Acme CRM subscription" />
            </div>
            <div>
              <label className={labelClass} htmlFor="amount">Amount ({getCompanyCurrency()}) <span className="text-rose-500">*</span></label>
              <input id="amount" className={inputClass} type="number" min="1" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter deal amount" />
            </div>
            <div>
              <label className={labelClass} htmlFor="dealStage">Deal stage <span className="text-rose-500">*</span></label>
              <select id="dealStage" className={inputClass} value={dealStage} onChange={(event) => setDealStage(event.target.value as DEAL_STAGES)}>
                {[DEAL_STAGES.QUALIFICATION, DEAL_STAGES.REQUIREMENT_ANALYSIS, DEAL_STAGES.PROPOSAL, DEAL_STAGES.NEGOTIATION, DEAL_STAGES.WON, DEAL_STAGES.LOST].map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="dealType">Deal type <span className="text-rose-500">*</span></label>
              <select id="dealType" className={inputClass} value={dealType} onChange={(event) => setDealType(event.target.value as DEAL_TYPE)}>
                {Object.values(DEAL_TYPE).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="createDate">Created date <span className="text-rose-500">*</span></label>
              <input id="createDate" className={inputClass} type="date" required value={createDate} onChange={(event) => setCreateDate(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="closeDate">Close date</label>
              <input id="closeDate" className={inputClass} type="date" min={createDate} value={closeDate} onChange={(event) => setCloseDate(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="dealDescription">Description</label>
              <textarea id="dealDescription" className={inputClass} rows={4} maxLength={2000} value={dealDescription} onChange={(event) => setDealDescription(event.target.value)} placeholder="Optional context for this deal" />
            </div>
          </div>
        </section>
        {extraFields.length > 0 && <section>
          <h2 className="mb-5 border-b border-slate-100 pb-3 text-lg font-semibold text-slate-800 dark:border-gray-700 dark:text-white">Additional fields</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {extraFields.map((field) => <div key={field.id}>
              <label className={labelClass} htmlFor={`extra-${field.key}`}>{field.name}{field.required && <span className="text-rose-500"> *</span>}</label>
              {field.type === "select" ? <select id={`extra-${field.key}`} required={field.required} className={inputClass} value={String(extraValues[field.key] ?? "")} onChange={(event) => setExtraValues((previous) => ({ ...previous, [field.key]: event.target.value }))}>
                <option value="">{field.placeholder || "Select an option"}</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select> : field.type === "checkbox" ? <input id={`extra-${field.key}`} type="checkbox" checked={Boolean(extraValues[field.key])} onChange={(event) => setExtraValues((previous) => ({ ...previous, [field.key]: event.target.checked }))} /> : field.type === "textarea" ? <textarea id={`extra-${field.key}`} required={field.required} className={inputClass} rows={3} placeholder={field.placeholder} value={String(extraValues[field.key] ?? "")} onChange={(event) => setExtraValues((previous) => ({ ...previous, [field.key]: event.target.value }))} /> : <input id={`extra-${field.key}`} required={field.required} type={field.type === "phone" ? "tel" : field.type} className={inputClass} placeholder={field.placeholder} value={String(extraValues[field.key] ?? "")} onChange={(event) => setExtraValues((previous) => ({ ...previous, [field.key]: field.type === "number" ? (event.target.value ? Number(event.target.value) : null) : event.target.value }))} />}
            </div>)}
          </div>
        </section>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-gray-700">
          <Link href="/deals" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 dark:border-gray-600 dark:text-gray-200">Cancel</Link>
          <button type="submit" disabled={saving} className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Creating…" : "Create Deal"}</button>
        </div>
      </form>
    </main>
  );
};

export default CreateDealPage;
