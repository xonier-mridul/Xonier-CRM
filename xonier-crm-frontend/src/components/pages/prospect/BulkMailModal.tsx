"use client";

import { useEffect, useState } from "react";
import {
  MdEmail,
  MdCheckCircle,
  MdArrowForward,
  MdDescription,
  MdSettings,
  MdVisibility,
  MdEdit,
} from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Prospect } from "@/src/types/prospect/prospect.type";
import { toast } from "react-toastify";
import RichEditor from "@/src/components/pages/prospect/RichEditor";
import MailService from "@/src/services/communication/mail.service";
import { Template } from "@/src/types/communication/mail.types";
import { useTranslation } from "react-i18next";

// ── Helpers ────────────────────────────────────────────────────────────────

const buildBulkMailPayload = (
  templateId: string,
  leads: Prospect[],
  variableConfig: VariableConfig,
  systemVariables: Record<string, string>,
  getLeadFieldValue: (lead: any, path: string) => string
) => {
  const commonVariables: Record<string, string> = { ...systemVariables };
  const differentModeVars: string[] = [];
  const predefinedModeVars: Array<{ name: string; fieldMapping: string }> = [];

  Object.entries(variableConfig).forEach(([varName, config]) => {
    if (config.mode === "common") commonVariables[varName] = config.commonValue || "";
    else if (config.mode === "different") differentModeVars.push(varName);
    else if (config.mode === "predefined")
      predefinedModeVars.push({ name: varName, fieldMapping: config.fieldMapping || "" });
  });

  const recipients = leads.map((lead) => {
    const recipientVariables: Record<string, string> = {};
    differentModeVars.forEach((v) => {
      recipientVariables[v] = variableConfig[v].perLeadValues?.[lead.id] || "";
    });
    predefinedModeVars.forEach(({ name, fieldMapping }) => {
      recipientVariables[name] = getLeadFieldValue(lead, fieldMapping);
    });
    return { email: lead.email, variables: recipientVariables };
  });

  return { template_id: templateId, variables: commonVariables, recipients, cc_emails: [], bcc_emails: [] };
};

const getAllTemplates = async () => {
  try {
    const result = await MailService.getAllTemplates(1, 50, "");
    if (result?.status === 200 && result?.data?.data) {
      const data = result.data.data.data;
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch {
    return [];
  }
};

const CONSTANT_VARS: Record<string, string> = {};

const replaceVariables = (template: string, variables: Record<string, string>) => {
  let result = template;
  Object.keys(variables).forEach((key) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), variables[key] || "");
  });
  return result;
};

const extractVariables = (template: string): string[] => {
  const matches = template.match(/{{(\w+)}}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/{{|}}/g, "")))];
};

// ── Types ──────────────────────────────────────────────────────────────────

type VariableMode = "common" | "different" | "predefined";

interface VariableSettings {
  mode: VariableMode;
  commonValue?: string;
  fieldMapping?: string;
  perLeadValues?: Record<string, string>;
}

interface VariableConfig {
  [variableName: string]: VariableSettings;
}

// ── Shared input classes ───────────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-emerald-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500 transition";

const selectCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-emerald-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed";

// ── Component ──────────────────────────────────────────────────────────────

