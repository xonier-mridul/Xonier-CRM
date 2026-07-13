"use client";

import React, { JSX, useState, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { TemplateCategory } from "@/src/constants/enum";
import { MailService } from "@/src/services/communication/mail.service";
import { Template, Variable, CustomVarForm } from "@/src/types/communication/mail.types";
import RichTextEditor, { RichTextEditorHandle } from "@/src/components/pages/prospect/RichEditor";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

// ─── Default Variables ────────────────────────────────────────────────────────
const DEFAULT_VARIABLES: Variable[] = [];

// ── Shared styles (mirrors CreateEnquiry exactly) ────────────────────────────
const selectClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const textareaClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
  placeholder-gray-400 dark:placeholder-gray-500 resize-none
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const inputClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
  placeholder-gray-400 dark:placeholder-gray-500
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

// ── Section Heading ───────────────────────────────────────────────────────────
const SectionHeading = ({ title, icon }: { title: string; icon?: string }) => (
  <div className="col-span-1 md:col-span-2 mt-4">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-base">{icon}</span>}
      <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
        {title}
      </h3>
    </div>
    <div className="h-px bg-gradient-to-r  from-[#16c2cf]  via-cyan-100 to-transparent dark:from-cyan-700 dark:via-cyan-900 dark:to-transparent" />
  </div>
);

// ── Field Label ───────────────────────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
    {children}
    {required && <span className="text-cyan-500">*</span>}
  </label>
);

