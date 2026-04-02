"use client";

import React, { JSX, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskService } from "@/src/services/tasks.service";
import { CategoryService } from "@/src/services/category.service";
import { StatusService } from "@/src/services/status.service";
import { useDispatch, useSelector } from "react-redux";
import {
  CreateTaskPayload,
  TASK_PRIORITY,
  TASK_ENTITY_TYPE,
  RECURRENCE_TYPE,
  CategoryOption,
  StatusOption,
} from "@/src/types/task/task.types";
import { User } from "@/src/types";
import { AuthService } from "@/src/services/auth.service";
import { RootState } from "@/src/store";
import { PERMISSIONS } from "@/src/constants/enum";

const PRIORITY_CFG: Record<
  TASK_PRIORITY,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  [TASK_PRIORITY.LOW]: {
    label: "Low",
    color: "#64748b",
    bg: "bg-slate-50   dark:bg-slate-900/30",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: "Medium",
    color: "#f59e0b",
    bg: "bg-amber-50   dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-700",
    dot: "bg-amber-400",
  },
  [TASK_PRIORITY.HIGH]: {
    label: "High",
    color: "#f97316",
    bg: "bg-orange-50  dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-700",
    dot: "bg-orange-500",
  },
  [TASK_PRIORITY.URGENT]: {
    label: "Urgent",
    color: "#ef4444",
    bg: "bg-rose-50    dark:bg-rose-900/20",
    border: "border-rose-200  dark:border-rose-700",
    dot: "bg-rose-500",
  },
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition";
const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition";

