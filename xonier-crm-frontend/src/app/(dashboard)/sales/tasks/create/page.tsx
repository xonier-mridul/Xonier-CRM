"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ListTodo } from "lucide-react";
import extractErrorMessages from "@/src/app/utils/error.utils";
import SalesTaskService, {
  SALES_TASK_DRAFT_KEY, type SalesTaskDraft, type SalesTaskPreview, type SalesTaskResult,
} from "@/src/services/sales-task.service";

const inputClass = "mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function CreateSalesTaskPage() {
  const [draft, setDraft] = useState<SalesTaskDraft>();
  const [preview, setPreview] = useState<SalesTaskPreview>();
  const [result, setResult] = useState<SalesTaskResult>();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const requestInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadAssignment = async () => {
      const stored = sessionStorage.getItem(SALES_TASK_DRAFT_KEY);
      if (!stored) return null;
      const selection: SalesTaskDraft = JSON.parse(stored);
      const { mode, userId, leadIds } = selection;
      const { data } = await SalesTaskService.preview({ mode, userId, leadIds }, controller.signal);
      return { selection, preview: data.data };
    };
    loadAssignment()
      .then(assignment => {
        if (controller.signal.aborted) return;
        if (!assignment) {
          setError("Select leads and an assignee from the Leads page to create a Sales task.");
          return;
        }
        setPreview(assignment.preview);
        setDraft(assignment.selection);
      })
      .catch(error => {
        if (!controller.signal.aborted) setError(extractErrorMessages(error).join(" "));
      });
    return () => controller.abort();
  }, []);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(SALES_TASK_DRAFT_KEY);
    } catch {
      // Storage may become unavailable after opening the form.
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !title.trim() || !dueDate || requestInProgress.current) return;
    requestInProgress.current = true;
    setSaving(true);
    setError("");
    try {
      const { mode, userId, leadIds, requestId } = draft;
      const { data } = await SalesTaskService.create({ mode, userId, leadIds, requestId, title, dueDate, instructions });
      setResult(data.data);
      clearDraft();
    } catch (error) {
      setError(extractErrorMessages(error).join(" "));
    } finally {
      requestInProgress.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        {saving ? <span className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} /> Leads</span> : (
          <Link href="/leads" onClick={clearDraft} className="inline-flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300">
            <ArrowLeft size={16} /> Leads
          </Link>
        )}
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
          <ListTodo size={23} className="text-teal-700 dark:text-teal-300" /> Create Sales Task
        </h1>
      </header>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-6">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {result ? (
          <div className="space-y-3">
            <p role="status" className="font-semibold">
              {result.tasksCreated ? `${result.tasksCreated} Sales task(s) created and assigned to ${preview?.assigneeName}.` : "No Sales tasks were created."}
            </p>
            {!!result.skippedRecords.length && (
              <details className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700" open={!result.tasksCreated}>
                <summary className="cursor-pointer font-medium">{result.skippedRecords.length} skipped lead(s)</summary>
                <ul className="mt-2 space-y-1">
                  {result.skippedRecords.map(record => <li key={record.leadId}>{record.lead_id !== "N/A" ? `${record.lead_id} · ` : ""}{record.reason}</li>)}
                </ul>
              </details>
            )}
            <Link href="/leads" className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Back to Leads</Link>
          </div>
        ) : !draft || !preview ? (
          !error && <p role="status" className="text-sm">Loading assignment…</p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p className="font-medium">Assignee · {preview.assigneeName}</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-slate-600 dark:text-slate-300">
                {preview.leads.map(lead => <li key={lead.id}>{lead.name || "Lead"}{lead.code ? ` · ${lead.code}` : ""}</li>)}
              </ul>
              {preview.leads.length < new Set(draft.leadIds).size && <p className="mt-2 text-xs">Some selected leads are unavailable and will be skipped.</p>}
              {preview.leads.length > 1 && <p className="mt-2 text-xs">One task will be created for each eligible lead.</p>}
            </div>
            <label className="block text-sm font-medium">Task title
              <input className={inputClass} value={title} onChange={event => setTitle(event.target.value)} required maxLength={150} disabled={saving} />
            </label>
            <label className="block text-sm font-medium">Due date
              <input type="date" className={inputClass} value={dueDate} onChange={event => setDueDate(event.target.value)} required disabled={saving} />
            </label>
            <label className="block text-sm font-medium">Instructions <span className="font-normal text-slate-500">(optional)</span>
              <textarea className={inputClass} value={instructions} onChange={event => setInstructions(event.target.value)} rows={4} maxLength={2000} disabled={saving} />
            </label>
            <div className="flex flex-wrap justify-end gap-3">
              {!saving && <Link href="/leads" onClick={clearDraft} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-600">Cancel</Link>}
              <button type="submit" disabled={saving || !preview.leads.length || !title.trim() || !dueDate}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                {saving ? "Saving…" : draft.mode === "reassign" ? "Reassign & Create Task" : "Assign & Create Task"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
