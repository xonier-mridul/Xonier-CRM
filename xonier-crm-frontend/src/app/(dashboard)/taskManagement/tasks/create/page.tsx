"use client";

import React, { JSX, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskService } from "@/src/services/tasks.service";
import { CategoryService } from "@/src/services/category.service";
import { StatusService } from "@/src/services/status.service";
import {
    CreateTaskPayload,
    TASK_PRIORITY,
    TASK_ENTITY_TYPE,
    RECURRENCE_TYPE,
    TaskPermissions,
    CategoryOption,
    StatusOption,
    UserOption,
} from "@/src/types/task/task.types";

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<TASK_PRIORITY, { label: string; bg: string; text: string; border: string; dot: string }> = {
    [TASK_PRIORITY.LOW]: { label: "Low", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" },
    [TASK_PRIORITY.MEDIUM]: { label: "Medium", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", dot: "bg-amber-400" },
    [TASK_PRIORITY.HIGH]: { label: "High", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", dot: "bg-orange-500" },
    [TASK_PRIORITY.URGENT]: { label: "Urgent", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", dot: "bg-rose-500" },
};

// ── Shared style tokens ───────────────────────────────────────────────────────
const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

const selectCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    {title}
                </h3>
            </div>
            <div className="p-6 space-y-5">{children}</div>
        </div>
    );
}

function Field({ label, required, hint, children }: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {label}
                {required && <span className="text-rose-500 text-xs">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const CreateTaskPage = (): JSX.Element => {
    const router = useRouter();
    const { hasPermission } = usePermissions();

    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const [form, setForm] = useState<CreateTaskPayload>({
        title: "",
        description: "",
        category: "",
        status: "",
        priority: TASK_PRIORITY.MEDIUM,
        entityType: undefined,
        entityId: "",
        entityName: "",
        assignedTo: [],
        dueDate: "",
        startDate: "",
        estimatedHours: undefined,
        isRecurring: false,
        recurrenceType: undefined,
        recurrenceEndsAt: "",
        tags: [],
        attachments: [],
        parentTask: "",
        order: 0,
    });

    // helpers
    const set = <K extends keyof CreateTaskPayload>(k: K, v: CreateTaskPayload[K]) =>
        setForm(p => ({ ...p, [k]: v }));

    // ── Lookups ───────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [catRes, statusRes] = await Promise.all([
                    CategoryService.getAll({ currentPage: 1, pageLimit: 100 }),
                    StatusService.getAll({ currentPage: 1, pageLimit: 100 }),
                ]);
                if (catRes.status === 200) setCategories(catRes.data.data.data ?? []);
                if (statusRes.status === 200) setStatuses(statusRes.data.data.data ?? []);
            } catch (e) {
                process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
            }
        })();
    }, []);

    // ── Tag helpers ───────────────────────────────────────────────────────────
    const addTag = () => {
        const t = tagInput.trim();
        if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
        setTagInput("");
    };

    const removeTag = (t: string) => set("tags", form.tags.filter(x => x !== t));

    const toggleAssignee = (id: string) =>
        set("assignedTo", form.assignedTo.includes(id)
            ? form.assignedTo.filter(x => x !== id)
            : [...form.assignedTo, id]);

    // ── Validate ──────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        if (!form.title.trim()) { setErr("Title is required."); return false; }
        if (!form.category) { setErr("Category is required."); return false; }
        if (form.isRecurring && !form.recurrenceType) {
            setErr("Recurrence type is required when task is recurring.");
            return false;
        }
        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setErr(null);
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await TaskService.create(form);
            if (res.status === 200 || res.status === 201) {
                toast.success("Task created successfully");
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

    const canCreate = hasPermission(TaskPermissions.CREATE_TASK);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-100 rounded-2xl dark:bg-gray-900">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-2xl">✏️</span>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Create Task
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Fill in the details to add a new task to your project.
                    </p>
                </div>

            </div>

            {/* Error banner */}
            {err && (
                <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠️</span> {err}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6 items-start">

                {/* ── Left: 2/3 ─────────────────────────────────────────────────── */}
                <div className="col-span-2 space-y-6">

                    {/* Basic info */}
                    <Section icon="📝" title="Basic Information">
                        <Field label="Title" required>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => set("title", e.target.value)}
                                placeholder="Enter a clear, descriptive title…"
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Description">
                            <textarea
                                value={form.description ?? ""}
                                onChange={e => set("description", e.target.value)}
                                placeholder="Describe the task, acceptance criteria, context…"
                                rows={4}
                                className={`${inputCls} resize-none`}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Category" required>
                                <select
                                    value={form.category}
                                    onChange={e => set("category", e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Select category…</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Status">
                                <select
                                    value={form.status ?? ""}
                                    onChange={e => set("status", e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Select status…</option>
                                    {statuses.map(s => (
                                        <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
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

                        <Field label="Estimated Hours" hint="Decimal values allowed, e.g. 2.5">
                            <input
                                type="number" min={0} step={0.5}
                                value={form.estimatedHours ?? ""}
                                onChange={e => set("estimatedHours", e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="0.0"
                                className={inputCls}
                            />
                        </Field>

                        {/* Recurring toggle */}
                        <div
                            className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${form.isRecurring
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                                : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
                                }`}
                            onClick={() => { set("isRecurring", !form.isRecurring); if (form.isRecurring) set("recurrenceType", undefined); }}
                        >
                            <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${form.isRecurring ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-500"
                                }`}>
                                {form.isRecurring && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">Recurring Task</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    This task repeats on a schedule
                                </p>
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

                    {/* Entity link */}
                    <Section icon="🔗" title="Link to Entity">
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


                </div>

                {/* ── Right: 1/3 ────────────────────────────────────────────────── */}
                <div className="space-y-6">

                    {/* Priority */}
                    <Section icon="🎯" title="Priority">
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(TASK_PRIORITY).map(p => {
                                const cfg = PRIORITY_CFG[p];
                                const active = form.priority === p;
                                return (
                                    <button
                                        key={p} type="button"
                                        onClick={() => set("priority", p)}
                                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${active
                                            ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                                            : "border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-200"
                                            }`}
                                    >
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? cfg.dot : "bg-gray-300 dark:bg-gray-600"}`} />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Assign To */}
                    <Section icon="👥" title="Assign To">
                        {users.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-3xl mb-2">👤</div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">No users available</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {users.map(u => {
                                    const checked = form.assignedTo.includes(u.id);
                                    return (
                                        <label
                                            key={u.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked
                                                ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                                                : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                        >
                                            <input
                                                type="checkbox" checked={checked}
                                                onChange={() => toggleAssignee(u.id)}
                                                className="w-4 h-4 accent-blue-600 shrink-0"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{u.name}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {form.assignedTo.length > 0 && (
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                ✓ {form.assignedTo.length} user{form.assignedTo.length > 1 ? "s" : ""} selected
                            </p>
                        )}
                    </Section>
                    {/* Tags */}
                    <Section icon="🏷️" title="Tags">
                        <div className="flex gap-2">
                            <input
                                type="text" value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                                placeholder="Type tag and press Enter or Add…"
                                className={`${inputCls} flex-1`}
                            />
                            <button
                                type="button" onClick={addTag}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 transition whitespace-nowrap"
                            >
                                + Add
                            </button>
                        </div>
                        {form.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {form.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-700">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 leading-none transition">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </Section>
                    {/* Order */}
                    <Section icon="🔢" title="Display Order">
                        <Field label="Order" hint="Lower number appears first">
                            <input
                                type="number" min={0}
                                value={form.order}
                                onChange={e => set("order", Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                    </Section>

                    {/* Actions */}
                </div>
            </div>
            <div className="flex justify-end gap-3 w-full m-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-[200px] px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    Cancel
                </button>
                {canCreate ? (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className="w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Creating…
                            </>
                        ) : (
                            "✓ Create Task"
                        )}
                    </button>
                ) : (
                    <div className="w-[200px] px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-center text-xs text-gray-400 font-medium">
                        No permission to create tasks
                    </div>
                )}



            </div>
        </div>
    );
};

export default CreateTaskPage;