"use client";

import { useEffect, useState } from "react";
import { MdEmail, MdCheckCircle, MdArrowForward, MdDescription, MdSettings, MdVisibility, MdEdit } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Prospect } from "@/src/types/prospect/prospect.type";
import { toast } from "react-toastify";
import RichEditor from "@/src/components/pages/prospect/RichEditor";
import MailService from "@/src/services/communication/mail.service";
import { Template } from "@/src/types/communication/mail.types";

// 🔹 Build bulk mail payload for backend
const buildBulkMailPayload = (
  templateId: string,
  leads: Prospect[],
  variableConfig: VariableConfig,
  systemVariables: Record<string, string>,
  getLeadFieldValue: (lead: any, path: string) => string
) => {
  // Separate variables by mode
  const commonVariables: Record<string, string> = { ...systemVariables };
  const differentModeVars: string[] = [];
  const predefinedModeVars: Array<{ name: string; fieldMapping: string }> = [];

  Object.entries(variableConfig).forEach(([varName, config]) => {
    if (config.mode === "common") {
      commonVariables[varName] = config.commonValue || "";
    } else if (config.mode === "different") {
      differentModeVars.push(varName);
    } else if (config.mode === "predefined") {
      predefinedModeVars.push({
        name: varName,
        fieldMapping: config.fieldMapping || "",
      });
    }
  });

  // Build recipients with per-lead variables
  const recipients = leads.map((lead) => {
    const recipientVariables: Record<string, string> = {};

    // Add different mode variables
    differentModeVars.forEach((varName) => {
      const config = variableConfig[varName];
      recipientVariables[varName] = config.perLeadValues?.[lead.id] || "";
    });

    // Add predefined (mapped) variables
    predefinedModeVars.forEach(({ name, fieldMapping }) => {
      recipientVariables[name] = getLeadFieldValue(lead, fieldMapping);
    });

    return {
      email: lead.email,
      variables: recipientVariables,
    };
  });

  return {
    template_id: templateId,
    variables: commonVariables,
    recipients,
    cc_emails: [],
    bcc_emails: [],
  };
};

// 🔹 Fetch templates
const getAllTemplates = async () => {
  try {
    const result = await MailService.getAllTemplates(1, 50, "");
    if (result?.status === 200 && result?.data?.data) {
      const data = result.data.data.data;
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (error) {
    return [];
  }
};

// 🔹 Constant variables (ENUM type)
const CONSTANT_VARS: Record<string, string> = {};

// 🔹 Replace {{variable}}
const replaceVariables = (
  template: string,
  variables: Record<string, string>
) => {
  let result = template;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, variables[key] || "");
  });
  return result;
};

// 🔹 Extract variables from template
const extractVariables = (template: string): string[] => {
  const matches = template.match(/{{(\w+)}}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/{{|}}/g, "")))];
};

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

const BulkMailModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  // ============ STATE ============
  const [subject, setSubject] = useState("");
  const [mailText, setMailText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [variableConfig, setVariableConfig] = useState<VariableConfig>({});

  const [activeTab, setActiveTab] = useState<"template" | "variables" | "preview">(
    "template"
  );

  // ============ EFFECTS ============

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const result = await getAllTemplates();
        setTemplates(Array.isArray(result) ? result : []);
      } catch (error) {
        toast.error("Failed to load templates");
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const subjectVars = extractVariables(selectedTemplate.subject || "");
      const bodyVars = extractVariables(selectedTemplate.html_body || "");
      const allVars = [...new Set([...subjectVars, ...bodyVars])];

      setExtractedVariables(allVars);

      const newConfig: VariableConfig = {};
      allVars.forEach((varName) => {
        newConfig[varName] = {
          mode: "common",
          commonValue: "",
          perLeadValues: {},
        };
      });
      setVariableConfig(newConfig);
    }
  }, [selectedTemplate]);

  // ============ HANDLERS ============

  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((t) => t.id === templateId);
    if (selected) {
      setSelectedTemplate(selected);
      setSubject(selected.subject || "");
      setMailText(selected.html_body || "");
    }
  };

  const handleVariableModeChange = (varName: string, newMode: VariableMode) => {
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: {
        mode: newMode,
        commonValue: "",
        fieldMapping: "",
        perLeadValues: {},
      },
    }));
  };

  const handleCommonValueChange = (varName: string, value: string) => {
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        commonValue: value,
      },
    }));
  };

  const handleFieldMappingChange = (varName: string, fieldPath: string) => {
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        fieldMapping: fieldPath,
      },
    }));
  };

  const handlePerLeadValueChange = (
    varName: string,
    leadId: string,
    value: string
  ) => {
    setVariableConfig((prev) => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        perLeadValues: {
          ...prev[varName].perLeadValues,
          [leadId]: value,
        },
      },
    }));
  };

  const getLeadFieldValue = (lead: any, path: string): string => {
    const keys = path.replace("lead.", "").split(".");
    let value = lead;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || "";
  };

  const getLeadFields = (): Array<{ name: string; value: string }> => {
    if (leads.length === 0) return [];
    const firstLead = leads[0];
    return (Object.keys(firstLead) as (keyof Prospect)[])
      .filter((key) => typeof firstLead[key] === "string")
      .map((field) => ({
        name: field,
        value: `lead.${field}`,
      }));
  };

  const getUniqueFieldValues = (fieldPath: string): string[] => {
    const values = leads
      .map((lead) => getLeadFieldValue(lead, fieldPath))
      .filter((v) => v);
    return [...new Set(values)];
  };

  const leadFields = getLeadFields();

  const isVariablesComplete = (): boolean => {
    return extractedVariables.every((varName) => {
      const config = variableConfig[varName];
      if (!config) return false;

      if (config.mode === "common") {
        return config.commonValue?.trim() !== "";
      } else if (config.mode === "predefined") {
        return config.fieldMapping !== "";
      } else if (config.mode === "different") {
        return leads.every(
          (lead) =>
            config.perLeadValues?.[lead.id]?.trim() !== ""
        );
      }
      return false;
    });
  };

  // ============ SEND EMAILS ============
  const handleSend = async () => {
    if (!subject.trim() || !mailText.trim()) {
      toast.warning("Please fill in subject and message");
      return;
    }

    // Validate variables only if template has variables
    if (extractedVariables.length > 0 && !isVariablesComplete()) {
      toast.warning("Please configure all variables");
      return;
    }

    setIsSending(true);

    try {
      const payload = buildBulkMailPayload(
        selectedTemplate?.id || "",
        leads,
        variableConfig,
        CONSTANT_VARS,
        getLeadFieldValue
      );
      const response = await MailService.bulkMail(payload);
      const result = response.data;

      if (result?.success) {
        const successCount = result?.data?.success_count || 0;
        const failedCount = result?.data?.failed_count || 0;

        setSent(true);

        if (failedCount === 0) {
          toast.success(` All ${successCount} emails sent successfully`);
        } else if (successCount > 0) {
          toast.warning(` ${successCount} sent, ${failedCount} failed`);
        } else {
          toast.error(` All emails failed to send`);
        }
        setTimeout(onClose, 1500);
      } else {
        toast.error(result?.message || "Failed to send emails");
      }
    } catch (error) {
      toast.error("Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  // ============ RENDER ============
  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col">

        {/* Header */}
        <div className="bg-linear-to-r from-green-600 via-green-500 to-emerald-400 dark:from-green-700 dark:via-green-600 dark:to-emerald-500 px-6 py-5 rounded-t-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 dark:bg-black/20 p-2 rounded-lg">
              <MdEmail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk Email Campaign</h3>
              <p className="text-sm text-green-50 dark:text-green-100">
                {leads.length} recipient{leads.length !== 1 ? "s" : ""} • {extractedVariables.length} variable{extractedVariables.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 dark:text-white/60 hover:text-white dark:hover:text-white/80 transition p-1"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        {selectedTemplate && (
          <div className="flex gap-0 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-6">
            <button
              onClick={() => setActiveTab("template")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${activeTab === "template"
                ? "border-green-600 dark:border-green-500 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
            >
              <MdDescription className="w-4 h-4" /> Template
            </button>
            {extractedVariables.length > 0 && (
              <button
                onClick={() => setActiveTab("variables")}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${activeTab === "variables"
                  ? "border-green-600 dark:border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
              >
                <MdSettings className="w-4 h-4" /> Variables ({extractedVariables.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${activeTab === "preview"
                ? "border-green-600 dark:border-green-500 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
            >
              <MdVisibility className="w-4 h-4" /> Preview
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">

          {/* TEMPLATE TAB */}
          {activeTab === "template" && (
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-2">
                  Select Email Template
                </label>
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  disabled={isLoadingTemplates}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white text-gray-900 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {isLoadingTemplates ? "Loading templates..." : "Choose a template..."}
                  </option>
                  {Array.isArray(templates) && templates.length > 0
                    ? templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                    : !isLoadingTemplates && (
                      <option disabled>No templates available</option>
                    )}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  {extractedVariables.length === 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        ✅ No variables found in this template. You can send the email directly to all leads.
                      </p>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="flex text-sm font-semibold text-gray-900 dark:text-white  mb-2 items-center gap-2">
                      <MdEmail className="w-4 h-4" />Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      disabled= {true}
                      className="cursor-not-allowed w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white text-gray-900 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none transition"
                      placeholder="Email subject..."
                    />
                    {extractedVariables.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Variables found: {extractedVariables.map(v => `{{${v}}}`).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <MdEdit className="w-4 h-4" /> Message Content
                    </label>
                    <div className="dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600">
                      <RichEditor value={mailText} onChange={setMailText} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VARIABLES TAB */}
          {activeTab === "variables" && extractedVariables.length > 0 && (
            <div className="p-6 space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-200">
                  ℹ️ Configure each variable individually. Choose how each variable should be populated for all leads.
                </p>
              </div>

              {/* Variables List */}
              <div className="space-y-5">
                {extractedVariables.map((varName) => {
                  const config = variableConfig[varName] || { mode: "common" };
                  return (
                    <div key={varName} className="border border-gray-300 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-800">

                      {/* Variable Name */}
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          Variable: <code className="text-green-600 dark:text-green-400">{`{{${varName}}}`}</code>
                        </p>
                      </div>

                      {/* Mode Selection */}
                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">How to fill this variable?</p>
                        <div className="grid grid-cols-3 gap-2">

                          {/* Common Mode */}
                          <button
                            onClick={() =>
                              handleVariableModeChange(varName, "common")
                            }
                            className={`p-3 rounded-lg border-2 transition text-left ${config.mode === "common"
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600"
                              : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                              }`}
                          >
                            <p className="text-xs font-bold text-gray-900 dark:text-white">🔵 Common</p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">Same for all</p>
                          </button>

                          {/* Different Mode */}
                          <button
                            onClick={() =>
                              handleVariableModeChange(varName, "different")
                            }
                            className={`p-3 rounded-lg border-2 transition text-left ${config.mode === "different"
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600"
                              : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                              }`}
                          >
                            <p className="text-xs font-bold text-gray-900 dark:text-white">👥 Different</p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">Per lead</p>
                          </button>

                          {/* Predefined Mode */}
                          <button
                            onClick={() =>
                              handleVariableModeChange(varName, "predefined")
                            }
                            className={`p-3 rounded-lg border-2 transition text-left ${config.mode === "predefined"
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600"
                              : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                              }`}
                          >
                            <p className="text-xs font-bold text-gray-900 dark:text-white">📋 Predefined</p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">From lead data</p>
                          </button>
                        </div>
                      </div>

                      {/* Mode-specific Input */}
                      {config.mode === "common" && (
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                            Enter value for all leads
                          </label>
                          <input
                            type="text"
                            placeholder={`Value for ${varName}`}
                            value={config.commonValue || ""}
                            onChange={(e) =>
                              handleCommonValueChange(varName, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white text-gray-900 text-sm focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none"
                          />
                        </div>
                      )}

                      {config.mode === "different" && (
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-3">
                            Enter value for each lead
                          </label>
                          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                            {leads.map((lead) => (
                              <div key={lead.id} className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-fit truncate">
                                  {lead.fullName || lead.email}:
                                </span>
                                <input
                                  type="text"
                                  placeholder={varName}
                                  value={
                                    config.perLeadValues?.[lead.id] || ""
                                  }
                                  onChange={(e) =>
                                    handlePerLeadValueChange(
                                      varName,
                                      lead.id,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white text-gray-900 text-sm focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {config.mode === "predefined" && (
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                            Select lead field to use
                          </label>
                          <select
                            value={config.fieldMapping || ""}
                            onChange={(e) =>
                              handleFieldMappingChange(varName, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white text-gray-900 text-sm focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 outline-none"
                          >
                            <option value="">Select a field...</option>
                            {leadFields.map((field) => {
                              const sampleValue = getLeadFieldValue(leads[0], field.value);
                              return (
                                <option key={field.value} value={field.value}>
                                  {field.name}
                                  {sampleValue ? ` (e.g., "${sampleValue}")` : ""}
                                </option>
                              );
                            })}
                          </select>

                          {/* Show unique values available in this field */}
                          {config.fieldMapping && (
                            <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                              <p className="text-xs font-semibold text-orange-900 dark:text-orange-300 mb-2">
                                Available values:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {getUniqueFieldValues(config.fieldMapping).map(
                                  (value, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-1 bg-white dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 rounded border border-orange-300 dark:border-orange-700"
                                    >
                                      {value}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Indicator */}
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        {config.mode === "common" && config.commonValue?.trim() && (
                          <><MdCheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> <span className="text-green-700 dark:text-green-400">Configured</span></>
                        )}
                        {config.mode === "predefined" && config.fieldMapping && (
                          <><MdCheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> <span className="text-green-700 dark:text-green-400">Mapped to {config.fieldMapping.replace("lead.", "")}</span></>
                        )}
                        {config.mode === "different" && leads.every(
                          (lead) => config.perLeadValues?.[lead.id]?.trim()
                        ) && (
                            <><MdCheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> <span className="text-green-700 dark:text-green-400">All leads filled</span></>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PREVIEW TAB */}
          {activeTab === "preview" && extractedVariables.length > 0 && (
            <div className="p-6 space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-200 flex items-center gap-2">
                  <MdVisibility className="w-4 h-4" />
                  Preview how the email will look for each lead with all variables replaced.
                </p>
              </div>

              {/* Preview for each lead */}
              <div className="space-y-4 max-h-full overflow-y-auto">
                {leads.map((lead) => {
                  const variables: Record<string, string> = { ...CONSTANT_VARS };

                  extractedVariables.forEach((varName) => {
                    const config = variableConfig[varName];
                    if (config.mode === "common") {
                      variables[varName] = config.commonValue || "";
                    } else if (config.mode === "predefined") {
                      variables[varName] = getLeadFieldValue(lead, config.fieldMapping || "");
                    } else if (config.mode === "different") {
                      variables[varName] = config.perLeadValues?.[lead.id] || "";
                    }
                  });

                  const previewSubject = replaceVariables(subject, variables);
                  const previewHtml = replaceVariables(mailText, variables);

                  return (
                    <div key={lead.id} className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 dark:bg-slate-800 px-4 py-3 border-b border-gray-300 dark:border-slate-600">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {lead.fullName || lead.email}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{lead.email}</p>
                      </div>

                      <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject:</p>
                          <p className="text-sm bg-gray-50 dark:bg-slate-800 p-2 rounded text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                            {previewSubject || "(empty)"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Message:</p>
                          <div className="text-sm bg-gray-50 dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-600 prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-300">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: previewHtml || "(empty)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shrink-0 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isSending || sent}
            className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {/* If no variables, show Send button directly */}
          {extractedVariables.length === 0 && activeTab === "template" && (
            <button
              onClick={handleSend}
              disabled={isSending || sent || !selectedTemplate}
              className="px-6 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : sent ? (
                <>
                  <MdCheckCircle className="w-4 h-4" /> Sent!
                </>
              ) : (
                `Send to ${leads.length} lead${leads.length > 1 ? "s" : ""}`
              )}
            </button>
          )}

          {/* If variables exist, show Preview then Send flow */}
          {extractedVariables.length > 0 && (
            <>
              {activeTab === "variables" && (
                <button
                  onClick={() => setActiveTab("preview")}
                  disabled={!isVariablesComplete() || isSending || sent}
                  className="px-4 py-2.5 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview <MdArrowForward className="w-4 h-4" />
                </button>
              )}

              {activeTab === "preview" && (
                <button
                  onClick={handleSend}
                  disabled={isSending || sent || !selectedTemplate}
                  className="px-6 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : sent ? (
                    <>
                      <MdCheckCircle className="w-4 h-4" /> Sent!
                    </>
                  ) : (
                    `Send to ${leads.length} lead${leads.length > 1 ? "s" : ""}`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkMailModal;