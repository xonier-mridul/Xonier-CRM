"use client";

import React, { JSX, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskService } from "@/src/services/tasks.service";
import {
  UpdateTaskPayload,
  TASK_PRIORITY,
  TASK_ENTITY_TYPE,
  RECURRENCE_TYPE,
  TaskPermissions,
  TaskItem,
} from "@/src/types/task/task.types";

// ── Priority config ───────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<TASK_PRIORITY, { label: string; bg: string; text: string; border: string; dot: string }> = {
  [TASK_PRIORITY.LOW]:    { label: "Low",    bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200",  dot: "bg-slate-400"  },
  [TASK_PRIORITY.MEDIUM]: { label: "Medium", bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200",  dot: "bg-amber-400"  },
  [TASK_PRIORITY.HIGH]:   { label: "High",   bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", dot: "bg-orange-500" },
  [TASK_PRIORITY.URGENT]: { label: "Urgent", bg: "bg-rose-50",   text: "text-rose-600",   border: "border-rose-200",   dot: "bg-rose-500"   },
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

// ── UI primitives ─────────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label:    string;
  required?: boolean;
  hint?:    string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-rose-500 text-xs">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const UpdateTaskPage = (): JSX.Element => {
  const router            = useRouter();
  const params            = useParams();
  const taskId            = params?.id as string;
  const { hasPermission } = usePermissions();

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading]   = useState(false);
  const [err, setErr]               = useState<string | null>(null);
  const [original, setOriginal]     = useState<TaskItem | null>(null);
  const [tagInput, setTagInput]     = useState("");

  const [form, setForm] = useState<UpdateTaskPayload>({
    title:            "",
    description:      "",
    priority:         TASK_PRIORITY.MEDIUM,
    dueDate:          "",
    startDate:        "",
    estimatedHours:   undefined,
    actualHours:      undefined,
    isRecurring:      false,
    recurrenceType:   undefined,
    recurrenceEndsAt: "",
    tags:             [],
    attachments:      [],
    entityType:       undefined,
    entityId:         "",
    entityName:       "",
  });

  const set = <K extends keyof UpdateTaskPayload>(k: K, v: UpdateTaskPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  // ── Load task ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      setIsFetching(true);
      try {
        const res = await TaskService.getById(taskId);
        if (res.status === 200) {
          const t = res.data.data;
          setOriginal(t);
          setForm({
            title:            t.title,
            description:      t.description   ?? "",
            priority:         t.priority,
            dueDate:          t.dueDate        ?? "",
            startDate:        t.startDate      ?? "",
            estimatedHours:   t.estimatedHours,
            actualHours:      t.actualHours,
            isRecurring:      t.isRecurring,
            recurrenceType:   t.recurrenceType,
            recurrenceEndsAt: t.recurrenceEndsAt ?? "",
            tags:             t.tags        ?? [],
            attachments:      t.attachments ?? [],
            entityType:       t.entityType,
            entityId:         t.entityId   ?? "",
            entityName:       t.entityName ?? "",
          });
        }
      } catch (e) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
        toast.error("Failed to load task");
        router.back();
      } finally {
        setIsFetching(false);
      }
    })();
  }, [taskId]);

  // ── Tag helpers ───────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) set("tags", [...(form.tags ?? []), t]);
    setTagInput("");
  };
  const removeTag = (t: string) => set("tags", form.tags?.filter(x => x !== t) ?? []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErr(null);
    if (form.title !== undefined && !form.title.trim()) {
      setErr("Title cannot be empty."); return;
    }
    if (form.isRecurring && !form.recurrenceType) {
      setErr("Recurrence type is required when task is recurring."); return;
    }
    setIsLoading(true);
    try {
      const res = await TaskService.update(taskId, form);
      if (res.status === 200) {
        toast.success("Task updated successfully");
        router.push("/tasks");
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message ?? "Something went wrong";
        setErr(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = hasPermission(TaskPermissions.EDIT_TASK);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Loading task…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Update Task
            </h1>
          </div>
          {original && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Editing:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {original.title}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition"
        >
          ← Back
        </button>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400 font-medium">
          <span>⚠️</span> {err}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 items-start">

        {/* ── Left 2/3 ─────────────────────────────────────────────────── */}
        <div className="col-span-2 space-y-6">

          {/* Basic info */}
          <Section icon="📝" title="Basic Information">
            <Field label="Title" required>
              <input
                type="text" value={form.title ?? ""}
                onChange={e => set("title", e.target.value)}
                placeholder="Task title"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description ?? ""}
                onChange={e => set("description", e.target.value)}
                placeholder="Task description…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </Section>

          {/* Scheduling */}
          <Section icon="📅" title="Scheduling">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <input type="date" value={form.startDate ?? ""} onChange={e => set("startDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Due Date">
                <input type="date" value={form.dueDate ?? ""} onChange={e => set("dueDate", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estimated Hours" hint="Original estimate">
                <input
                  type="number" min={0} step={0.5}
                  value={form.estimatedHours ?? ""}
                  onChange={e => set("estimatedHours", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.0" className={inputCls}
                />
              </Field>
              <Field label="Actual Hours" hint="Time actually spent">
                <input
                  type="number" min={0} step={0.5}
                  value={form.actualHours ?? ""}
                  onChange={e => set("actualHours", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.0" className={inputCls}
                />
              </Field>
            </div>

            {/* Recurring */}
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                form.isRecurring
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
              }`}
              onClick={() => { set("isRecurring", !form.isRecurring); if (form.isRecurring) set("recurrenceType", undefined); }}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                form.isRecurring ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-500"
              }`}>
                {form.isRecurring && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Recurring Task</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Repeats on a set schedule</p>
              </div>
            </div>

            {form.isRecurring && (
              <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-blue-300 dark:border-blue-600 ml-1">
                <Field label="Recurrence Type" required>
                  <select
                    value={form.recurrenceType ?? ""}
                    onChange={e => set("recurrenceType", e.target.value as RECURRENCE_TYPE || undefined)}
                    className={selectCls}
                  >
                    <option value="">Select…</option>
                    {Object.values(RECURRENCE_TYPE).map(r => (
                      <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ends At">
                  <input type="date" value={form.recurrenceEndsAt ?? ""} onChange={e => set("recurrenceEndsAt", e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
          </Section>

          {/* Entity */}
          <Section icon="🔗" title="Linked Entity">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Entity Type">
                <select
                  value={form.entityType ?? ""}
                  onChange={e => set("entityType", e.target.value as TASK_ENTITY_TYPE || undefined)}
                  className={selectCls}
                >
                  <option value="">None</option>
                  {Object.values(TASK_ENTITY_TYPE).map(et => (
                    <option key={et} value={et}>{et.charAt(0) + et.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </Field>
              <Field label="Entity ID">
                <input type="text" value={form.entityId ?? ""} onChange={e => set("entityId", e.target.value)} placeholder="ID…" className={inputCls} />
              </Field>
              <Field label="Entity Name">
                <input type="text" value={form.entityName ?? ""} onChange={e => set("entityName", e.target.value)} placeholder="Name…" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Tags */}
          <Section icon="🏷️" title="Tags">
            <div className="flex gap-2">
              <input
                type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Type tag and press Enter…"
                className={`${inputCls} flex-1`}
              />
              <button type="button" onClick={addTag}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 transition whitespace-nowrap">
                + Add
              </button>
            </div>
            {(form.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags?.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-700">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-700 transition leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Right 1/3 ────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Priority */}
          <Section icon="🎯" title="Priority">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TASK_PRIORITY).map(p => {
                const cfg    = PRIORITY_CFG[p];
                const active = form.priority === p;
                return (
                  <button key={p} type="button" onClick={() => set("priority", p)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      active ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : "border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-200"
                    }`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? cfg.dot : "bg-gray-300 dark:bg-gray-600"}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Task info (read-only) */}
          {original && (
            <Section icon="ℹ️" title="Task Info">
              <div>
                <InfoRow label="Category" value={original.categoryName ?? original.category} />
                <InfoRow label="Status" value={
                  <span className="inline-flex items-center gap-1">
                    {original.statusIcon && <span>{original.statusIcon}</span>}
                    {original.statusName ?? original.status}
                  </span>
                } />
                <InfoRow label="Created" value={new Date(original.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
                <InfoRow label="Updated" value={new Date(original.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
                {original.assignedTo.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Assigned To</p>
                    <div className="space-y-1.5">
                      {original.assignedTo.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{u.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {canEdit ? (
              <button
                type="button" disabled={isLoading} onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Saving…</>
                  : "✓ Save Changes"
                }
              </button>
            ) : (
              <div className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-center text-xs text-gray-400 font-medium">
                No permission to edit tasks
              </div>
            )}
            <button type="button" onClick={() => router.back()}
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateTaskPage;