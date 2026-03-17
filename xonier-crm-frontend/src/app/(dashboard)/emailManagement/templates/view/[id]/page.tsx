"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { Template, Variable } from "@/src/types/communication/mail.types";
import { MailService } from "@/src/services/communication/mail.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";

const labelBase =
  "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";

const FetchingSkeleton = () => (
  <div className="ml-72 mt-14 p-8 min-h-screen" style={{ background: "#F8F7FF" }}>
    <div className="mb-7 flex items-start justify-between">
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-40 rounded-lg bg-slate-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-7 w-72 rounded-xl bg-slate-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-52 rounded-lg bg-slate-100 dark:bg-gray-700 animate-pulse" />
      </div>
      <div className="flex gap-2 mt-1">
        <div className="h-9 w-24 rounded-xl bg-slate-100 dark:bg-gray-700 animate-pulse" />
        <div className="h-9 w-32 rounded-xl bg-violet-100 dark:bg-violet-900/30 animate-pulse" />
      </div>
    </div>
    {/* Two-column layout skeleton */}
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
      {/* Left panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-4">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-9 rounded-xl bg-slate-100 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
      {/* Right panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="h-10 bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-600 animate-pulse" />
        <div className="p-6">
          <div className="h-[480px] rounded-xl bg-slate-100 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

const Badge = ({
  children,
  color = "violet",
}: {
  children: React.ReactNode;
  color?: "violet" | "emerald" | "amber" | "slate" | "blue" | "cyan";
}) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    violet:  { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
    emerald: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    amber:   { bg: "#FEF9C3", text: "#92400E", border: "#FDE047" },
    slate:   { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
    blue:    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
    cyan:    { bg: "#ECFEFF", text: "#155E75", border: "#A5F3FC" },
  };
  const c = colors[color];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {children}
    </span>
  );
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelBase}>{label}</label>
    <div className="text-sm text-slate-700 dark:text-slate-300">{children}</div>
  </div>
);

const Divider = () => (
  <div className="h-px w-full bg-slate-100 dark:bg-gray-700" />
);

const EmailClientPreview = ({
  subject,
  from,
  to,
  date,
  html,
}: {
  subject: string;
  from: string;
  to: string;
  date: string;
  html: string;
}) => {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-gray-600 overflow-hidden shadow-md bg-white dark:bg-gray-800">

      {/* ── Window chrome bar ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-gray-600"
        style={{ background: "#F8F7FF" }}
      >
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs font-semibold text-slate-400 dark:text-slate-500 flex-1 truncate">
           Email Preview — {subject || "No Subject"}
        </span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">preview mode</span>
      </div>

      {/* ── Email header section ── */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Subject */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 leading-snug">
          {subject || <span className="text-slate-400 italic">No subject</span>}
        </h2>

        {/* From / To / Date row */}
        <div className="flex flex-col gap-2.5">
          {/* From */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
            >
              {from?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{from || "sender@example.com"}</span>
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">&lt;{from || "sender@example.com"}&gt;</span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">{date}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-400 dark:text-slate-500">To:</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">{to || "recipient@example.com"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email action icons row (decorative) */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-50 dark:border-gray-700/50">
          {[
            { title: "Reply", path: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
            { title: "Reply All", path: "M15 10h-2M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
            { title: "Forward", path: "M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" },
            { title: "Star", path: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
            { title: "Archive", path: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
            { title: "Delete", path: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
          ].map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={btn.path} />
              </svg>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-default">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Email body ── */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {/* Inline styles to render the HTML body naturally */}
        <style>{`
          .email-body-preview { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #334155; line-height: 1.7; }
          .email-body-preview h1 { font-size: 1.4rem; font-weight: 700; margin: .75rem 0 .4rem; color: #1e293b; }
          .email-body-preview h2 { font-size: 1.2rem; font-weight: 700; margin: .6rem 0 .3rem; color: #1e293b; }
          .email-body-preview h3 { font-size: 1.05rem; font-weight: 600; margin: .5rem 0 .25rem; color: #1e293b; }
          .email-body-preview p  { margin: .5rem 0; }
          .email-body-preview ul { list-style: disc;    padding-left: 1.4rem; margin: .5rem 0; }
          .email-body-preview ol { list-style: decimal; padding-left: 1.4rem; margin: .5rem 0; }
          .email-body-preview li { margin: .2rem 0; }
          .email-body-preview a  { color: #7c3aed; text-decoration: underline; }
          .email-body-preview strong { font-weight: 700; }
          .email-body-preview em     { font-style: italic; }
          .email-body-preview s      { text-decoration: line-through; }
          .email-body-preview blockquote { border-left: 3px solid #a78bfa; padding-left: 1rem; color: #64748b; font-style: italic; margin: .5rem 0; }
          .email-body-preview code { background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; border-radius: 4px; padding: 0 4px; font-size: .8em; font-family: monospace; }
          .email-body-preview hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
          /* variable highlight */
          .email-body-preview * { --var-color: #7c3aed; }
        `}</style>
        <div
          className="email-body-preview px-6 py-5"
          dangerouslySetInnerHTML={{ __html: html || "<p style='color:#94a3b8;font-style:italic;'>No email body content.</p>" }}
        />
      </div>

      {/* ── Footer (simulate email client footer) ── */}
      <div className="px-6 py-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/60 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          This is a template preview — variable placeholders like{" "}
          <code className="font-mono text-violet-500 bg-violet-50 dark:bg-violet-900/30 px-1 rounded">{"{{name}}"}</code>{" "}
          will be replaced with real values on send
        </span>
        <button
          type="button"
          onClick={() => {
            const html_content = html ?? "";
            navigator.clipboard.writeText(html_content);
            toast.success("HTML copied to clipboard");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-gray-700 hover:border-slate-300 transition-all duration-150 cursor-pointer ml-4 flex-shrink-0"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Copy HTML
        </button>
      </div>
    </div>
  );
};

// ─── Variable Chip (read-only) ────────────────────────────────────────────────
const VarChip = ({ variable }: { variable: Variable & { isCustom?: boolean } }) => (
  <div
    title={variable.description}
    className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border"
    style={{
      background: variable.isCustom ? "#FEFCE8" : "#F5F3FF",
      borderColor: variable.isCustom ? "#FDE047" : "#DDD6FE",
    }}
  >
    <span className="text-xs font-semibold leading-tight" style={{ color: variable.isCustom ? "#92400E" : "#5B21B6" }}>
      {variable.label}
      {variable.is_required && <span className="ml-1 text-red-400 font-bold">*</span>}
    </span>
    <span className="font-mono text-[10px] leading-tight opacity-60" style={{ color: variable.isCustom ? "#B45309" : "#7C3AED" }}>
      {`{{${variable.key}}}`}
    </span>
  </div>
);

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id     = params?.id as string;
  const { hasPermission } = usePermissions();
  const [isLoading,    setIsLoading]    = useState(false);
  const [templateData, setTemplateData] = useState<Template | null>(null);

  const getTemplateData = async () => {
    setIsLoading(true);
    try {
      const result = await MailService.getById(id);
      if (result.status === 200) {
        setTemplateData(result.data.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { getTemplateData(); }, []);

  if (isLoading || !templateData) return <FetchingSkeleton />;

  const t = templateData;
  const templateVars: Variable[] = t.variables ?? [];

  const categoryLabel = t.category
    ? t.category.charAt(0).toUpperCase() + t.category.slice(1).toLowerCase().replace(/_/g, " ")
    : null;

  // Simulated email metadata
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
                  " at " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="ml-72 mt-14 p-8 min-h-screen" style={{ background: "#F8F7FF" }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
            <button
              type="button"
              onClick={() => router.push("/emailManagement/templates")}
              className="hover:text-violet-600 transition-colors cursor-pointer"
            >
              Templates
            </button>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-400">View</span>
          </div>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.name || "Template Details"}
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Read-only preview · ID:{" "}
            <code className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 text-violet-700 dark:text-violet-300">
              {id}
            </code>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
        {
          (hasPermission(PERMISSIONS.updateTemplate)&&(
            <button
            type="button"
            onClick={() => router.push(`/emailManagement/templates/update/${id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 cursor-pointer hover:shadow-lg hover:scale-[1.03] active:scale-100"
            style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit Template
          </button>
          ))
        }
          
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">

        {/* ══ LEFT: Template metadata panel ══════════════════════ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden sticky top-6">
          {/* Accent strip */}
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#7C3AED 0%,#06B6D4 100%)" }} />

          <div className="p-6 flex flex-col gap-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Template Info
            </p>

            {/* Name */}
            <InfoRow label="Template Name">
              <span className="font-semibold text-slate-800 dark:text-white">{t.name || "—"}</span>
            </InfoRow>

            <Divider />

            {/* Subject */}
            <InfoRow label="Subject">
              <span className="text-slate-700 dark:text-slate-300 leading-snug">{t.subject || "—"}</span>
            </InfoRow>

            <Divider />

            {/* Category + Privacy in 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Category">
                {categoryLabel
                  ? <Badge color="violet">{categoryLabel}</Badge>
                  : <span className="text-slate-400 text-sm">—</span>
                }
              </InfoRow>
              <InfoRow label="Privacy">
                {t.privacy === "PUBLIC"
                  ? <Badge color="emerald">🌐 Public</Badge>
                  : <Badge color="slate">🔒 Private</Badge>
                }
              </InfoRow>
            </div>

            <Divider />

            {/* Status */}
            <InfoRow label="Status">
              {t.status
                ? <Badge color={t.status === "active" ? "emerald" : "amber"}>
                    {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </Badge>
                : <span className="text-slate-400 text-sm">—</span>
              }
            </InfoRow>

            {/* Tags */}
            {t.tags && t.tags.length > 0 && (
              <>
                <Divider />
                <InfoRow label="Tags">
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {t.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                        style={{ background: "#EDE9FE", color: "#5B21B6" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </InfoRow>
              </>
            )}

            {/* Variables */}
            {templateVars.length > 0 && (
              <>
                <Divider />
                <div>
                  <label className={labelBase}>Variables ({templateVars.length})</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {templateVars.map((v) => (
                      <VarChip key={v.key} variable={{ ...v, isCustom: true }} />
                    ))}
                  </div>
                </div>

                {/* Variable detail table */}
                <div className="rounded-xl border border-violet-100 dark:border-violet-900/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/30">
                        <th className="text-left px-3 py-2 font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Key</th>
                        <th className="text-left px-3 py-2 font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Label</th>
                        <th className="text-center px-3 py-2 font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Req.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateVars.map((v, i) => (
                        <tr
                          key={v.key}
                          className={i % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-violet-50/40 dark:bg-violet-900/10"}
                        >
                          <td className="px-3 py-2">
                            <code className="font-mono text-[10px] bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 px-1.5 py-0.5 rounded text-violet-700 dark:text-violet-300">
                              {`{{${v.key}}}`}
                            </code>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{v.label}</td>
                          <td className="px-3 py-2 text-center">
                            {v.is_required
                              ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 text-[9px] font-bold">✓</span>
                              : <span className="text-slate-300">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <Divider />
          </div>
        </div>

        {/* ══ RIGHT: Email client preview ═══════════════════════ */}
        <EmailClientPreview
          subject={t.subject ?? ""}
          from="noreply@yourcompany.com"
          to="recipient@example.com"
          date={dateStr}
          html={t.html_body ?? ""}
        />
      </div>
    </div>
  );
}