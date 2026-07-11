"use client"
import React, {
  JSX,
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { TaskService } from "@/src/services/tasks.service";
import { StatusService } from "@/src/services/status.service";
import { MdEdit, MdDelete, MdOutlineMessage } from "react-icons/md";
import { TaskTimeLog, TaskTimerEntry } from "@/src/types/task/taskTimer.types";
import {
  StatusBadge,
  getColorOption,
} from "@/src/components/pages/task/createStatusModal";
import {
  TaskItem,
  TASK_PRIORITY,
  StatusOption,
  FinalStatusPayload,
  ViewMode,
} from "@/src/types/task/task.types";
import { PERMISSIONS } from "@/src/constants/enum";
import { IoMdEye } from "react-icons/io";
import { BsTicketDetailed } from "react-icons/bs";
import { CategoryItem } from "@/src/types/task/category.types";
import { CategoryService } from "@/src/services/category.service";
import UserSelect from "@/src/components/common/userselect";

import DateFilterButton from "@/src/components/common/dateFilter";
import { DateFilter } from "@/src/types/components/ui/dateFilter.types";

import {
  RemarkMessagePayload,
  RemarkService,
} from "@/src/services/remark.service";
import CreateRemarkPopup from "@/src/components/pages/task/CreateRemarkPopup";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { TimerService } from "@/src/services/timer.service";

import { PRIORITY_STYLE, STOP_DISPLAY_MS } from "@/src/constants/constants";
import CategoryBadge from "@/src/components/pages/task/CategoryBadge";
import BoardView from "@/src/components/pages/task/BoardView";
import CategoryMultiSelect from "@/src/components/pages/task/CategoryMultiSeclect";





function parseBackendDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr + "Z");
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function computeTimerState(log: TaskTimeLog): {
  committedSeconds: number;
  segmentStartedAt: string | null;
  displaySeconds: number;
} {
  let committedSeconds = 0;
  let segmentStartedAt: string | null = null;

  for (const seg of log.segments) {
    if (seg.pausedAt) {
      if (seg.durationSeconds && seg.durationSeconds > 0) {
        committedSeconds += seg.durationSeconds;
      } else {
        const start = parseBackendDate(seg.startedAt).getTime();
        const end = parseBackendDate(seg.pausedAt).getTime();
        committedSeconds += Math.max(0, Math.floor((end - start) / 1000));
      }
    } else {
      segmentStartedAt = seg.startedAt;
    }
  }

  const liveSeconds = segmentStartedAt
    ? Math.floor(
        (Date.now() - parseBackendDate(segmentStartedAt).getTime()) / 1000,
      )
    : 0;

  return {
    committedSeconds,
    segmentStartedAt,
    displaySeconds: committedSeconds + Math.max(0, liveSeconds),
  };
}



