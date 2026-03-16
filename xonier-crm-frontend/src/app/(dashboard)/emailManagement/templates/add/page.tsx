"use client";

import React, { JSX, useState, useRef, FormEvent, KeyboardEvent } from "react";
// ── Replace this block with your actual import: ───────────────────────────────
// import { EmailTemplateCategory, EMAIL_TEMPLATE_CATEGORY_LABELS } from "@/src/enums/enum";

// ─── Enum placeholder (swap with your enum.ts import) ────────────────────────
enum EmailTemplateCategory {
  MARKETING = "MARKETING",
  TRANSACTIONAL = "TRANSACTIONAL",
  ONBOARDING = "ONBOARDING",
  SUPPORT = "SUPPORT",
  NEWSLETTER = "NEWSLETTER",
  PROMOTIONAL = "PROMOTIONAL",
  NOTIFICATION = "NOTIFICATION",
  FOLLOW_UP = "FOLLOW_UP",
}

const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  [EmailTemplateCategory.MARKETING]: "Marketing",
  [EmailTemplateCategory.TRANSACTIONAL]: "Transactional",
  [EmailTemplateCategory.ONBOARDING]: "Onboarding",
  [EmailTemplateCategory.SUPPORT]: "Support",
  [EmailTemplateCategory.NEWSLETTER]: "Newsletter",
  [EmailTemplateCategory.PROMOTIONAL]: "Promotional",
  [EmailTemplateCategory.NOTIFICATION]: "Notification",
  [EmailTemplateCategory.FOLLOW_UP]: "Follow Up",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variable {
  key: string;
  label: string;
  description?: string;
  default_value?: string;
  is_required: boolean;
  isCustom?: boolean;
}

interface CustomVarForm {
  key: string;
  label: string;
  description: string;
  default_value: string;
  is_required: boolean;
}

// ─── Default Variables ────────────────────────────────────────────────────────
const DEFAULT_VARIABLES: Variable[] = [
  { key: "customer_name", label: "Customer Name", description: "Full name of the customer", default_value: "Customer", is_required: true },
  { key: "name", label: "User Name", description: "Name of the user", default_value: "", is_required: false },
  { key: "email", label: "User Email", description: "Email address of the user", default_value: "", is_required: false },
  { key: "company", label: "Company Name", description: "Name of the company", default_value: "", is_required: false },
  { key: "phone", label: "Phone Number", description: "Contact phone number", default_value: "", is_required: false },
  { key: "designation", label: "Designation", description: "Job title or designation", default_value: "", is_required: false },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const fieldBase =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 " +
  "transition-all duration-150 shadow-sm hover:border-slate-300 " +
  "dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-violet-500 dark:hover:border-gray-500";

const labelBase =
  "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";

// ─── Custom Variable Modal ────────────────────────────────────────────────────
const CustomVariableModal = ({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (v: Variable) => void;
}) => {
  const [form, setForm] = useState<CustomVarForm>({
    key: "", label: "", description: "", default_value: "", is_required: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomVarForm, string>>>({});

  const slugify = (val: string) =>
    val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const validate = () => {
    const e: typeof errors = {};
    if (!form.key.trim()) e.key = "Key is required";
    if (!form.label.trim()) e.label = "Label is required";
    return e;
  };

  const handleAdd = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onAdd({ ...form, isCustom: true });
    onClose();
  };

  const mField =
    "w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "transition-all duration-150 placeholder-yellow-400/50 text-yellow-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)" }}
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease]"
        style={{ background: "#FEFCE8", border: "1.5px solid #EAB308" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#EAB308 0%,#CA8A04 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
              ✦
            </div>
            <div>
              <p className="font-extrabold text-white text-base leading-tight">Create Custom Variable</p>
              <p className="text-yellow-100 text-xs mt-0.5">Define a reusable dynamic placeholder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/35 flex items-center justify-center text-white font-bold text-xl leading-none cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Key */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">
              Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. order_id"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: slugify(e.target.value) })}
              className={`${mField} ${errors.key ? "border-red-400 bg-red-50" : "border-yellow-300 bg-yellow-50 hover:border-yellow-400"}`}
            />
            {errors.key && <p className="text-red-500 text-xs mt-1">{errors.key}</p>}
            {form.key && (
              <p className="text-yellow-700 text-xs mt-1.5 flex items-center gap-1.5">
                <span className="opacity-60">Inserts as:</span>
                <code className="font-mono bg-yellow-100 border border-yellow-200 px-1.5 py-0.5 rounded-md text-yellow-900 font-semibold">
                  {`{{${form.key}}}`}
                </code>
              </p>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Order ID"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className={`${mField} ${errors.label ? "border-red-400 bg-red-50" : "border-yellow-300 bg-yellow-50 hover:border-yellow-400"}`}
            />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
          </div>

          {/* Description + Default in 2 cols */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">Description</label>
              <input
                type="text"
                placeholder="Optional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${mField} border-yellow-300 bg-yellow-50 hover:border-yellow-400`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">Default Value</label>
              <input
                type="text"
                placeholder="Fallback"
                value={form.default_value}
                onChange={(e) => setForm({ ...form, default_value: e.target.value })}
                className={`${mField} border-yellow-300 bg-yellow-50 hover:border-yellow-400`}
              />
            </div>
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              <div
                className="w-11 h-6 rounded-full transition-colors duration-200 shadow-inner"
                style={{ background: form.is_required ? "#EAB308" : "#D1D5DB" }}
              />
              <div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200"
                style={{ transform: form.is_required ? "translateX(20px)" : "none" }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-900 group-hover:text-yellow-700 transition-colors">Required field</p>
              <p className="text-xs text-yellow-600">Must have a value when email is sent</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 hover:bg-yellow-50 cursor-pointer"
              style={{ borderColor: "#FDE047", color: "#92400E" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 hover:shadow-lg hover:scale-[1.02] active:scale-100 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#EAB308,#CA8A04)", color: "#fff" }}
            >
              Add Variable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Variable Chip ────────────────────────────────────────────────────────────
const VarChip = ({ variable, onClick }: { variable: Variable; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title={variable.description}
    className="group flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 hover:shadow-md hover:scale-[1.04] active:scale-100 cursor-pointer"
    style={{
      background: variable.isCustom ? "#FEFCE8" : "#F5F3FF",
      borderColor: variable.isCustom ? "#FDE047" : "#DDD6FE",
    }}
  >
    <span
      className="text-xs font-semibold leading-tight"
      style={{ color: variable.isCustom ? "#92400E" : "#5B21B6" }}
    >
      {variable.label}
      {variable.is_required && <span className="ml-1 text-red-400 font-bold">*</span>}
    </span>
    <span
      className="font-mono text-[10px] leading-tight opacity-60 group-hover:opacity-90 transition-opacity"
      style={{ color: variable.isCustom ? "#B45309" : "#7C3AED" }}
    >
      {`{{${variable.key}}}`}
    </span>
  </button>
);

// ─── Tag Input ────────────────────────────────────────────────────────────────
const TagInput = ({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) => {
  const [input, setInput] = useState("");

  const addTag = (val: string) => {
    const trimmed = val.trim().replace(/,/g, "");
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput("");
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
    if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-text
        focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-400
        transition-all duration-150 shadow-sm hover:border-slate-300
        dark:bg-gray-800 dark:border-gray-600"
      onClick={() => document.getElementById("tag-input-field")?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
          style={{ background: "#EDE9FE", color: "#5B21B6" }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            className="text-violet-400 hover:text-violet-700 leading-none cursor-pointer transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id="tag-input-field"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input) addTag(input); }}
        placeholder={tags.length === 0 ? "Type a tag and press Enter or , to add…" : "Add more…"}
        className="flex-1 min-w-[160px] bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none py-0.5"
      />
    </div>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex-1 h-px bg-slate-100 dark:bg-gray-700" />
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
      {label}
    </span>
    <div className="flex-1 h-px bg-slate-100 dark:bg-gray-700" />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const Page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [err, setErr] = useState<string[] | string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [customVariables, setCustomVariables] = useState<Variable[]>([]);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number>(0);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    tags: [] as string[],
    category: "" as EmailTemplateCategory | "",
    privacy: "PUBLIC",
    aiPrompt: "",
    body: "",
  });

  const allVariables = [...DEFAULT_VARIABLES, ...customVariables];

  const trackCursor = () => {
    if (bodyRef.current) {
      cursorPosRef.current = bodyRef.current.selectionStart ?? formData.body.length;
    }
  };

  const insertVariable = (varKey: string) => {
    const tag = `{{${varKey}}}`;
    const pos = cursorPosRef.current;
    const newBody = formData.body.substring(0, pos) + tag + formData.body.substring(pos);
    setFormData((prev) => ({ ...prev, body: newBody }));
    setTimeout(() => {
      if (bodyRef.current) {
        bodyRef.current.focus();
        const newPos = pos + tag.length;
        bodyRef.current.setSelectionRange(newPos, newPos);
        cursorPosRef.current = newPos;
      }
    }, 0);
  };

  const generateWithAI = async () => {
    if (!formData.aiPrompt) return;
    setIsGenerating(true);
    setTimeout(() => {
      const generated = `Hello {{customer_name}},\n\nThank you for reaching out to {{company}}.\n\n${formData.aiPrompt}\n\nIf you have any questions, feel free to contact us at {{email}} or call us at {{phone}}.\n\nBest Regards,\n{{name}}\n{{designation}}`;
      setFormData((prev) => ({ ...prev, body: generated }));
      cursorPosRef.current = generated.length;
      setIsGenerating(false);
    }, 1200);
  };

  const handleClear = () => {
    setFormData({ name: "", subject: "", tags: [], category: "", privacy: "PUBLIC", aiPrompt: "", body: "" });
    setCustomVariables([]);
    setErr(null);
    setSubmitSuccess(false);
    cursorPosRef.current = 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setSubmitSuccess(false);
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const payload = {
        ...formData,
        customVariables: customVariables.map(({ isCustom, ...rest }) => rest),
      };
      console.log("Payload →", payload);
      setSubmitSuccess(true);
      handleClear();
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      setErr(["Something went wrong. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showModal && (
        <CustomVariableModal
          onClose={() => setShowModal(false)}
          onAdd={(v) => setCustomVariables((p) => [...p, v])}
        />
      )}

      <div className="ml-72 mt-14 p-8 min-h-screen" style={{ background: "#F8F7FF" }}>

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Email Template
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Build reusable, dynamic email templates with variable placeholders
            </p>
          </div>
          <span
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mt-1"
            style={{ background: "#EDE9FE", color: "#6D28D9" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Unsaved Draft
          </span>
        </div>

        {/* ── Main Card ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">

          {/* Top accent strip */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg,#7C3AED 0%,#A78BFA 50%,#7C3AED 100%)" }}
          />

          <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-5">

            {/* ── Template Name ──────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>
                Template Name <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Welcome Onboarding Email"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={fieldBase}
              />
            </div>

            {/* ── Subject ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>
                Subject <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Welcome to {{company}}, {{customer_name}}!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={fieldBase}
              />
            </div>

            {/* ── Tags (after Subject) ───────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Tags</label>
              <TagInput
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                Press
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400 text-[10px] font-mono border border-slate-200 dark:border-gray-600">
                  Enter
                </kbd>
                or
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400 text-[10px] font-mono border border-slate-200 dark:border-gray-600">
                  ,
                </kbd>
                to add a tag
              </p>
            </div>

            {/* ── Category + Privacy (2 col) ─────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as EmailTemplateCategory })
                    }
                    className={`${fieldBase} appearance-none pr-9 cursor-pointer`}
                  >
                    <option value="">Select a category…</option>
                    {Object.values(EmailTemplateCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {EMAIL_TEMPLATE_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Privacy</label>
                <div className="relative">
                  <select
                    value={formData.privacy}
                    onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
                    className={`${fieldBase} appearance-none pr-9 cursor-pointer`}
                  >
                    <option value="PUBLIC">🌐  Public</option>
                    <option value="PRIVATE">🔒  Private</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <SectionDivider label="AI Generation" />

            {/* ── AI Prompt ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <label className={labelBase}>AI Prompt</label>
              <textarea
                rows={3}
                placeholder="Describe the email you'd like to generate…"
                value={formData.aiPrompt}
                onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                className={`${fieldBase} resize-none`}
              />
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isGenerating || !formData.aiPrompt}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit
                  transition-all duration-150 cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:shadow-md hover:scale-[1.03] active:scale-100"
                style={{
                  background: "linear-gradient(135deg,#7C3AED,#6D28D9)",
                  color: "#fff",
                }}
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>🤖 Generate With AI</>
                )}
              </button>
            </div>

            <SectionDivider label="Template Body" />

            {/* ── Variable Panel ────────────────────────────────────── */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "#DDD6FE", background: "linear-gradient(135deg,#FAF5FF 0%,#F5F3FF 100%)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: "#EDE9FE", color: "#7C3AED" }}
                  >
                    ⚡
                  </div>
                  <div>
                    <p className="text-sm font-bold text-violet-900">Available Variables</p>
                    <p className="text-[11px] text-violet-500 mt-0.5">
                      Click any chip to insert at your cursor position in the body
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2
                    transition-all duration-150 hover:shadow-md hover:scale-[1.04] active:scale-100 cursor-pointer"
                  style={{ borderColor: "#EAB308", background: "#FEFCE8", color: "#92400E" }}
                >
                  <span>✦</span> Create Custom
                </button>
              </div>

              {/* Chips grid */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {allVariables.map((v) => (
                  <VarChip key={v.key} variable={v} onClick={() => insertVariable(v.key)} />
                ))}
              </div>

              {customVariables.length > 0 && (
                <div className="px-4 pb-3">
                  <p
                    className="text-xs font-medium px-3 py-2 rounded-xl border"
                    style={{ background: "#FEFCE8", borderColor: "#FDE047", color: "#92400E" }}
                  >
                    ✦ <strong>{customVariables.length}</strong> custom variable
                    {customVariables.length > 1 ? "s" : ""} will be attached to this template
                  </p>
                </div>
              )}
            </div>

            {/* ── Email Body ────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>
                Email Body <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
              </label>
              <textarea
                ref={bodyRef}
                rows={11}
                required
                placeholder="Your email body will appear here. Click a variable chip above, or type directly…"
                value={formData.body}
                onChange={(e) => {
                  setFormData({ ...formData, body: e.target.value });
                  trackCursor();
                }}
                onKeyUp={trackCursor}
                onClick={trackCursor}
                onFocus={trackCursor}
                className={`${fieldBase} font-mono resize-none leading-relaxed ${
                  err ? "!border-red-400 focus:!ring-red-400" : ""
                }`}
              />
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Use{" "}
                  <code
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded-md border"
                    style={{ background: "#F5F3FF", borderColor: "#DDD6FE", color: "#7C3AED" }}
                  >
                    {"{{variable}}"}
                  </code>{" "}
                  — values are auto-replaced when the email is sent
                </p>
                <span className="text-xs tabular-nums font-mono text-slate-300 dark:text-slate-600">
                  {formData.body.length} chars
                </span>
              </div>
            </div>

            {/* ── Error banner ─────────────────────────────────────── */}
            {err && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <span className="mt-0.5 text-base flex-shrink-0">⚠️</span>
                {Array.isArray(err) ? (
                  <ul className="list-disc pl-2 space-y-0.5">
                    {err.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                ) : err}
              </div>
            )}

            {/* ── Success banner ───────────────────────────────────── */}
            {submitSuccess && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="text-base">✅</span> Template created successfully!
              </div>
            )}

            {/* ── Form Actions ─────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600
                  text-sm font-semibold text-slate-500 dark:text-slate-400
                  hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-700 dark:hover:text-slate-200
                  hover:border-slate-300 transition-all duration-150 cursor-pointer"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white
                  transition-all duration-150 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-lg hover:scale-[1.03] active:scale-100"
                style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>📧 Create Template</>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default Page;