// ── Tag Input ─────────────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) => {
  const [input, setInput] = useState("");

  const add = (val: string) => {
    const t = val.trim().replace(/,/g, "");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));
  const kd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
    if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 focus-within:border-cyan-400 dark:focus-within:border-cyan-500
        focus-within:ring-2 focus-within:ring-cyan-400/20 min-h-[44px] transition-all duration-200 cursor-text"
      onClick={() => document.getElementById("template-tag-input")?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs px-2.5 py-1 rounded-full font-medium border border-cyan-200 dark:border-cyan-700"
        >
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(t); }}
            className="hover:text-red-500 font-bold leading-none ml-0.5 transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id="template-tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={kd}
        onBlur={() => input.trim() && add(input)}
        placeholder={tags.length === 0 ? "Type and press Enter or , to add…" : "Add more…"}
        className="flex-1 min-w-[160px] bg-transparent text-sm text-black dark:text-white placeholder-gray-400 outline-none py-0.5 px-1"
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM VARIABLE MODAL  (create + edit)
// ═══════════════════════════════════════════════════════════════════════════════
const CustomVariableModal = ({
  onClose,
  onSave,
  initial,
  isEdit = false,
}: {
  onClose: () => void;
  onSave: (v: Variable) => void;
  initial?: Variable;
  isEdit?: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<CustomVarForm>(
    initial
      ? {
          key: initial.key,
          label: initial.label,
          description: initial.description ?? "",
          default_value: initial.default_value ?? "",
          is_required: initial.is_required ?? false,
        }
      : { key: "", label: "", description: "", default_value: "", is_required: false }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CustomVarForm, string>>>({});

  const slugify = (v: string) =>
    v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const handleSave = () => {
    const e: typeof errors = {};
    if (!form.key.trim())   e.key   = "Key is required";
    if (!form.label.trim()) e.label = "Label is required";
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, isCustom: true });
    onClose();
  };

  const mf = (hasErr?: boolean) => `
    w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200
    bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100
    placeholder-yellow-400/60 dark:placeholder-yellow-600
    focus:outline-none focus:ring-2
    ${hasErr
      ? "border-red-400 bg-red-50 dark:bg-red-950 focus:ring-red-400"
      : "border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 dark:hover:border-yellow-600 focus:ring-yellow-400 dark:focus:ring-yellow-500"
    }
  `;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-800">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-bold">
              {isEdit ? "✎" : "✦"}
            </div>
            <div>
              <p className="font-bold text-white text-base">
                {isEdit ? "Edit Variable" : "Create Custom Variable"}
              </p>
              <p className="text-yellow-100 text-xs mt-0.5">{t("define_a_reusable_dynamic_placeholder")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl font-bold cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Key */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-widest text-yellow-800 dark:text-yellow-300">
              {t("key")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t("e_g_order_id")}
              value={form.key}
              disabled={isEdit}
              onChange={(e) => setForm({ ...form, key: slugify(e.target.value) })}
              className={`${mf(!!errors.key)} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            {errors.key && <p className="text-red-500 text-xs">{errors.key}</p>}
            {form.key && (
              <p className="text-yellow-700 dark:text-yellow-400 text-xs flex items-center gap-1.5 mt-0.5">
                <span className="opacity-60">{t("inserts_as")}</span>
                <code className="font-mono bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 px-1.5 py-0.5 rounded text-yellow-900 dark:text-yellow-200 font-semibold">
                  {`{{${form.key}}}`}
                </code>
              </p>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-widest text-yellow-800 dark:text-yellow-300">
              {t("label")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t("e_g_order_id_2")}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className={mf(!!errors.label)}
            />
            {errors.label && <p className="text-red-500 text-xs">{errors.label}</p>}
          </div>

          {/* Description + Default */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-yellow-800 dark:text-yellow-300">{t("description_2")}</label>
              <input type="text" placeholder={t("optional")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={mf()} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-yellow-800 dark:text-yellow-300">{t("default_value")}</label>
              <input type="text" placeholder={t("fallback")} value={form.default_value} onChange={(e) => setForm({ ...form, default_value: e.target.value })} className={mf()} />
            </div>
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative flex-shrink-0">
              <input type="checkbox" className="sr-only" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 shadow-inner ${form.is_required ? "bg-yellow-400 dark:bg-yellow-500" : "bg-gray-300 dark:bg-gray-600"}`} />
              <div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200"
                style={{ transform: form.is_required ? "translateX(20px)" : "none" }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors">
                {t("required_field")}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">{t("must_be_filled_when_email_is")}</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-yellow-300 dark:border-yellow-700 text-sm font-semibold text-yellow-900 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900 cursor-pointer transition-all"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600 hover:shadow-md hover:scale-[1.02] active:scale-100 cursor-pointer transition-all"
            >
              {isEdit ? "Save Changes" : "Add Variable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteConfirmModal = ({
  variable,
  onClose,
  onConfirm,
}: {
  variable: Variable;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();
  return (
    (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
    onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
  >
    <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800">
      <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800">
        <p className="font-bold text-white text-base">{t("delete_variable")}</p>
        <p className="text-red-100 text-xs mt-0.5">{t("this_action_cannot_be_undone")}</p>
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("are_you_sure_you_want_to_delete")}{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-200 font-semibold">
            {`{{${variable.key}}}`}
          </code>
          {t("any_uses_in_the_email_body_will_become_unresolved")}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-bold cursor-pointer transition-all"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    </div>
  </div>
)
  );
};

// ─── Variable Chip ────────────────────────────────────────────────────────────
const VarChip = ({
  variable,
  onInsert,
  onEdit,
  onDelete,
}: {
  variable: Variable;
  onInsert: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    (
  <div
    className={`group inline-flex items-center rounded-full border text-xs font-medium transition-all duration-150 overflow-hidden
      ${variable.isCustom
        ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
        : "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700"
      }`}
  >
    {/* Insert trigger */}
    <button
      type="button"
      onClick={onInsert}
      title={variable.description || `Insert {{${variable.key}}}`}
      className="flex flex-col items-start gap-0 pl-3 pr-2 py-1.5 cursor-pointer hover:opacity-75 transition-opacity"
    >
      <span className={`font-semibold leading-tight ${variable.isCustom ? "text-yellow-800 dark:text-yellow-300" : "text-violet-800 dark:text-violet-300"}`}>
        {variable.label}
        {variable.is_required && <span className="ml-1 text-red-400 font-bold">*</span>}
      </span>
      <span className={`font-mono text-[10px] opacity-60 ${variable.isCustom ? "text-yellow-700 dark:text-yellow-400" : "text-violet-600 dark:text-violet-400"}`}>
        {`{{${variable.key}}}`}
      </span>
    </button>

    {/* Edit / Delete actions — only for custom vars, appear on hover */}
    {variable.isCustom && onEdit && onDelete && (
      <div className="flex items-center gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          type="button"
          onClick={onEdit}
          title={t("edit_variable")}
          className="w-5 h-5 flex items-center justify-center rounded text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={t("delete_variable_2")}
          className="w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    )}
  </div>
)
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Page = (): JSX.Element => {
  const { t } = useTranslation();
  const router = useRouter();

  const [isLoading,    setIsLoading]    = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [err,          setErr]          = useState<string[] | string | null>(null);
  const [success,      setSuccess]      = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVar,      setEditingVar]      = useState<Variable | null>(null);
  const [deletingVar,     setDeletingVar]     = useState<Variable | null>(null);
  const [customVars,      setCustomVars]      = useState<Variable[]>([]);

  const editorRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    name:     "",
    subject:  "",
    tags:     [] as string[],
    category: "" as TemplateCategory | "",
    privacy:  "PUBLIC",
    aiPrompt: "",
    body:     "",
  });

  const allVariables = [...DEFAULT_VARIABLES, ...customVars];

  const insertVariable = useCallback((key: string) => {
    editorRef.current?.insertAtCursor(`{{${key}}}`);
  }, []);

  // ── Custom var CRUD ──────────────────────────────────────────────────────
  const handleAddVar    = (v: Variable) => setCustomVars((p) => [...p, v]);
  const handleEditVar   = (v: Variable) => setCustomVars((p) => p.map((x) => (x.key === v.key ? v : x)));
  const handleDeleteVar = (key: string) => setCustomVars((p) => p.filter((x) => x.key !== key));

  // ── AI Generate ──────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    if (!form.aiPrompt) return;
    setIsGenerating(true);
    setTimeout(() => {
      const html = [
        `<p>Hello <strong>Name</strong>,</p>`,
        `<p>Thank you for reaching out to <strong>Company</strong>.</p>`,
        `<p>${form.aiPrompt}</p>`,
        `<p>If you have any questions, contact us at <a href="mailto:{{email}}">email</a> or call <strong>phone</strong>.</p>`,
        `<p>Best Regards,<br>{{name}}<br><em>{{designation}}</em></p>`,
      ].join("");
      editorRef.current?.setContent(html);
      setForm((p) => ({ ...p, body: html }));
      setIsGenerating(false);
    }, 1200);
  };

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm({ name: "", subject: "", tags: [], category: "", privacy: "PUBLIC", aiPrompt: "", body: "" });
    editorRef.current?.setContent("");
    setCustomVars([]);
    setErr(null);
    setSuccess(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const payload: Template = {
        name:      form.name,
        subject:   form.subject,
        html_body: editorRef.current?.getHTML() ?? form.body,
        status:    "draft",
        tags:      form.tags,
        category:  form.category,
        privacy:   form.privacy || "PRIVATE",
        variables: allVariables,
      };
      await MailService.createTemplate(payload);
      setSuccess(true);
      handleClear();
      toast.success("Template created successfully");
      router.push("/emailManagement/templates");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create template");
      setErr(error?.response?.data?.message || "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showCreateModal && (
        <CustomVariableModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleAddVar}
        />
      )}
      {editingVar && (
        <CustomVariableModal
          isEdit
          initial={editingVar}
          onClose={() => setEditingVar(null)}
          onSave={handleEditVar}
        />
      )}
      {deletingVar && (
        <DeleteConfirmModal
          variable={deletingVar}
          onClose={() => setDeletingVar(null)}
          onConfirm={() => handleDeleteVar(deletingVar.key)}
        />
      )}

      {/* ── Page ────────────────────────────────────────────────────── */}
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* ── Card Header ─────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] dark:from-cyan-700 dark:to-teal-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-lg shadow-inner">
                ✉️
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t("create_email_template")}
                </h2>
                <p className="text-xs text-cyan-200 mt-0.5">
                  {t("build_reusable_dynamic_email_templates_with")}
                </p>
              </div>
            </div>
          </div>

          {/* ── Form Body ───────────────────────────────────────────── */}
          <div className="p-8">
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
            >

              {/* ── BASIC INFORMATION ──────────────────────────────── */}
              <SectionHeading title={t("basic_information")} icon="📋" />

              <div className="flex flex-col gap-1.5">
                <FieldLabel required>{t("template_name")}</FieldLabel>
                <input
                  type="text"
                  required
                  placeholder={t("e_g_welcome_onboarding_email")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass(!!err)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel required>{t("subject")}</FieldLabel>
                <input
                  type="text"
                  required
                  placeholder={t("e_g_welcome_to_company_customer_name")}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={inputClass(!!err)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t("category")}</FieldLabel>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
                  className={selectClass(!!err)}
                >
                  <option value="">{t("select_a_category")}</option>
                  {Object.values(TemplateCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase().replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t("privacy")}</FieldLabel>
                <select
                  value={form.privacy}
                  onChange={(e) => setForm({ ...form, privacy: e.target.value })}
                  className={selectClass(!!err)}
                >
                  <option value="PUBLIC">{t("public_2")}</option>
                  <option value="PRIVATE">{t("private_2")}</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                <FieldLabel>{t("tags")}</FieldLabel>
                <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-0.5">
                  {t("press")}
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-mono border border-gray-200 dark:border-gray-700">{t("enter")}</kbd>
                  {t("or")}
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-mono border border-gray-200 dark:border-gray-700">,</kbd>
                  {t("to_add_a_tag")}
                </p>
              </div>

              {/* ── AI GENERATION ──────────────────────────────────── */}
              <SectionHeading title={t("ai_generation")} icon="🤖" />

              <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                <FieldLabel>{t("ai_prompt")}</FieldLabel>
                <textarea
                  rows={3}
                  // placeholder="Describe the email you'd like to generate…"
                  placeholder={"Ai template genration functionality is coming soon..."}
                  disabled
                  onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })}
                  className={textareaClass()}
                />
                <div>
                  <button
                    type="button"
                    onClick={generateWithAI}
                    // disabled={isGenerating || !form.aiPrompt}
                    disabled={true}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] dark:from-cyan-500 dark:to-teal-500 hover:shadow-md hover:scale-[1.02] active:scale-100 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("generating")}
                      </>
                    ) : (
                      <>{t("generate_with_ai")}</>
                    )}
                  </button>
                </div>
              </div>

              {/* ── TEMPLATE BODY ──────────────────────────────────── */}
              <SectionHeading title={t("template_body")} icon="✍️" />

              {/* Variable Panel */}
              <div className="col-span-1 md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-sm text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                      ⚡
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t("available_variables")}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {t("click_to_insert_at_cursor_hover")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-800 transition-all"
                  >
                    {t("create_custom_2")}
                  </button>
                </div>

                {/* Chips area */}
                <div className="px-4 py-3 flex flex-wrap gap-2 bg-white dark:bg-gray-900/50">
                  {allVariables.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                      {t("no_variables_yet_create_a_custom")}
                    </p>
                  )}
                  {allVariables.map((v) => (
                    <VarChip
                      key={v.key}
                      variable={v}
                      onInsert={() => insertVariable(v.key)}
                      onEdit={v.isCustom ? () => setEditingVar(v) : undefined}
                      onDelete={v.isCustom ? () => setDeletingVar(v) : undefined}
                    />
                  ))}
                </div>

                {/* Footer count */}
                {customVars.length > 0 && (
                  <div className="px-4 py-2.5 bg-yellow-50 dark:bg-yellow-950 border-t border-yellow-100 dark:border-yellow-900">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                      ✦ <strong>{customVars.length}</strong> {t("custom_variable")}{customVars.length > 1 ? "s" : ""} {t("will_be_attached_to_this_template")}
                    </p>
                  </div>
                )}
              </div>

              {/* Rich Text Editor */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                <FieldLabel required>{t("email_body")}</FieldLabel>
                <RichTextEditor
                  ref={editorRef}
                  value={form.body}
                  onChange={(html) => setForm((p) => ({ ...p, body: html }))}
                  placeholder={t("write_your_email_body_here_click")}
                  hasError={!!err}
                  minHeight={300}
                />
              </div>

              {/* ── ERROR ───────────────────────────────────────────── */}
              {err && (
                <div className="col-span-1 md:col-span-2">
                  <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">⚠️</span>
                    <div>
                      {Array.isArray(err) ? (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {err.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      ) : err}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUCCESS ─────────────────────────────────────────── */}
              {success && (
                <div className="col-span-1 md:col-span-2">
                  <div className="rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400 font-semibold flex items-center gap-2">
                    <span>✅</span> {t("template_created_successfully")}
                  </div>
                </div>
              )}

              {/* ── FOOTER ──────────────────────────────────────────── */}
              <div className="col-span-1 md:col-span-2 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("fields_marked")} <span className="text-cyan-500 font-bold">*</span> {t("are_required")}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-150 cursor-pointer"
                  >
                    {t("clear_form")}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] dark:from-cyan-500 dark:to-teal-500 hover:shadow-md hover:scale-[1.02] active:scale-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("saving")}
                      </>
                    ) : (
                      <>{t("create_template_2")}</>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;