function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${i === 1 ? "w-full" : "w-2/3"}`}
          />
        </td>
      ))}
    </tr>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
      {(["list", "board"] as ViewMode[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            view === v
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {v === "list" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="5.25" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          )}
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}




const TaskListPage = (): JSX.Element => {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [taskData, setTaskData] = useState<TaskItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [remarkLoad, setRemarkLoad] = useState(false);
  const [remarkPopup, setRemarkPopup] = useState(false);
  const [selectedRemarkTask, setSelectedRemarkTask] = useState<TaskItem | null>(null);
  const [remarkPayload, setRemarkPayload] = useState<RemarkMessagePayload>({ taskId: "", content: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCatLoading, setIsCatLoading] = useState(false)
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtrCategory, setFiltrCategory] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });

  const [taskTimerMap, setTaskTimerMap] = useState<Map<string, TaskTimerEntry>>(new Map());
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restoredRef = useRef(false);

  const canViewTimer = hasPermission(PERMISSIONS.taskTimerRead);
  const canStartTimer = hasPermission(PERMISSIONS.taskTimerStart);
  const canPauseTimer = hasPermission(PERMISSIONS.taskTimerPause);
  const canResumeTimer = hasPermission(PERMISSIONS.taskTimerResume);
  const canStopTimer = hasPermission(PERMISSIONS.taskTimerStop);

  const canCreate = hasPermission(PERMISSIONS.createTask);
  const canView = hasPermission(PERMISSIONS.readTask);
  const canEdit = hasPermission(PERMISSIONS.updateTask);
  const canRemark = hasPermission(PERMISSIONS.createRemark);
  const canDelete = hasPermission(PERMISSIONS.deleteTask);
  const canChangeStatus = hasPermission(PERMISSIONS.taskStatusChange);
  const canMarkFinal = hasPermission(PERMISSIONS.markFinal);
  const showActions = canEdit || canDelete || canView;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (!activeTimerTaskId) return;
    const entry = taskTimerMap.get(activeTimerTaskId);
    if (!entry || entry.status !== "running" || !entry.segmentStartedAt) return;

    const segStartMs = parseBackendDate(entry.segmentStartedAt).getTime();
    setLiveElapsedSeconds(entry.committedSeconds + Math.floor((Date.now() - segStartMs) / 1000));

    timerIntervalRef.current = setInterval(() => {
      setLiveElapsedSeconds(entry.committedSeconds + Math.floor((Date.now() - segStartMs) / 1000));
    }, 1000);

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [activeTimerTaskId, taskTimerMap]);

  const applyLog = useCallback((taskId: string, log: TaskTimeLog) => {
    const { committedSeconds, segmentStartedAt, displaySeconds } = computeTimerState(log);

    setTaskTimerMap((prev) => {
      const next = new Map(prev);
      if (log.status === "running") {
        next.set(taskId, { logId: log.id, status: "running", committedSeconds, segmentStartedAt, displaySeconds });
      } else if (log.status === "paused") {
        next.set(taskId, { logId: log.id, status: "paused", committedSeconds, segmentStartedAt: null, displaySeconds });
      } else {
        next.delete(taskId);
      }
      return next;
    });

    if (log.status === "running") {
      setActiveTimerTaskId(taskId);
      setLiveElapsedSeconds(displaySeconds);
    } else if (log.status === "paused" || log.status === "stopped") {
      setActiveTimerTaskId((prev) => (prev === taskId ? null : prev));
      if (log.status === "stopped") {
        setTaskTimerMap((prev) => {
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  }, []);

  const restoreActiveTimer = useCallback(async (tasks: TaskItem[]) => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const results = await Promise.allSettled(
      tasks.map((task) =>
        TimerService.getActiveTimer(task.id).then((res) => ({
          taskId: task.id,
          log: res.data?.data as TaskTimeLog | null | undefined,
        })),
      ),
    );

    const newMap = new Map<string, TaskTimerEntry>();
    let newActiveTaskId: string | null = null;
    let newLiveElapsed = 0;

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { taskId, log } = result.value;
      if (!log || log.status === "stopped") continue;

      const { committedSeconds, segmentStartedAt, displaySeconds } = computeTimerState(log);

      if (log.status === "running") {
        newMap.set(taskId, { logId: log.id, status: "running", committedSeconds, segmentStartedAt, displaySeconds });
        newActiveTaskId = taskId;
        newLiveElapsed = displaySeconds;
      } else if (log.status === "paused") {
        newMap.set(taskId, { logId: log.id, status: "paused", committedSeconds, segmentStartedAt: null, displaySeconds });
      }
    }

    if (newMap.size > 0) {
      setTaskTimerMap(newMap);
      setActiveTimerTaskId(newActiveTaskId);
      if (newActiveTaskId) setLiveElapsedSeconds(newLiveElapsed);
    }
  }, []);

  const handleTimer = async (task: TaskItem) => {

    return toast.info("Timer feature currently disabled, coming soon")
    // try {

    //   const entry = taskTimerMap.get(task.id);
    //   const isThisRunning = activeTimerTaskId === task.id && entry?.status === "running";
    //   const isThisPaused = entry?.status === "paused";

    //   if (isThisRunning) {
    //     if (!canPauseTimer) { toast.error("You don't have permission to pause timers."); return; }
    //     const res = await TimerService.pause(entry!.logId);
    //     applyLog(task.id, res.data.data);
    //     return;
    //   }

    //   if (isThisPaused) {
    //     if (!canResumeTimer) { toast.error("You don't have permission to resume timers."); return; }
    //     if (activeTimerTaskId && activeTimerTaskId !== task.id) {
    //       toast.error("Please pause your current running timer first. You can only track one task timer at a time.");
    //       return;
    //     }
    //     const res = await TimerService.resume(entry!.logId);
    //     applyLog(task.id, res.data.data);
    //     return;
    //   }

    //   if (!canStartTimer) { toast.error("You don't have permission to start timers."); return; }
    //   if (activeTimerTaskId && activeTimerTaskId !== task.id) {
    //     toast.error("Please pause your current running timer first. You can only track one task timer at a time.");
    //     return;
    //   }

    //   const res = await TimerService.start(task.id);
    //   applyLog(task.id, res.data.data);
    // } catch (error) {
    //   if (axios.isAxiosError(error))
    //     toast.error(error.response?.data?.message ?? "Timer action failed");
    // }
  };

  const handleStop = async (task: TaskItem) => {
    if (!canStopTimer) { toast.error("You don't have permission to stop timers."); return; }
    const entry = taskTimerMap.get(task.id);
    if (!entry) return;

    try {
      const confirm = await ConfirmPopup({title: "Are you sure", text: "Are you sure for stop task timer, make sure if it stopped then it is not restart again, so if you want pause then click on pause button", btnTxt: "Yes, stop"})

      if(confirm){
        const res = await TimerService.stop(entry.logId);
      const log: TaskTimeLog = res.data.data;
      const finalSeconds = log.totalSeconds ?? entry.displaySeconds;

      setTaskTimerMap((prev) => {
        const next = new Map(prev);
        next.set(task.id, { logId: entry.logId, status: "stopped", committedSeconds: finalSeconds, segmentStartedAt: null, displaySeconds: finalSeconds });
        return next;
      });

      if (activeTimerTaskId === task.id) {
        setActiveTimerTaskId(null);
        setLiveElapsedSeconds(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }

      toast.success(`Timer stopped — ${formatSeconds(finalSeconds)} logged`);

      setTimeout(() => {
        setTaskTimerMap((prev) => {
          const next = new Map(prev);
          if (next.get(task.id)?.status === "stopped") next.delete(task.id);
          return next;
        });
      }, STOP_DISPLAY_MS);}
    } catch (error) {
      if (axios.isAxiosError(error))
        toast.error(error.response?.data?.message ?? "Failed to stop timer");
    }
  };

  const handleOpenRemark = (task: TaskItem) => {
    setSelectedRemarkTask(task);
    setRemarkPayload({ taskId: task.id, content: "" });
    setRemarkPopup(true);
  };

  const handleCloseRemark = () => {
    setRemarkPopup(false);
    setSelectedRemarkTask(null);
    setRemarkPayload({ taskId: "", content: "" });
  };

  const handleRemark = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRemarkPayload((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRemark = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setRemarkLoad(true);
    try {
      const result = await RemarkService.create(remarkPayload);
      if (result.status === 201) { handleCloseRemark(); toast.success("Remark created successfully"); }
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.message ?? "Something went wrong");
    } finally {
      setRemarkLoad(false);
    }
  };

  // const fetchTaskAll = useCallback(async (silent = false) => {
  //   if (!silent) setIsLoading(true);
  //   try {
  //     const res = await TaskService.getAll({
  //       currentPage,
  //       pageLimit: viewMode === "board" ? 500 : pageLimit,
  //       status: filterStatus || undefined,
  //       priority: filterPriority || undefined,
  //       category: filtrCategory.length > 0 ? filtrCategory.join(",") : undefined,
  //       search: search || undefined,
  //       user: filterAssigned || undefined,
  //       fromDate: dateFilter.fromDate || undefined,
  //       toDate: dateFilter.toDate || undefined,
  //     });
  //     if (res.status === 200) {
  //       const d = res.data?.data || {};
  //       const tasks: TaskItem[] = d.data ?? [];
  //       setTaskData(tasks);
  //       setTotalCount(tasks.length);
  //       // if (!restoredRef.current && tasks.length > 0) restoreActiveTimer(tasks);
  //     }
  //   } catch (e) {
  //     process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
  //     if (axios.isAxiosError(e)) toast.error("Failed to load tasks");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [currentPage, pageLimit, viewMode, filterStatus, filterPriority, filtrCategory, search, filterAssigned, dateFilter, restoreActiveTimer]);

  // const fetchTasks = useCallback(
  //   (silent = false) => {
  //     if (debounceRef.current) clearTimeout(debounceRef.current);
  //     if (silent) {
  //       debounceRef.current = setTimeout(fetchTaskAll, 3000);
  //     } else {
        
  //       fetchTaskAll();
  //     }
  //   },
  //   [fetchTaskAll],
  // );


  const fetchTaskAll = useCallback(async (silent = false) => {
  if (!silent) setIsLoading(true);   // ← moved here
  try {
    const res = await TaskService.getAll({
      currentPage,
      pageLimit: viewMode === "board" ? 500 : pageLimit,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      category: filtrCategory.length > 0 ? filtrCategory.join(",") : undefined,
      search: search || undefined,
      user: filterAssigned || undefined,
      fromDate: dateFilter.fromDate || undefined,
      toDate: dateFilter.toDate || undefined,
    });
    if (res.status === 200) {
      const d = res.data?.data || {};
      const tasks: TaskItem[] = d.data ?? [];
      setTaskData(tasks);
      setTotalCount(tasks.length);
    }
  } catch (e) {
    process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    // if (axios.isAxiosError(e)) toast.error("Failed to load tasks");
  } finally {
    setIsLoading(false);
  }
}, [currentPage, pageLimit, viewMode, filterStatus, filterPriority, filtrCategory, search, filterAssigned, dateFilter, restoreActiveTimer]);

const fetchTasks = useCallback(
  (silent = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (silent) {
      debounceRef.current = setTimeout(() => fetchTaskAll(true), 3000);
    } else {
      fetchTaskAll(false);   
    }
  },
  [fetchTaskAll],
);

  const fetchStatuses = async () => {
    try {
      const res = await StatusService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setStatusOptions(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  const fetchCategories = async () => {
    setIsCatLoading(true)
    try {
      const res = await CategoryService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setCategories(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    } finally {
      setIsCatLoading(false)
    }
  };

  useEffect(() => { setCurrentPage(1); }, [filterAssigned]);
  useEffect(() => { fetchStatuses();
    //  fetchCategories();
     }, []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, payload: FinalStatusPayload): Promise<void> => {
    const previousData = taskData;
    setTaskData((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const matchedStatus = statusOptions.find((s) => s.id === payload.status);
        return { ...t, status: matchedStatus ? { ...t.status, ...matchedStatus } : { ...t.status, id: payload.status } };
      }),
    );
    try {
      const res = await TaskService.updateStatus(taskId, payload);
      if (res.status === 200) fetchTasks(true);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      setTaskData(previousData);
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Failed to update status");
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setDeleting(true);
    try {
      const confirmed = await ConfirmPopup({ title: "Delete Task?", text: "This cannot be undone.", btnTxt: "Yes, Delete" });
      if (confirmed) {
        const res = await TaskService.delete(id);
        if (res.status === 200) { toast.success("Task deleted successfully"); await fetchTasks(); }
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 300);
  };

  const colCount = showActions ? 8 : 7;
  const hasFilters = !!(search || filterStatus || filterPriority || filterAssigned || filtrCategory.length > 0);

  return (
    <>
      {remarkPopup && (
        <>
          <BlurryBackground />
          <CreateRemarkPopup
            remarkPayload={remarkPayload}
            task={selectedRemarkTask}
            onChange={handleRemark}
            onCancel={handleCloseRemark}
            handleAddRemark={handleAddRemark}
            remarkLoad={remarkLoad}
          />
        </>
      )}

      <div className="ml-72 mt-14">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-2xl">📋</span>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">All Tasks</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">View, filter, and manage all project tasks.</p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => router.push("/task/create")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white text-sm font-bold shadow-md group cursor-pointer shadow-cyan-200 dark:shadow-cyan-900/40 transition-all"
              >
                <span className="group-hover:rotate-90">＋</span> New Task
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4 mb-7">
            {[
              { label: "Total Tasks", value: totalCount, icon: "📋", bg: "bg-cyan-50 border-cyan-100", priority: "" },
              { label: "High", value: taskData.filter((t) => t.priority === TASK_PRIORITY.HIGH).length, icon: "🟠", bg: "bg-orange-50 border-orange-100", priority: TASK_PRIORITY.HIGH },
              { label: "Urgent", value: taskData.filter((t) => t.priority === TASK_PRIORITY.URGENT).length, icon: "🔴", bg: "bg-rose-50 border-rose-100", priority: TASK_PRIORITY.URGENT },
              { label: "This Page", value: taskData.length, icon: "📄", bg: "bg-emerald-50 border-emerald-100", priority: "" },
            ].map((s) => (
              <div
                key={s.label}
                onClick={() => { if (s.priority) { setFilterPriority(s.priority === filterPriority ? "" : s.priority); setCurrentPage(1); } }}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${s.bg} ${s.priority ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" : "cursor-default"} ${s.priority && filterPriority === s.priority ? "ring-2 ring-offset-1 ring-cyan-400 shadow-md" : ""}`}
              >
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="text-xl font-extrabold text-gray-900 dark:text-black">{s.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                    {s.label}
                    {s.priority && filterPriority === s.priority && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400">active</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 mb-5">
            <div className="relative min-w-[100px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
            >
              <option value="">All Priorities</option>
              {Object.values(TASK_PRIORITY).map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <CategoryMultiSelect categories={categories} isCatLoading={isCatLoading} fetchCategories={fetchCategories}  selected={filtrCategory} onChange={(val) => { setFiltrCategory(val); setCurrentPage(1); }} />
            <UserSelect
              mode="single"
              value={filterAssigned}
              onChange={setFilterAssigned}
              placeholder="Search assignee…"
              cls="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
            />
            <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setCurrentPage(1); setFilterAssigned(""); setFiltrCategory([]); setDateFilter({ fromDate: "", toDate: "" }); }}
                className="ml-auto px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
              >
                <span>✕</span> Clear
              </button>
            )}
            <div className="w-px h-7 bg-gray-200 dark:bg-gray-600 ml-auto" />
            <ViewToggle view={viewMode} onChange={(v) => { setViewMode(v); setCurrentPage(1); }} />
          </div>

          {viewMode === "board" && (
            <BoardView
              tasks={taskData}
              statusOptions={statusOptions}
              canEdit={canEdit}
              canRemark={canRemark}
              canDelete={canDelete}
              canViewTimer={canViewTimer}
              canStartTimer={canStartTimer}
              canPauseTimer={canPauseTimer}
              canResumeTimer={canResumeTimer}
              canStopTimer={canStopTimer}
              canChangeStatus={canChangeStatus}
              canMarkFinal={canMarkFinal}
              deleting={deleting}
              isLoading={isLoading}
              skeletonlength={categories.length > 0 ? categories.length : 3}
              taskTimerMap={taskTimerMap}
              activeTimerTaskId={activeTimerTaskId}
              liveElapsedSeconds={liveElapsedSeconds}
              onEdit={(id) => router.push(`/task/update/${id}`)}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onRemark={handleOpenRemark}
              onTimer={handleTimer}
              onStop={handleStop}
            />
          )}

          {viewMode === "list" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="text-nowrap overflow-x-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                      {[
                        { label: "#", cls: "w-12" },
                        { label: "Title", cls: "" },
                        { label: "Category", cls: "w-36" },
                        { label: "Status", cls: "w-36" },
                        { label: "Priority", cls: "w-28" },
                        { label: "Assigned", cls: "w-28" },
                        { label: "Created By", cls: "w-28" },
                        { label: "Due Date", cls: "w-28" },
                        ...(showActions ? [{ label: "Actions", cls: "w-28 text-right" }] : []),
                      ].map((col) => (
                        <th key={col.label} className={`px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left ${col.cls}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                    ) : taskData.length === 0 ? (
                      <tr>
                        <td colSpan={colCount} className="text-center py-20 text-gray-400 dark:text-gray-500">
                          <div className="text-5xl mb-3">📭</div>
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks found</p>
                          {hasFilters && <p className="text-xs text-gray-400 mt-1">Try clearing your filters</p>}
                          {canCreate && !hasFilters && (
                            <button type="button" onClick={() => router.push("/task/create")} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border border-cyan-100 transition">
                              + Create first task
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      taskData.map((task, i) => {
                        const pri = PRIORITY_STYLE[task.priority];
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                        return (
                          <tr key={task.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors group">
                            <td className="px-5 py-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                              {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-xs">{task.title}</div>
                              {task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {task.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">#{tag}</span>
                                  ))}
                                  {task.tags.length > 3 && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400">+{task.tags.length - 3}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <CategoryBadge color={getColorOption(task.category.color || null)} icon={task.category.icon || "❓"} name={task.category.name} />
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge color={getColorOption(task.status.color)} icon={task.status.icon || "⚡"} name={task.status.name} />
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${pri.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                                {pri.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {task.assignedTo.length === 0 ? (
                                <span className="text-xs italic text-gray-300 dark:text-gray-600">Unassigned</span>
                              ) : (
                                <div className="flex -space-x-2">
                                  {task.assignedTo.slice(0, 2).map((u) => (
                                    <div key={u.id} title={u.firstName} className="ps-1 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center px-2 py-1 capitalize justify-center text-white text-[12px] font-bold shrink-0">
                                      {u.firstName} {u?.lastName ?? ""}
                                    </div>
                                  ))}
                                  {task.assignedTo.length > 2 && (
                                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                                      +{task.assignedTo.length - 2}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{task.createdBy?.firstName} {task.createdBy?.lastName}</p>
                            </td>
                            <td className="px-5 py-4">
                              {task.dueDate ? (
                                <span className={`text-xs font-semibold ${isOverdue ? "text-rose-500" : "text-gray-600 dark:text-gray-300"}`}>
                                  {isOverdue && <span className="mr-1">⚠️</span>}
                                  {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              ) : (
                                <span className="text-xs italic text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {showActions && (
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {canView && (
                                    <button type="button" onClick={() => router.push(`/task/detail/${task.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition">
                                      <BsTicketDetailed className="text-sm" />
                                    </button>
                                  )}
                                  {canView && (
                                    <button type="button" onClick={() => router.push(`/task/view/${task.id}?userid=${task.assignedTo[0]?.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition">
                                      <IoMdEye className="text-sm" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button type="button" onClick={() => router.push(`/task/update/${task.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 transition">
                                      <MdEdit className="text-sm" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button type="button" disabled={deleting} onClick={() => handleDelete(task.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 transition disabled:opacity-50">
                                      <MdDelete className="text-sm" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Showing page <span className="font-semibold text-gray-600 dark:text-gray-300">{currentPage}</span> of <span className="font-semibold text-gray-600 dark:text-gray-300">{totalCount}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={currentPage <= 1 || isLoading} onClick={() => setCurrentPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">{currentPage}</span>
                  <button type="button" disabled={currentPage >= totalCount || isLoading} onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TaskListPage;