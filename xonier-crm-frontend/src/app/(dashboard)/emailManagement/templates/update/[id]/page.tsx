"use client";

import React, { JSX, useState, useRef, useCallback, useEffect, FormEvent, KeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { TemplateCategory } from "@/src/constants/enum";
import { MailService } from "@/src/services/communication/mail.service";
import { Template, Variable, CustomVarForm } from "@/src/types/communication/mail.types";
import RichTextEditor, { RichTextEditorHandle } from "@/src/components/pages/prospect/RichEditor";
import { useTranslation } from "react-i18next";

// ─── Default Variables ────────────────────────────────────────────────────────
const DEFAULT_VARIABLES: Variable[] = [
 ];

// ─── Shared styles ────────────────────────────────────────────────────────────
const fieldBase =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 " +
  "transition-all duration-150 shadow-sm hover:border-slate-300 " +
  "dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 " +
  "dark:focus:ring-violet-500 dark:hover:border-gray-500";

const labelBase =
  "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════
const SkeletonField = ({ wide = false }: { wide?: boolean }) => (
  <div className={`h-10 rounded-xl bg-slate-100 dark:bg-gray-700 animate-pulse ${wide ? "w-full" : "w-full"}`} />
);

const FetchingSkeleton = () => (
  <div className="ml-72 mt-14 p-8 min-h-screen" style={{ background: "#F8F7FF" }}>
    <div className="mb-7 flex items-start justify-between">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-64 rounded-xl bg-slate-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-80 rounded-lg bg-slate-100 dark:bg-gray-700 animate-pulse" />
      </div>
      <div className="h-7 w-28 rounded-xl bg-violet-100 dark:bg-violet-900/30 animate-pulse" />
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#7C3AED,#A78BFA,#7C3AED)" }} />
      <div className="p-7 flex flex-col gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-24 rounded-md bg-slate-100 dark:bg-gray-700 animate-pulse" />
            <SkeletonField />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-20 rounded-md bg-slate-100 dark:bg-gray-700 animate-pulse" />
            <SkeletonField />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-20 rounded-md bg-slate-100 dark:bg-gray-700 animate-pulse" />
            <SkeletonField />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-24 rounded-md bg-slate-100 dark:bg-gray-700 animate-pulse" />
          <div className="h-[320px] w-full rounded-xl bg-slate-100 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM VARIABLE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const CustomVariableModal = ({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (v: Variable) => void;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<CustomVarForm>({
    key: "", label: "", description: "", default_value: "", is_required: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomVarForm, string>>>({});

  const slugify = (v: string) =>
    v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const handleAdd = () => {
    const e: typeof errors = {};
    if (!form.key.trim())   e.key   = "Key is required";
    if (!form.label.trim()) e.label = "Label is required";
    if (Object.keys(e).length) { setErrors(e); return; }
    onAdd({ ...form, isCustom: true });
    onClose();
  };

  const mf =
    "w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "transition-all duration-150 placeholder-yellow-400/50 text-yellow-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)" }}
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#FEFCE8", border: "1.5px solid #EAB308" }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#EAB308,#CA8A04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">✦</div>
            <div>
              <p className="font-extrabold text-white text-base">{t("create_custom_variable")}</p>
              <p className="text-yellow-100 text-xs mt-0.5">{t("define_a_reusable_dynamic_placeholder")}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/35 flex items-center justify-center text-white font-bold text-xl cursor-pointer transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">{t("key")} <span className="text-red-500">*</span></label>
            <input type="text" placeholder={t("e_g_order_id")} value={form.key} onChange={(e) => setForm({ ...form, key: slugify(e.target.value) })} className={`${mf} ${errors.key ? "border-red-400 bg-red-50" : "border-yellow-300 bg-yellow-50 hover:border-yellow-400"}`} />
            {errors.key && <p className="text-red-500 text-xs mt-1">{errors.key}</p>}
            {form.key && (
              <p className="text-yellow-700 text-xs mt-1.5 flex items-center gap-1.5">
                <span className="opacity-60">{t("inserts_as")}</span>
                <code className="font-mono bg-yellow-100 border border-yellow-200 px-1.5 py-0.5 rounded-md text-yellow-900 font-semibold">{`{{${form.key}}}`}</code>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">{t("label")} <span className="text-red-500">*</span></label>
            <input type="text" placeholder={t("e_g_order_id_2")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={`${mf} ${errors.label ? "border-red-400 bg-red-50" : "border-yellow-300 bg-yellow-50 hover:border-yellow-400"}`} />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">{t("description_2")}</label>
              <input type="text" placeholder={t("optional")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${mf} border-yellow-300 bg-yellow-50 hover:border-yellow-400`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-yellow-800 mb-1.5">{t("default_value")}</label>
              <input type="text" placeholder={t("fallback")} value={form.default_value} onChange={(e) => setForm({ ...form, default_value: e.target.value })} className={`${mf} border-yellow-300 bg-yellow-50 hover:border-yellow-400`} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative flex-shrink-0">
              <input type="checkbox" className="sr-only" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />
              <div className="w-11 h-6 rounded-full transition-colors duration-200 shadow-inner" style={{ background: form.is_required ? "#EAB308" : "#D1D5DB" }} />
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200" style={{ transform: form.is_required ? "translateX(20px)" : "none" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-900 group-hover:text-yellow-700 transition-colors">{t("required_field")}</p>
              <p className="text-xs text-yellow-600">{t("must_have_a_value_when_email")}</p>
            </div>
          </label>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold hover:bg-yellow-50 cursor-pointer transition-all" style={{ borderColor: "#FDE047", color: "#92400E" }}>{t("cancel")}</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:scale-[1.02] active:scale-100 cursor-pointer transition-all" style={{ background: "linear-gradient(135deg,#EAB308,#CA8A04)", color: "#fff" }}>{t("add_variable")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Variable Chip ────────────────────────────────────────────────────────────
const VarChip = ({ variable, onClick }: { variable: Variable; onClick: () => void }) => (
  <button
    type="button" onClick={onClick} title={variable.description}
    className="group flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 hover:shadow-md hover:scale-[1.04] active:scale-100 cursor-pointer"
    style={{ background: variable.isCustom ? "#FEFCE8" : "#F5F3FF", borderColor: variable.isCustom ? "#FDE047" : "#DDD6FE" }}
  >
    <span className="text-xs font-semibold leading-tight" style={{ color: variable.isCustom ? "#92400E" : "#5B21B6" }}>
      {variable.label}{variable.is_required && <span className="ml-1 text-red-400 font-bold">*</span>}
    </span>
    <span className="font-mono text-[10px] leading-tight opacity-60 group-hover:opacity-90 transition-opacity" style={{ color: variable.isCustom ? "#B45309" : "#7C3AED" }}>
      {`{{${variable.key}}}`}
    </span>
  </button>
);

// ─── Tag Input ────────────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) => {
  const [input, setInput] = useState("");
  const add = (v: string) => { const t = v.trim().replace(/,/g, ""); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(""); };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));
  const kd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
    if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length - 1]);
  };
  return (
    <div
      className="flex flex-wrap gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-text focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-400 transition-all duration-150 shadow-sm hover:border-slate-300 dark:bg-gray-800 dark:border-gray-600"
      onClick={() => document.getElementById("update-tag-field")?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
          {t}
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(t); }} className="text-violet-400 hover:text-violet-700 cursor-pointer transition-colors leading-none">×</button>
        </span>
      ))}
      <input
        id="update-tag-field"
        type="text" value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={kd}
        onBlur={() => { if (input) add(input); }}
        placeholder={tags.length === 0 ? "Type a tag and press Enter or , to add…" : "Add more…"}
        className="flex-1 min-w-[160px] bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none py-0.5"
      />
    </div>
  );
};

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex-1 h-px bg-slate-100 dark:bg-gray-700" />
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">{label}</span>
    <div className="flex-1 h-px bg-slate-100 dark:bg-gray-700" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Page = (): JSX.Element => {
  const { t } = useTranslation();
  const router   = useRouter();
  const params   = useParams();
  const id       = params?.id as string;

  const [isLoading,    setIsLoading]    = useState(false);
  const [isFetching,   setIsFetching]   = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [err,          setErr]          = useState<string[] | string | null>(null);
  const [customVars,   setCustomVars]   = useState<Variable[]>([]);

  const editorRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    name:      "",
    subject:   "",
    tags:      [] as string[],
    category:  "" as TemplateCategory | "",
    privacy:   "PUBLIC",
    aiPrompt:  "",
    body:      "",
  });

  const allVariables = [...DEFAULT_VARIABLES, ...customVars];

  // ─── Fetch template by ID ───────────────────────────────────────────────────
  const fetchTemplate = async () => {
    setIsFetching(true);
    try {
      const res = await MailService.getById(id);
      if (res?.data) {
        const t = res.data?.data;
      
        setForm({
          name:     t.name      ?? "",
          subject:  t.subject   ?? "",
          tags:     t.tags      ?? [],
          category: t.category  ?? "",
          privacy:  t.privacy   ?? "PUBLIC",
          aiPrompt: "",
          body:     t.html_body ?? "",
        });
        // Populate existing custom variables from the template
        if (t.variables?.length) {
          setCustomVars(
            t.variables.map((v: Variable) => ({ ...v, isCustom: true }))
          );
        }
      }
    } catch {
      toast.error("Failed to load template");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchTemplate();
  }, []);

  // ─── Insert variable at editor cursor ──────────────────────────────────────
  const insertVariable = useCallback((key: string) => {
    editorRef.current?.insertAtCursor(`{{${key}}}`);
  }, []);

  // ─── AI generation ──────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    if (!form.aiPrompt) return;
    setIsGenerating(true);
    setTimeout(() => {
      const html = [
        `<p>Hello <strong>{{customer_name}}</strong>,</p>`,
        `<p>Thank you for reaching out to <strong>{{company}}</strong>.</p>`,
        `<p>${form.aiPrompt}</p>`,
        `<p>If you have any questions, contact us at <a href="mailto:{{email}}">{{email}}</a> or call <strong>{{phone}}</strong>.</p>`,
        `<p>Best Regards,<br>{{name}}<br><em>{{designation}}</em></p>`,
      ].join("");
      editorRef.current?.setContent(html);
      setForm((p) => ({ ...p, body: html }));
      setIsGenerating(false);
    }, 1200);
  };

  // ─── Reset to fetched values ────────────────────────────────────────────────
  const handleReset = () => {
    fetchTemplate();
    setErr(null);
  };

  // ─── Submit (update) ────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
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
        variables: customVars.map(({ isCustom, ...rest }) => rest),
      };
      await MailService.updateTemplate(id, payload);
      toast.success("Template updated successfully");
      router.push("/emailManagement/templates");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to update template");
      toast.error("Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isFetching) return <FetchingSkeleton />;

  // ─── Page ───────────────────────────────────────────────────────────────────
  return (
    <>
      {showModal && (
        <CustomVariableModal
          onClose={() => setShowModal(false)}
          onAdd={(v) => setCustomVars((p) => [...p, v])}
        />
      )}

      <div className="ml-72 mt-14 p-8 min-h-screen dark:bg-black rounded-2xl bg-gray-100">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="mb-7 flex items-start justify-between">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
              <button
                type="button"
                onClick={() => router.push("/emailManagement/templates")}
                className="hover:text-violet-600 transition-colors cursor-pointer"
              >
                {t("templates")}
              </button>
              <span>/</span>
              <span className="text-slate-500 dark:text-slate-400">{t("edit")}</span>
            </div>
            <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("update_email_template")}
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {t("editing_2")} <span className="font-semibold text-violet-600 dark:text-violet-400">"{form.name}"</span>
            </p>
          </div>

          {/* Status badge */}
          <span
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mt-1"
            style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE047" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            {t("editing_2")}
          </span>
        </div>

        {/* ── Card ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Top accent — amber to signal "edit mode" */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg,#EAB308 0%,#7C3AED 50%,#EAB308 100%)" }}
          />

          <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-5">

            {/* Template Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>{t("template_name")} <span className="text-red-400 normal-case tracking-normal font-bold">*</span></label>
              <input
                type="text" required
                placeholder={t("e_g_welcome_onboarding_email")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={fieldBase}
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>{t("subject")} <span className="text-red-400 normal-case tracking-normal font-bold">*</span></label>
              <input
                type="text" required
                placeholder={t("e_g_welcome_to_company_customer_name")}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={fieldBase}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>{t("tags")}</label>
              <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                {t("press")}
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-500 text-[10px] font-mono border border-slate-200 dark:border-gray-600">{t("enter")}</kbd>
                {t("or")}
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-500 text-[10px] font-mono border border-slate-200 dark:border-gray-600">,</kbd>
                {t("to_add_a_tag")}
              </p>
            </div>

            {/* Category + Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>{t("category")}</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
                    className={`${fieldBase} appearance-none pr-9 cursor-pointer`}
                  >
                    <option value="">{t("select_a_category")}</option>
                    {Object.values(TemplateCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase().replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>{t("privacy")}</label>
                <div className="relative">
                  <select
                    value={form.privacy}
                    onChange={(e) => setForm({ ...form, privacy: e.target.value })}
                    className={`${fieldBase} appearance-none pr-9 cursor-pointer`}
                  >
                    <option value="PUBLIC">{t("public_2")}</option>
                    <option value="PRIVATE">{t("private_2")}</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <SectionDivider label={t("ai_generation")} />

            {/* AI Prompt */}
            <div className="flex flex-col gap-2">
              <label className={labelBase}>{t("ai_prompt")}</label>
              <textarea
                rows={3}
                // placeholder="Describe changes you'd like to regenerate the body…"
                placeholder={"Ai template genration functionality is coming soon..."}
                disabled 
                // value={form.aiPrompt}
                onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })}
                className={`${fieldBase} resize-none`}
              />
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isGenerating || !form.aiPrompt}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:scale-[1.03] active:scale-100"
                style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "#fff" }}
              >
                {isGenerating
                  ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t("generating")}</>)
                  : <>{t("regenerate_with_ai")}</>
                }
              </button>
            </div>

            <SectionDivider label={t("template_body")} />

            {/* Variable Panel */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#DDD6FE", background: "linear-gradient(135deg,#FAF5FF 0%,#F5F3FF 100%)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "#EDE9FE", color: "#7C3AED" }}>⚡</div>
                  <div>
                    <p className="text-sm font-bold text-violet-900">{t("available_variables")}</p>
                    <p className="text-[11px] text-violet-500 mt-0.5">{t("click_any_chip_to_insert_at")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all duration-150 hover:shadow-md hover:scale-[1.04] active:scale-100 cursor-pointer"
                  style={{ borderColor: "#EAB308", background: "#FEFCE8", color: "#92400E" }}
                >
                  <span>✦</span> {t("create_custom")}
                </button>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {allVariables.map((v) => (
                  <VarChip key={v.key} variable={v} onClick={() => insertVariable(v.key)} />
                ))}
              </div>
              {customVars.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-xs font-medium px-3 py-2 rounded-xl border" style={{ background: "#FEFCE8", borderColor: "#FDE047", color: "#92400E" }}>
                    ✦ <strong>{customVars.length}</strong> {t("custom_variable")}{customVars.length > 1 ? "s" : ""} {t("will_be_saved_with_this_template")}
                  </p>
                </div>
              )}
            </div>

            {/* Rich Editor */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>
                {t("email_body")} <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
              </label>
              <RichTextEditor
                ref={editorRef}
                value={form.body}
                onChange={(html) => setForm((p) => ({ ...p, body: html }))}
                placeholder={t("your_template_body_will_appear_here")}
                hasError={!!err}
                minHeight={300}
              />
            </div>

            {/* Error */}
            {err && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                {Array.isArray(err)
                  ? <ul className="list-disc pl-2 space-y-0.5">{err.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  : err
                }
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-700">
              {/* Left: discard changes */}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-700 hover:border-slate-300 transition-all duration-150 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {t("reset_changes")}
              </button>

              {/* Right: cancel + save */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/emailManagement/templates")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-700 hover:border-slate-300 transition-all duration-150 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.03] active:scale-100"
                  style={{ background: "linear-gradient(135deg,#EAB308,#CA8A04)" }}
                >
                  {isLoading
                    ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t("saving")}</>)
                    : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        {t("save_changes")}
                      </>
                    )
                  }
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default Page;