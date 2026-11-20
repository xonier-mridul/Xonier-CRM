"use client";
import { useDealStages } from "@/src/hooks/useLeadStatuses";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import axios from "axios";
import { DEAL_STAGES, DEAL_TYPE, FORECAST_CATEGORY, PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import dealService from "@/src/services/deal.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { UserFormService } from "@/src/services/userForm.service";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import CommercialEntitySelectors from "@/src/components/common/CommercialEntitySelectors";

const addDays = (isoDate: string, days: number): string => {
  const base = isoDate ? new Date(`${isoDate}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const endOfMonth = (isoDate: string, monthOffset = 0): string => {
  const base = isoDate ? new Date(`${isoDate}T00:00:00Z`) : new Date();
  const target = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1 + monthOffset, 0));
  return target.toISOString().slice(0, 10);
};

const CreateDealPage = () => {
  const { statuses: stages, error: stageError } = useDealStages();
  const currency = useCompanyCurrency();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const [dealName, setDealName] = useState("");
  const [dealStage, setDealStage] = useState<string>(DEAL_STAGES.QUALIFICATION);
  const [dealType, setDealType] = useState<DEAL_TYPE>(DEAL_TYPE.NEW_BUSINESS);
  const [createDate, setCreateDate] = useState(today);
  const [closeDate, setCloseDate] = useState(() => addDays(today, 30));
  const [amount, setAmount] = useState("");
  const [dealProbability, setDealProbability] = useState("");
  const [forecastProbability, setForecastProbability] = useState("");
  const [forecastCategory, setForecastCategory] = useState<FORECAST_CATEGORY>(FORECAST_CATEGORY.PIPELINE);
  const [dealDescription, setDealDescription] = useState("");
  const [closedWonReason, setClosedWonReason] = useState("");
  const [closedLostReason, setClosedLostReason] = useState("");
  const [error, setError] = useState<string | string[]>("");
  const [saving, setSaving] = useState(false);
  const [extraFields, setExtraFields] = useState<CustomField[]>([]);
  const [extraValues, setExtraValues] = useState<Record<string, string | number | boolean | null>>({});
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  useEffect(() => {
    UserFormService.getAllDeal().then((response) => {
      const form = response.data?.data as UserForm;
      setExtraFields((form.selectedFormFields ?? []).filter((field) => {
        const normalizedKey = field.key.toLowerCase().replace(/[\s_-]/g, "");
        const normalizedName = field.name.toLowerCase().replace(/[\s_-]/g, "");
        return normalizedKey !== "dealpipeline" && normalizedName !== "dealpipeline" &&
          !["dealName", "amount", "dealStage", "dealType", "createDate", "closeDate", "dealDescription", "dealProbability", "forecastProbability", "forecastCategory"].includes(field.key);
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
    if (!stages.some(stage => stage.key === dealStage)) return setError(stageError || "Select a configured deal stage.");
    const isWon = ([DEAL_STAGES.WON, DEAL_STAGES.CLOSED_WON] as string[]).includes(dealStage);
    const isLost = dealStage === DEAL_STAGES.LOST;
    if (!closeDate) return setError("Expected close date is required");
    if (isWon && !closedWonReason.trim()) return setError("Won reason is required");
    if (isLost && !closedLostReason.trim()) return setError("Lost reason is required");
    setSaving(true);
    try {
      const result = await dealService.create({
        organizationId,
        personId,
        dealName: dealName.trim(),
        dealStage,
        dealType,
        dealOwner: null,
        createDate,
        closeDate,
        amount: Number(amount),
        dealProbability: dealProbability === "" ? null : Math.max(0, Math.min(100, Number(dealProbability))),
        forecastProbability: forecastProbability === "" ? null : Math.max(0, Math.min(100, Number(forecastProbability))),
        forecastCategory,
        dealDescription: dealDescription.trim() || null,
        closedWonReason: closedWonReason.trim() || null,
        closedLostReason: closedLostReason.trim() || null,
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
          <div className="mb-6">
            <CommercialEntitySelectors
              organizationId={organizationId}
              personId={personId}
              onOrganizationChange={(orgId) => setOrganizationId(orgId)}
              onPersonChange={(persId) => setPersonId(persId)}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="dealName">Deal name <span className="text-rose-500">*</span></label>
              <input id="dealName" className={inputClass} minLength={4} maxLength={120} required value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="e.g. Acme CRM subscription" />
            </div>
            <div>
              <label className={labelClass} htmlFor="amount">Amount ({currency}) <span className="text-rose-500">*</span></label>
              <input id="amount" className={inputClass} type="number" min="1" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter deal amount" />
            </div>
            <div>
              <label className={labelClass} htmlFor="dealStage">Deal stage <span className="text-rose-500">*</span></label>
              <select
                id="dealStage"
                className={inputClass}
                value={dealStage}
                onChange={(event) => {
                  const nextStage = event.target.value;
                  setDealStage(nextStage);
                  if (([DEAL_STAGES.WON, DEAL_STAGES.CLOSED_WON, DEAL_STAGES.LOST] as string[]).includes(nextStage)) {
                    setForecastCategory(FORECAST_CATEGORY.CLOSED);
                  } else if (forecastCategory === FORECAST_CATEGORY.CLOSED) {
                    setForecastCategory(FORECAST_CATEGORY.PIPELINE);
                  }
                }}
              >
                {stages.map(stage => <option key={stage.key} value={stage.key}>{stage.name}{stage.probability != null ? ` (${stage.probability}%)` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="dealProbability">Deal probability (%)</label>
              <input
                id="dealProbability"
                className={inputClass}
                type="number"
                min="0"
                max="100"
                step="1"
                value={dealProbability}
                onChange={(event) => setDealProbability(event.target.value)}
                placeholder={(() => {
                  const stageProb = stages.find(stage => stage.key === dealStage)?.probability;
                  return stageProb != null ? `Stage default (${stageProb}%)` : "0 - 100";
                })()}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="forecastProbability">Forecast probability (%)</label>
              <input
                id="forecastProbability"
                className={inputClass}
                type="number"
                min="0"
                max="100"
                step="1"
                value={forecastProbability}
                onChange={(event) => setForecastProbability(event.target.value)}
                placeholder="Optional override for forecast"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="forecastCategory">Forecast category</label>
              <select
                id="forecastCategory"
                className={inputClass}
                value={forecastCategory}
                onChange={(event) => setForecastCategory(event.target.value as FORECAST_CATEGORY)}
              >
                {Object.values(FORECAST_CATEGORY).map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())}
                  </option>
                ))}
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
              <label className={labelClass} htmlFor="closeDate">Expected close date <span className="text-rose-500">*</span></label>
              <input id="closeDate" className={inputClass} type="date" min={createDate} required value={closeDate} onChange={(event) => setCloseDate(event.target.value)} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: "+15 days", value: addDays(createDate, 15) },
                  { label: "+30 days", value: addDays(createDate, 30) },
                  { label: "End of month", value: endOfMonth(createDate, 0) },
                  { label: "Next month", value: endOfMonth(createDate, 1) },
                ].filter((preset) => preset.value >= createDate).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCloseDate(preset.value)}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                      closeDate === preset.value
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {([DEAL_STAGES.WON, DEAL_STAGES.CLOSED_WON] as string[]).includes(dealStage) && <div className="md:col-span-2"><label className={labelClass} htmlFor="closedWonReason">Won reason <span className="text-rose-500">*</span></label><input id="closedWonReason" className={inputClass} required value={closedWonReason} onChange={(event) => setClosedWonReason(event.target.value)} placeholder="Why did we win this deal?" /></div>}
            {dealStage === DEAL_STAGES.LOST && <div className="md:col-span-2"><label className={labelClass} htmlFor="closedLostReason">Lost reason <span className="text-rose-500">*</span></label><input id="closedLostReason" className={inputClass} required value={closedLostReason} onChange={(event) => setClosedLostReason(event.target.value)} placeholder="Why was this deal lost?" /></div>}
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
