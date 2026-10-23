"use client";

import { useId, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Check, Copy, Hash, Loader2, RefreshCw, Save } from "lucide-react";
import axios from "axios";
import CompanyService from "@/src/services/company.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { RootState, store } from "@/src/store";
import { setAuthState } from "@/src/store/slices/authSlice";

const CODE_PATTERN = /^[A-Z]{3}-[0-9]{4}$/;

interface Props {
  companyObjectId: string;
  companyCode: string;
  onSaved: (code: string) => void;
}

export default function CompanyCodeEditor({ companyObjectId, companyCode, onSaved }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const user = useSelector((state: RootState) => state.auth.user);
  const tenant = user?.companyId;
  const tenantId = typeof tenant === "object" && tenant ? tenant.id : tenant;
  const roles = user?.userRole.map(role => role.code) ?? [];
  const canEdit = roles.includes("SUPER_ADMIN") || (roles.includes("COMPANY_ADMIN") && tenantId === companyObjectId);
  const [draftState, setDraftState] = useState({ source: companyCode, value: CODE_PATTERN.test(companyCode) ? companyCode : "" });
  const draft = draftState.source === companyCode ? draftState.value : CODE_PATTERN.test(companyCode) ? companyCode : "";
  const setDraft = (value: string) => setDraftState({ source: companyCode, value });
  const [pending, setPending] = useState<"suggest" | "save" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");

  const reportError = (cause: unknown) => {
    const message = axios.isAxiosError(cause) ? extractErrorMessages(cause) : t("company_code_editor.failed");
    setError(Array.isArray(message) ? message.join(" ") : message);
  };

  const suggest = async () => {
    setPending("suggest"); setError(""); setSaved(false);
    try {
      const response = await CompanyService.suggestCode(companyObjectId);
      setDraft(response.data.data.companyId);
    } catch (cause) { reportError(cause); }
    finally { setPending(null); }
  };

  const save = async () => {
    if (!CODE_PATTERN.test(draft) || draft === companyCode || pending) return;
    setPending("save"); setError(""); setSaved(false);
    try {
      const response = await CompanyService.updateCode(companyObjectId, draft);
      const code: string = response.data.data.companyId;
      onSaved(code);
      // Refresh only our own company in the cached profile. Editing a tenant as
      // Super Admin must not change that admin's remembered login company.
      const activeUser = store.getState().auth.user;
      const activeTenant = activeUser?.companyId;
      const activeTenantId = typeof activeTenant === "object" && activeTenant ? activeTenant.id : activeTenant;
      if (activeUser && activeTenantId === companyObjectId) {
        const updatedUser = typeof activeTenant === "object" && activeTenant
          ? { ...activeUser, companyId: { ...activeTenant, companyId: code } } : activeUser;
        store.dispatch(setAuthState(updatedUser));
        try {
          localStorage.setItem("companyId", code);
          localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        } catch { /* Storage is optional; the team must use the newly saved ID. */ }
      }
      setSaved(true);
    } catch (cause) { reportError(cause); }
    finally { setPending(null); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(companyCode); setCopied(companyCode); }
    catch { setError(t("company_code_editor.copy_failed")); }
  };

  return (
    <section className="mb-6 rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-800 sm:p-6" aria-labelledby={`${inputId}-title`}>
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><Hash size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 id={`${inputId}-title`} className="font-semibold text-slate-900 dark:text-white">{t("company_code_editor.title")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("company_code_editor.description")}</p>
          <div className="mt-3 flex items-start gap-2">
            <span className="break-all font-mono font-semibold tracking-wider text-slate-900 dark:text-white">{companyCode || "—"}</span>
            {companyCode && <button type="button" onClick={copy} title={t("company_code_editor.copy")} aria-label={t("company_code_editor.copy")} className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700">
              {copied === companyCode ? <Check size={16} /> : <Copy size={16} />}
            </button>}
          </div>
        </div>
      </div>
      {canEdit && <div className="mt-5 border-t border-slate-100 pt-5 dark:border-gray-700">
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("company_code_editor.new_id")}</label>
        <div className="flex flex-wrap gap-2">
          <input id={inputId} value={draft} onChange={event => { setDraft(event.target.value.toUpperCase()); setSaved(false); setError(""); }}
            placeholder="XON-1234" maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            disabled={!!pending} aria-describedby={`${inputId}-help`} aria-invalid={!!error || (!!draft && !CODE_PATTERN.test(draft))}
            className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono tracking-widest text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <button type="button" onClick={suggest} disabled={!!pending} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-gray-600 dark:text-slate-200">
            {pending === "suggest" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}{t("company_code_editor.generate")}
          </button>
          <button type="button" onClick={save} disabled={!!pending || !CODE_PATTERN.test(draft) || draft === companyCode} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
            {pending === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{t("company_code_editor.save")}
          </button>
        </div>
        <p id={`${inputId}-help`} className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("company_code_editor.format")}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t("company_code_editor.safety")}</p>
      </div>}
      <div aria-live="polite" className="mt-2 text-sm">
        {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
        {saved && <p className="text-emerald-700 dark:text-emerald-400">{t("company_code_editor.saved")}</p>}
      </div>
    </section>
  );
}