function SectionCard({
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
      <div className="px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/80 flex items-center gap-2.5">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
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
        {label}
        {required && <span className="text-rose-500 text-xs">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}

const CreateTaskPage = (): JSX.Element => {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [userData, setUserData] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
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
    dueDate: null,
    startDate: null,
    estimatedHours: undefined,
    isRecurring: false,
    recurrenceType: undefined,
    recurrenceEndsAt: null,
    tags: [],
    attachments: [],
    parentTask: null,
    order: 0,
  });

  const auth = useSelector((state: RootState) => state.auth);

  const set = <K extends keyof CreateTaskPayload>(
    k: K,
    v: CreateTaskPayload[K],
  ) => {
    setForm((p) => ({ ...p, [k]: v }))
  };

  useEffect(() => {
    (async () => {
      try {
        const catRes = await CategoryService.getAll({
          currentPage: 1,
          pageLimit: 100,
          search: "",
        });
        if (catRes.status === 200) setCategories(catRes.data.data.data ?? []);
      } catch (e) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      }
    })();
  }, []);

  const getUserData = async () => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();

      if (result.status === 200) {
        setUserData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message ?? "Something went wrong";
        setErr(
          typeof msg === "string"
            ? msg
            : Array.isArray(msg)
              ? msg[0]
              : "Something went wrong",
        );
        toast.error(typeof msg === "string" ? msg : "Something went wrong");
      }
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    if (!form.category) {
      setStatuses([]);
      set("status", "");
      return;
    }
    (async () => {
      try {
        const statusRes = await StatusService.getById(form.category);
        if (statusRes.status === 200) {
          const data = statusRes.data.data ?? [];
          setStatuses(data);
          const defaultStatus = data.find((s: StatusOption) => s.isDefault);
          if (defaultStatus)
            set("status", defaultStatus._id || defaultStatus.id);
        }
      } catch (e) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      }
    })();
  }, [form.category]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const validate = (): boolean => {
    if (!form.title.trim()) {
      setErr("Title is required");
      return false;
    }
    if (!form.category) {
      setErr("Category is required");
      return false;
    }
    if (form.isRecurring && !form.recurrenceType) {
      setErr("Recurrence type is required when task is recurring");
      return false;
    }
    if (
      form.startDate &&
      form.dueDate &&
      new Date(form.startDate) > new Date(form.dueDate)
    ) {
      setErr("Start date cannot be after due date");
      return false;
    }
    return true;
  };

   const userMap = React.useMemo(() => {
                        const map: Record<
                          string,
                          { firstName: string; lastName?: string }
                        > = {};

                        userData.forEach((u) => {
                          if (u.id) {
                            map[u.id] = {
                              firstName: u.firstName,
                              lastName: u.lastName,
                            };
                          }
                        });

                        return map;
                      }, [userData]);

  const handleSubmit = async () => {
    setErr(null);
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || undefined,
        startDate: form.startDate || undefined,
        recurrenceEndsAt: form.recurrenceEndsAt || undefined,
        parentTask: form.parentTask || undefined,
        entityId: form.entityId || undefined,
        entityName: form.entityName || undefined,
        entityType: form.entityType || undefined,
        status: form.status || undefined,
      };
      const res = await TaskService.create(payload);
      if (res.status === 200 || res.status === 201) {
        toast.success("Task created successfully");
        router.push("/task/tasks");
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message ?? "Something went wrong";
        setErr(
          typeof msg === "string"
            ? msg
            : Array.isArray(msg)
              ? msg[0]
              : "Something went wrong",
        );
        toast.error(typeof msg === "string" ? msg : "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canCreate = hasPermission(PERMISSIONS.createTask);

  return (
    <div className="ml-72 mt-14 min-h-screen">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full mb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-blue-900/40">
                <span className="text-white text-sm">✏️</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Create Task
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
              Fill in the details to add a new task
            </p>
          </div>
          {/* <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            ← Back
          </button> */}
        </div>

        {err && (
          <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 text-sm text-rose-600 dark:text-rose-400 font-medium">
            <span>⚠️</span> {err}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 items-start">
          <div className="col-span-2 space-y-5">
            <SectionCard icon="📝" title="Basic Information">
              <Field label="Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Enter a clear, descriptive title…"
                  className={inputCls}
                  autoFocus
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the task, acceptance criteria, context…"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Status"
                  hint={!form.category ? "Select a category first" : undefined}
                >
                  <select
                    value={form.status ?? ""}
                    onChange={(e) => set("status", e.target.value)}
                    disabled={!form.category || statuses.length === 0}
                    className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Auto (default status)</option>
                    {statuses.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon="📅" title="Scheduling">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date">
                  <input
                    type="date"
                    value={
                      form.startDate ? new Date(form.startDate).toLocaleDateString("en-GB") : undefined
                    }
                    onChange={(e) => set("startDate", new Date(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Due Date">
                  <input
                    type="date"
                    value={form.dueDate ? new Date(form.dueDate).toLocaleDateString("en-GB") : undefined}
                    onChange={(e) => set("dueDate", new Date(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field
                label="Estimated Hours"
                hint="Decimal values allowed, e.g. 2.5"
              >
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.estimatedHours ?? ""}
                  onChange={(e) =>
                    set(
                      "estimatedHours",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0.0"
                  className={inputCls}
                />
              </Field>

              <div
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${form.isRecurring ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700"}`}
                onClick={() => {
                  set("isRecurring", !form.isRecurring);
                  if (form.isRecurring) {
                    set("recurrenceType", undefined);
                    set("recurrenceEndsAt", null);
                  }
                }}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.isRecurring ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-500"}`}
                >
                  {form.isRecurring && (
                    <span className="text-white text-xs font-bold leading-none">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    Recurring Task
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    This task repeats on a schedule
                  </p>
                </div>
              </div>

              {form.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-4 ml-1 border-l-2 border-blue-300 dark:border-blue-600">
                  <Field label="Recurrence Type" required>
                    <select
                      value={form.recurrenceType ?? ""}
                      onChange={(e) =>
                        set(
                          "recurrenceType",
                          (e.target.value as RECURRENCE_TYPE) || undefined,
                        )
                      }
                      className={selectCls}
                    >
                      <option value="">Select…</option>
                      {Object.values(RECURRENCE_TYPE).map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ends At">
                    <input
                      type="date"
                      value={form.recurrenceEndsAt ? new Date(form.recurrenceEndsAt).toLocaleDateString("en-GB") : undefined}
                      onChange={(e) =>
                        set("recurrenceEndsAt", new Date (e.target.value))
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </SectionCard>

           

            <SectionCard icon="🔗" title="Link to CRM Entity">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Entity Type">
                  <select
                    value={form.entityType ?? ""}
                    onChange={(e) =>
                      set(
                        "entityType",
                        (e.target.value as TASK_ENTITY_TYPE) || undefined,
                      )
                    }
                    className={selectCls}
                  >
                    <option value="">None</option>
                    {Object.values(TASK_ENTITY_TYPE).map((et) => (
                      <option key={et} value={et}>
                        {et.charAt(0).toUpperCase() + et.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Entity ID">
                  <input
                    type="text"
                    value={form.entityId ?? ""}
                    onChange={(e) => set("entityId", e.target.value)}
                    placeholder="ObjectId…"
                    className={inputCls}
                    disabled={!form.entityType}
                  />
                </Field>
                <Field label="Entity Name">
                  <input
                    type="text"
                    value={form.entityName ?? ""}
                    onChange={(e) => set("entityName", e.target.value)}
                    placeholder="Display name…"
                    className={inputCls}
                    disabled={!form.entityType}
                  />
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard icon="🎯" title="Priority">
              <div className="grid grid-cols-2 gap-2">
                {Object.values(TASK_PRIORITY).map((p) => {
                  const cfg = PRIORITY_CFG[p];
                  const active = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("priority", p)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${active ? `${cfg.bg} ${cfg.border} shadow-sm` : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600"}`}
                      style={active ? { color: cfg.color } : {}}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? cfg.dot : "bg-gray-300 dark:bg-gray-600"}`}
                      />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard icon="🏷️" title="Tags">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag and press Enter…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 border border-blue-200 dark:border-blue-700 transition whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "tags",
                            form.tags.filter((t) => t !== tag),
                          )
                        }
                        className="text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 leading-none transition text-sm"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* <SectionCard icon="🔢" title="Order">
              <Field
                label="Position"
                hint="Lower number appears first in the column"
              >
                <input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => set("order", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </SectionCard> */}
             <SectionCard icon="👥" title="Assign Users">
              <div className="space-y-3">
                {/* Assign to me */}
                <button
                  type="button"
                  onClick={() => {
                    const myId = auth.user?._id;
                    if (!myId) return;

                    if (!form.assignedTo.includes(myId)) {
                      set("assignedTo", [...form.assignedTo, myId]);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 transition"
                >
                  ⚡ Assign to Me
                </button>

                {/* Selected Users */}
                {form.assignedTo.length > 0 && (
                  
                  <div className="flex flex-wrap gap-2">
                    {form.assignedTo.map((userId) => {
                     
                      const user = userMap[userId];

                      return (
                        <span
                          key={userId}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300"
                        >
                          👤 {user?.firstName || "User"}
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "assignedTo",
                                form.assignedTo.filter((id) => id !== userId),
                              )
                            }
                            className="text-indigo-400 hover:text-red-500 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* User List */}
                <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {userData.map((user) => {
                    const isSelected = form.assignedTo.includes(user.id);

                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          if (isSelected) {
                            set(
                              "assignedTo",
                              form.assignedTo.filter((id) => id !== user.id),
                            );
                          } else {
                            set("assignedTo", [...form.assignedTo, user.id]);
                          }
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-sm transition ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span>
                          {user.firstName} {user.lastName}
                        </span>

                        {isSelected && (
                          <span className="text-blue-500 text-xs">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          {canCreate ? (
            <button
              type="button"
              disabled={isLoading || !form.title.trim() || !form.category}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
                  Creating…
                </>
              ) : (
                <>✓ Create Task</>
              )}
            </button>
          ) : (
            <div className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-center text-xs text-gray-400 font-medium">
              No permission to create tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTaskPage;