const BulkMailModal = ({ leads, onClose }: { leads: Prospect[]; onClose: () => void }) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [mailText, setMailText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [variableConfig, setVariableConfig] = useState<VariableConfig>({});

  const [activeTab, setActiveTab] = useState<"template" | "variables" | "preview">("template");

  // ── Effects ──

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingTemplates(true);
        const result = await getAllTemplates();
        setTemplates(Array.isArray(result) ? result : []);
      } catch {
        toast.error("Failed to load templates");
      } finally {
        setIsLoadingTemplates(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    const allVars = [
      ...new Set([
        ...extractVariables(selectedTemplate.subject || ""),
        ...extractVariables(selectedTemplate.html_body || ""),
      ]),
    ];
    setExtractedVariables(allVars);
    const cfg: VariableConfig = {};
    allVars.forEach((v) => { cfg[v] = { mode: "common", commonValue: "", perLeadValues: {} }; });
    setVariableConfig(cfg);
  }, [selectedTemplate]);

  // ── Handlers ──

  const handleTemplateSelect = (id: string) => {
    const t = templates.find((t) => t.id === id);
    if (t) { setSelectedTemplate(t); setSubject(t.subject || ""); setMailText(t.html_body || ""); }
  };

  const handleVariableModeChange = (varName: string, newMode: VariableMode) =>
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: { mode: newMode, commonValue: "", fieldMapping: "", perLeadValues: {} },
    }));

  const handleCommonValueChange = (varName: string, value: string) =>
    setVariableConfig((prev) => ({ ...prev, [varName]: { ...prev[varName], commonValue: value } }));

  const handleFieldMappingChange = (varName: string, fieldPath: string) =>
    setVariableConfig((prev) => ({ ...prev, [varName]: { ...prev[varName], fieldMapping: fieldPath } }));

  const handlePerLeadValueChange = (varName: string, leadId: string, value: string) =>
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: { ...prev[varName], perLeadValues: { ...prev[varName].perLeadValues, [leadId]: value } },
    }));

  const getLeadFieldValue = (lead: any, path: string): string => {
    const keys = path.replace("lead.", "").split(".");
    let val = lead;
    for (const k of keys) val = val?.[k];
    return val || "";
  };

  const getLeadFields = () => {
    if (!leads.length) return [];
    return (Object.keys(leads[0]) as (keyof Prospect)[])
      .filter((k) => typeof leads[0][k] === "string")
      .map((field) => ({ name: field, value: `lead.${field}` }));
  };

  const getUniqueFieldValues = (fieldPath: string) =>
    [...new Set(leads.map((l) => getLeadFieldValue(l, fieldPath)).filter(Boolean))];

  const leadFields = getLeadFields();

  const isVariablesComplete = () =>
    extractedVariables.every((varName) => {
      const c = variableConfig[varName];
      if (!c) return false;
      if (c.mode === "common") return !!c.commonValue?.trim();
      if (c.mode === "predefined") return !!c.fieldMapping;
      if (c.mode === "different") return leads.every((l) => !!c.perLeadValues?.[l.id]?.trim());
      return false;
    });

  // ── Send ──

  const handleSend = async () => {
    if (!subject.trim() || !mailText.trim()) { toast.warning("Please fill in subject and message"); return; }
    if (extractedVariables.length > 0 && !isVariablesComplete()) { toast.warning("Please configure all variables"); return; }

    setIsSending(true);
    try {
      const payload = buildBulkMailPayload(
        selectedTemplate?.id || "", leads, variableConfig, CONSTANT_VARS, getLeadFieldValue
      );
      const response = await MailService.bulkMail(payload);
      const result = response.data;
      if (result?.success) {
        const s = result?.data?.success_count || 0;
        const f = result?.data?.failed_count || 0;
        setSent(true);
        if (f === 0) toast.success(`All ${s} emails sent successfully`);
        else if (s > 0) toast.warning(`${s} sent, ${f} failed`);
        else toast.error("All emails failed to send");
        setTimeout(onClose, 1500);
      } else {
        toast.error(result?.message || "Failed to send emails");
      }
    } catch {
      toast.error("Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  // ── Render ──

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-emerald-100 dark:ring-slate-700 w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-800 border-b border-emerald-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <MdEmail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {t("bulk_email_campaign")}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {leads.length} {t("recipient")}{leads.length !== 1 ? "s" : ""}
                {extractedVariables.length > 0 &&
                  ` · ${extractedVariables.length} variable${extractedVariables.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tab Nav ── */}
        {selectedTemplate && (
          <div className="flex border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 shrink-0">
            {(
              [
                { key: "template", icon: <MdDescription className="w-3.5 h-3.5" />, label: "Template" },
                ...(extractedVariables.length > 0
                  ? [{ key: "variables", icon: <MdSettings className="w-3.5 h-3.5" />, label: `Variables (${extractedVariables.length})` }]
                  : []),
                { key: "preview", icon: <MdVisibility className="w-3.5 h-3.5" />, label: "Preview" },
              ] as { key: "template" | "variables" | "preview"; icon: React.ReactNode; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-slate-900">

          {/* TEMPLATE TAB */}
          {activeTab === "template" && (
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  {t("email_template")}
                </label>
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  disabled={isLoadingTemplates}
                  className={selectCls}
                >
                  <option value="">
                    {isLoadingTemplates ? "Loading templates…" : "Choose a template…"}
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {!isLoadingTemplates && templates.length === 0 && (
                    <option disabled>{t("no_templates_available")}</option>
                  )}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  {extractedVariables.length === 0 && (
                    <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
                      <MdCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-800 dark:text-emerald-300">
                        {t("no_variables_found_in_this_template")}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <MdEmail className="w-3.5 h-3.5" /> {t("subject")}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      disabled
                      className={`${inputCls} cursor-not-allowed opacity-70`}
                      placeholder={t("email_subject_2")}
                    />
                    {extractedVariables.length > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1.5 font-medium">
                        {t("variables_2")} {extractedVariables.map((v) => `{{${v}}}`).join(", ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <MdEdit className="w-3.5 h-3.5" /> {t("message_content")}
                    </label>
                    <div className="rounded-xl overflow-hidden border border-emerald-100 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <RichEditor value={mailText} onChange={setMailText} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VARIABLES TAB */}
          {activeTab === "variables" && extractedVariables.length > 0 && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
                <MdSettings className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  {t("configure_how_each_template_variable_gets")}
                </p>
              </div>

              <div className="space-y-4">
                {extractedVariables.map((varName) => {
  const { t } = useTranslation();
                  const config = variableConfig[varName] || { mode: "common" };
                  const isDone =
                    (config.mode === "common" && !!config.commonValue?.trim()) ||
                    (config.mode === "predefined" && !!config.fieldMapping) ||
                    (config.mode === "different" && leads.every((l) => !!config.perLeadValues?.[l.id]?.trim()));

                  return (
                    <div
                      key={varName}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
                    >
                      {/* Variable header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/80">
                        <code className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-mono">
                          {`{{${varName}}}`}
                        </code>
                        {isDone && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <MdCheckCircle className="w-3.5 h-3.5" /> {t("configured")}
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Mode buttons */}
                        <div className="flex gap-2">
                          {/* Common */}
                          <button
                            type="button"
                            onClick={() => handleVariableModeChange(varName, "common")}
                            className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                              config.mode === "common"
                                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                                : "border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-emerald-200 dark:hover:border-slate-500"
                            }`}
                          >
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{t("common")}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t("same_for_all")}</p>
                          </button>
                          {/* Different */}
                          <button
                            type="button"
                            onClick={() => handleVariableModeChange(varName, "different")}
                            className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                              config.mode === "different"
                                ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-600"
                                : "border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-emerald-200 dark:hover:border-slate-500"
                            }`}
                          >
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{t("different")}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t("per_lead")}</p>
                          </button>
                          {/* Predefined */}
                          <button
                            type="button"
                            onClick={() => handleVariableModeChange(varName, "predefined")}
                            className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                              config.mode === "predefined"
                                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600"
                                : "border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-emerald-200 dark:hover:border-slate-500"
                            }`}
                          >
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{t("predefined")}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t("from_lead_data")}</p>
                          </button>
                        </div>

                        {/* Common input */}
                        {config.mode === "common" && (
                          <input
                            type="text"
                            placeholder={`Value for ${varName}`}
                            value={config.commonValue || ""}
                            onChange={(e) => handleCommonValueChange(varName, e.target.value)}
                            className={inputCls}
                          />
                        )}

                        {/* Different inputs */}
                        {config.mode === "different" && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {leads.map((lead) => (
                              <div key={lead.id} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[100px] truncate font-medium">
                                  {lead.fullName || lead.email}
                                </span>
                                <input
                                  type="text"
                                  placeholder={varName}
                                  value={config.perLeadValues?.[lead.id] || ""}
                                  onChange={(e) => handlePerLeadValueChange(varName, lead.id, e.target.value)}
                                  className={`${inputCls} flex-1 focus:ring-violet-300 dark:focus:ring-violet-500`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Predefined select */}
                        {config.mode === "predefined" && (
                          <div className="space-y-3">
                            <select
                              value={config.fieldMapping || ""}
                              onChange={(e) => handleFieldMappingChange(varName, e.target.value)}
                              className={`${selectCls} focus:ring-amber-300 dark:focus:ring-amber-500`}
                            >
                              <option value="">{t("select_a_field")}</option>
                              {leadFields.map((field) => {
                                const sample = getLeadFieldValue(leads[0], field.value);
                                return (
                                  <option key={field.value} value={field.value}>
                                    {field.name}{sample ? ` (e.g. "${sample}")` : ""}
                                  </option>
                                );
                              })}
                            </select>

                            {config.fieldMapping && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                                  {t("sample_values")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {getUniqueFieldValues(config.fieldMapping).map((val, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 bg-white dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 rounded-full border border-amber-200 dark:border-amber-700">
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PREVIEW TAB */}
          {activeTab === "preview" && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
                <MdVisibility className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  {t("preview_how_the_email_renders_per")}
                </p>
              </div>

              <div className="space-y-4">
                {leads.map((lead) => {
  const { t } = useTranslation();
                  const variables: Record<string, string> = { ...CONSTANT_VARS };
                  extractedVariables.forEach((varName) => {
                    const c = variableConfig[varName];
                    if (c.mode === "common") variables[varName] = c.commonValue || "";
                    else if (c.mode === "predefined") variables[varName] = getLeadFieldValue(lead, c.fieldMapping || "");
                    else if (c.mode === "different") variables[varName] = c.perLeadValues?.[lead.id] || "";
                  });

                  return (
                    <div key={lead.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50/60 dark:bg-slate-800 border-b border-emerald-100 dark:border-slate-700">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {(lead.fullName || lead.email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{lead.fullName || lead.email}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{lead.email}</p>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("subject")}</p>
                          <p className="text-sm bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-800 dark:text-white">
                            {replaceVariables(subject, variables) || "(empty)"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("message")}</p>
                          <div
                            className="text-sm bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-lg px-3 py-3 text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: replaceVariables(mailText, variables) || "(empty)" }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {leads.length} {t("recipient")}{leads.length !== 1 ? "s" : ""} {t("selected_2")}
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSending || sent}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("cancel")}
            </button>

            {/* Direct send when no variables */}
            {extractedVariables.length === 0 && activeTab === "template" && (
              <SendButton
                onClick={handleSend}
                disabled={isSending || sent || !selectedTemplate}
                isSending={isSending}
                sent={sent}
                count={leads.length}
              />
            )}

            {/* Variables flow */}
            {extractedVariables.length > 0 && (
              <>
                {activeTab === "variables" && (
                  <button
                    onClick={() => setActiveTab("preview")}
                    disabled={!isVariablesComplete() || isSending || sent}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("preview_2")} <MdArrowForward className="w-4 h-4" />
                  </button>
                )}
                {activeTab === "preview" && (
                  <SendButton
                    onClick={handleSend}
                    disabled={isSending || sent || !selectedTemplate}
                    isSending={isSending}
                    sent={sent}
                    count={leads.length}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Send Button ────────────────────────────────────────────────────────────

const SendButton = ({
  onClick,
  disabled,
  isSending,
  sent,
  count,
}: {
  onClick: () => void;
  disabled: boolean;
  isSending: boolean;
  sent: boolean;
  count: number;
}) => {
  const { t } = useTranslation();
  return (
    (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5 transition shadow-sm shadow-emerald-200 dark:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {isSending ? (
      <><AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" /> {t("sending")}</>
    ) : sent ? (
      <><MdCheckCircle className="w-4 h-4" /> {t("sent_2")}</>
    ) : (
      `Send to ${count} lead${count !== 1 ? "s" : ""}`
    )}
  </button>
)
  );
};

export default BulkMailModal;