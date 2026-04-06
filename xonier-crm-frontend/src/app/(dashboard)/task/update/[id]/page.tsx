"use client";

import React, { JSX, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskService } from "@/src/services/tasks.service";
import { CategoryService } from "@/src/services/category.service";
import { StatusService } from "@/src/services/status.service";
import {
  UpdateTaskPayload,
  TASK_PRIORITY,
  TASK_ENTITY_TYPE,
  RECURRENCE_TYPE,
  TaskItem,
  CategoryOption,
  StatusOption,
  UserOption,
} from "@/src/types/task/task.types";
import { PERMISSIONS } from "@/src/constants/enum";
import { User } from "@/src/types";
import { AuthService } from "@/src/services/auth.service";
import { RootState } from "@/src/store";
import { useSelector } from "react-redux";
import  { CategoryItem } from "@/src/types/task/category.types";

// ── Priority config ───────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<
  TASK_PRIORITY,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  [TASK_PRIORITY.LOW]: {
    label: "Low",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: "Medium",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    dot: "bg-amber-400",
  },
  [TASK_PRIORITY.HIGH]: {
    label: "High",
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  [TASK_PRIORITY.URGENT]: {
    label: "Urgent",
    bg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition";

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDateInputValue = (date?: string | Date | null): string => {
  if (!date) return "";
  const d = new Date(date as string | Date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const parseDateInput = (value: string): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
};

// ── UI primitives ─────────────────────────────────────────────────────────────
function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
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

interface AssignedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}{" "}
        {required && <span className="text-rose-500 text-xs">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </span>
      <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">
        {value}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const UpdateTaskPage = (): JSX.Element => {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id as string;
  const { hasPermission } = usePermissions();

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [original, setOriginal] = useState<TaskItem | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [userData, setUserData] = useState<User[]>([]);

  
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  
  const [form, setForm] = useState<UpdateTaskPayload>({
    title: "",
    description: "",
    priority: TASK_PRIORITY.MEDIUM,
    category: "",
    status: "",
    dueDate: undefined,
    startDate: undefined,
    estimatedHours: undefined,
    actualHours: undefined,
    isRecurring: false,
    recurrenceType: undefined,
    recurrenceEndsAt: undefined,
    tags: [],
    attachments: [],
    entityType: undefined,
    entityId: "",
    entityName: "",
    assignedTo: [],
  });

  const auth = useSelector((state: RootState) => state.auth);

  
  const set = <K extends keyof UpdateTaskPayload>(
    k: K,
    v: UpdateTaskPayload[K]
  ) => {
    setForm((p) => ({ ...p, [k]: v }));
}
  
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      setIsFetching(true);
      try {
        const res = await TaskService.getById(taskId);
        if (res.status === 200) {
          const t: TaskItem = res.data.data;
          setOriginal(t);

          
          const categoryId = t.category?.id ?? t.category?.id ?? "";

          setForm({
            title: t.title ?? "",
            description: t.description ?? "",
            priority: t.priority ?? TASK_PRIORITY.MEDIUM,
            category: categoryId,          
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
            startDate: t.startDate ? new Date(t.startDate) : undefined,
            estimatedHours: t.estimatedHours ?? undefined,
            actualHours: t.actualHours ?? undefined,
            isRecurring: t.isRecurring ?? false,
            recurrenceType: t.recurrenceType ?? undefined,
            recurrenceEndsAt: t.recurrenceEndsAt ? new Date(t.recurrenceEndsAt) : undefined,  
            tags: t.tags ?? [],
            attachments: t.attachments ?? [],
            entityType: t.entityType ?? undefined,
            entityId: t.entityId ?? "",
            entityName: t.entityName ?? "",
            assignedTo: t.assignedTo?.map((u: { id: string }) => u.id) ?? [],
            status: t.status?.id ?? "",
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

  // ── Load categories ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const catRes = await CategoryService.getAll({
          currentPage: 1,
          pageLimit: 100,
          search: "",
        });
        if (catRes.status === 200)
          setCategories(catRes.data.data.data ?? []);
      } catch (e) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      }
    })();
  }, []);

  // ── Load statuses whenever selected category changes ──────────────────────
  // FIX: Watch `form.category` (single source of truth) instead of a separate
  // `selectedCategory` variable that could drift out of sync.
  useEffect(() => {
    if (!form.category) {
      setStatuses([]);
      return;
    }
    (async () => {
      try {
        const statusRes = await StatusService.getById(form.category|| "" as string);
        if (statusRes.status === 200)
          setStatuses(statusRes.data.data ?? []);
      } catch (e) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      }
    })();
  }, [form.category]);

  // ── Load users ────────────────────────────────────────────────────────────
  const getUserName = (u: AssignedUser) =>
    u.name ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    "User";

  useEffect(() => {
    (async () => {
      try {
        const result = await AuthService.getAllActiveWithoutPagination();
        if (result.status === 200) setUserData(result.data.data);
      } catch (error) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        if (axios.isAxiosError(error)) {
          const msg =
            error.response?.data?.message ?? "Something went wrong";
          toast.error(typeof msg === "string" ? msg : "Something went wrong");
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!userData.length) return;
    setUsers(
      userData.map((u) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
      }))
    );
  }, [userData]);

  // ── Tag helpers ───────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) set("tags", [...(form.tags ?? []), t]);
    setTagInput("");
  };
  const removeTag = (t: string) =>
    set("tags", form.tags?.filter((x) => x !== t) ?? []);

  // ── Assignee helpers ──────────────────────────────────────────────────────
  const toggleAssignee = (id: string) =>
    set(
      "assignedTo",
      (form.assignedTo ?? []).includes(id)
        ? (form.assignedTo ?? []).filter((x) => x !== id)
        : [...(form.assignedTo ?? []), id]
    );

  // ── Validation ────────────────────────────────────────────────────────────
  // FIX: `validate` now reads `form.category` (single source of truth).
  // All errors are returned as strings so the caller can toast them directly.
  const validate = (): string | null => {
    if (!form.title.trim()) return "Title is required";
    if (!form.category) return "Category is required";
    if (form.isRecurring && !form.recurrenceType)
      return "Recurrence type is required when task is recurring";
    if (
      form.startDate &&
      form.dueDate &&
      new Date(form.startDate as Date) > new Date(form.dueDate as Date)
    )
      return "Start date cannot be after due date";
    return null;
  };

  
  const showErr = (msg: string) => {
    setErr(msg);
    toast.error(msg);
  };

  
  const handleSubmit = async () => {
    setErr(null);
    const validationError = validate();
    if (validationError) {
      showErr(validationError);
      return;
    }

    setIsLoading(true);
    try {
      
      const payload: UpdateTaskPayload = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() ?? "",
        entityId: form.entityId?.trim() ?? "",
        entityName: form.entityName?.trim() ?? "",
        // Dates are already proper Date | undefined coming from parseDateInput
        dueDate: form.dueDate ?? undefined,
        startDate: form.startDate ?? undefined,
        recurrenceEndsAt: form.recurrenceEndsAt ?? undefined,
        // Clear recurrence fields when not recurring
        recurrenceType: form.isRecurring ? form.recurrenceType : undefined,
      };

      const res = await TaskService.update(taskId, payload);
      if (res.status === 200) {
        toast.success("Task updated successfully");
        router.push("/task");
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const msg =
          error.response?.data?.message ?? "Something went wrong";
        showErr(typeof msg === "string" ? msg : Array.isArray(msg) ? msg[0] : "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = hasPermission(PERMISSIONS.updateTask);
  const canAssign = hasPermission(PERMISSIONS.assignTask);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-10 w-10 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
            Loading task…
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ml-72 mt-14 ">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

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
      </div>

      {/* Inline error banner */}
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
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Task title"
                className={inputCls}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Task description…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {/* <Field label="Category" required>
                <select
                  value={form.category ?? ""}
                  onChange={(e) => set("category", e.target.value || "")}
                  className={selectCls}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} &nbsp; {c.name}
                    </option>
                  ))}
                </select>
              </Field> */}
              <Field
                  label="Current Status"
                  hint={!form.status ? "Select a category first" : undefined}
                >
                  <select
                    value={form.status ?? ""}
                    onChange={(e) => set("status", e.target.value)}
                    disabled={!form.category || statuses.length === 0}
                    className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="" disabled> Select status… </option>
                    {statuses.map((s) => (
                      <option key={s.id || s.id} value={s.id || s._id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
            </div>
          </Section>

         
          <Section icon="📅" title="Scheduling">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                
                <input
                  type="date"
                  value={toDateInputValue(form.startDate as Date | string | undefined)}
                  onChange={(e) => set("startDate", parseDateInput(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  value={toDateInputValue(form.dueDate as Date | string | undefined)}
                  onChange={(e) => set("dueDate", parseDateInput(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Estimated Hours" hint="Original estimate">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.estimatedHours ?? ""}
                  onChange={(e) =>
                    set(
                      "estimatedHours",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="0.0"
                  className={inputCls}
                />
              </Field>
              <Field label="Actual Hours" hint="Time actually spent">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.actualHours ?? ""}
                  onChange={(e) =>
                    set(
                      "actualHours",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="0.0"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Recurring toggle */}
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                form.isRecurring
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
              }`}
              onClick={() => {
                const next = !form.isRecurring;
                setForm((p) => ({
                  ...p,
                  isRecurring: next,
                  // FIX: Clear recurrence fields atomically when turning off
                  recurrenceType: next ? p.recurrenceType : undefined,
                  recurrenceEndsAt: next ? p.recurrenceEndsAt : undefined,
                }));
              }}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  form.isRecurring
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-300 dark:border-gray-500"
                }`}
              >
                {form.isRecurring && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  Recurring Task
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Repeats on a set schedule
                </p>
              </div>
            </div>

            {form.isRecurring && (
              <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-blue-300 dark:border-blue-600 ml-1">
                <Field label="Recurrence Type" required>
                  <select
                    value={form.recurrenceType ?? ""}
                    onChange={(e) =>
                      set(
                        "recurrenceType",
                        (e.target.value as RECURRENCE_TYPE) || undefined
                      )
                    }
                    className={selectCls}
                  >
                    <option value="">Select…</option>
                    {Object.values(RECURRENCE_TYPE).map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0) + r.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ends At">
                  <input
                    type="date"
                    value={toDateInputValue(form.recurrenceEndsAt as Date | string | undefined)}
                    onChange={(e) =>
                      set("recurrenceEndsAt", parseDateInput(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Linked Entity */}
          <Section icon="🔗" title="Linked Entity">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Entity Type">
                <select
                  value={form.entityType ?? ""}
                  onChange={(e) =>
                    set(
                      "entityType",
                      (e.target.value as TASK_ENTITY_TYPE) || undefined
                    )
                  }
                  className={selectCls}
                >
                  <option value="">None</option>
                  {Object.values(TASK_ENTITY_TYPE).map((et) => (
                    <option key={et} value={et}>
                      {et.charAt(0) + et.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Entity ID">
                <input
                  type="text"
                  value={form.entityId ?? ""}
                  onChange={(e) => set("entityId", e.target.value)}
                  placeholder="ID…"
                  className={inputCls}
                />
              </Field>
              <Field label="Entity Name">
                <input
                  type="text"
                  value={form.entityName ?? ""}
                  onChange={(e) => set("entityName", e.target.value)}
                  placeholder="Name…"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Tags */}
          <Section icon="🏷️" title="Tags">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Type tag and press Enter…"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 transition whitespace-nowrap"
              >
                + Add
              </button>
            </div>
            {(form.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-700"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 transition leading-none"
                    >
                      ×
                    </button>
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
              {Object.values(TASK_PRIORITY).map((p) => {
                const cfg = PRIORITY_CFG[p];
                const active = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("priority", p)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                        : "border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-200"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        active ? cfg.dot : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Assign To */}
          {(canAssign)&&(<Section icon="👥" title="Assign To">
            {users.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No users available
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">

                {/* Assign to Me shortcut */}
                {(() => {
                  const myId = auth.user?._id || auth.user?.id;
                  const isMeAssigned = (form.assignedTo ?? []).includes(
                    myId || ""
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => myId && toggleAssignee(myId)}
                      className={`w-full mb-2 px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                        isMeAssigned
                          ? "bg-green-50 text-green-600 border-green-200"
                          : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {isMeAssigned ? "✅ Assigned to Me" : "⚡ Assign to Me"}
                    </button>
                  );
                })()}

                {/* User list */}
                {users.map((u) => {
                  const checked = (form.assignedTo ?? []).includes(u.id);
                  const isMe =
                    u.id === (auth.user?._id || auth.user?.id);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isMe
                          ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                          : checked
                          ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignee(u.id)}
                        className="w-4 h-4 accent-blue-600 shrink-0"
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(getUserName(u)[0] || "U").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                          {getUserName(u)}{" "}
                          {isMe && (
                            <span className="text-[10px] text-green-500">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected assignee chips */}
            {(form.assignedTo?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {form.assignedTo?.map((id) => {
                  const user = users.find((u) => u.id === id);
                  const isMe = id === (auth.user?._id || auth.user?.id);
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        isMe
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {(user?.name?.[0] || "U").toUpperCase()}
                      </span>
                      {user?.name || "User"}
                      {isMe && <span className="text-[10px]">(You)</span>}
                      <button
                        onClick={() => toggleAssignee(id)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {(form.assignedTo?.length ?? 0) > 0 && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                ✓ {form.assignedTo!.length} user
                {form.assignedTo!.length > 1 ? "s" : ""} selected
              </p>
            )}
          </Section>)}

          {/* Task info (read-only) */}
          {original && (
            <Section icon="ℹ️" title="Task Info">
              <div>
                <InfoRow
                  label="Category"
                  value={original.categoryName ?? original.category?.name}
                />
                <InfoRow
                  label="Status"
                  value={
                    <span className="inline-flex items-center gap-1">
                      {original.statusIcon && (
                        <span>{original.statusIcon}</span>
                      )}
                      {original.statusName ?? original.status?.name ?? "-"}
                    </span>
                  }
                />
                <InfoRow
                  label="Created"
                  value={new Date(original.createdAt).toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" }
                  )}
                />
                <InfoRow
                  label="Updated"
                  value={new Date(original.updatedAt).toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" }
                  )}
                />
                {original.assignedTo.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                      Assigned To
                    </p>
                    <div className="space-y-1.5 flex flex-wrap gap-2">
                      {original.assignedTo.map((u) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div className="px-3 py-1 rounded-full capitalize bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                            {getUserName(u)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-red-900 dark:text-gray-400 float-right rounded-xl bg-red-50 dark:bg-red-900/30 px-2 py-1 text-xs font-bold mb-4">
                  Created by {original.createdBy?.firstName + " " + original.createdBy?.lastName}
                </p>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ── Bottom Actions ────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 w-full m-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-[200px] px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        {canEdit ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              "✓ Save Changes"
            )}
          </button>
        ) : (
          <div className="w-[200px] px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-center text-xs text-gray-400 font-medium">
            No permission to edit tasks
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default UpdateTaskPage;