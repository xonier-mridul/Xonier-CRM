"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Lead } from "@/src/types/leads/leads.types";
import { useLeadStatuses } from "@/src/hooks/useLeadStatuses";
import { SALES_STATUS } from "@/src/constants/enum";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import Link from "next/link";
import StatusBadge from "@/src/components/common/Status";
import { Inbox } from "lucide-react";

// Tunables — matching Task Board (CategoryBoard.tsx)
const DRAG_ACTIVATE_DELAY = 80; // ms cursor must dwell in a column before it's highlighted
const SCROLL_EDGE_THRESHOLD = 180; // px from edge where auto-scroll kicks in
const SCROLL_MAX_SPEED = 32; // px per frame at the very edge
const SCROLL_MIN_SPEED = 4;

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => Promise<boolean>;
  onDelete?: (leadId: string, leadName: string) => Promise<void> | void;
}

const AssignedToAvatar = ({ user }: { user: any }) => {
  if (!user) return null;
  const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();
  return (
    <div
      title={`${user.firstName ?? ""} ${user.lastName ?? ""}`}
      className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[9px] font-bold shrink-0 border border-cyan-200"
    >
      {initials || "?"}
    </div>
  );
};

const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({ leads, onStatusChange, onDelete }) => {
  const { statuses, label, loading: statusesLoading, error: statusError, refresh: refreshStatuses } = useLeadStatuses();
  const COLUMNS = useMemo(
    () => [
      ...[...statuses]
        .sort((a, b) => Number(a.type === "final") - Number(b.type === "final") || a.order - b.order)
        .map((s) => ({
          id: s.key,
          title: s.name,
          type: s.type,
          color: "bg-slate-50 border-slate-200 text-slate-700",
          hex: s.color,
        })),
      ...Array.from(
        new Set(leads.map((l) => l.status).filter((key) => key && !statuses.some((s) => s.key === key)))
      ).map((key) => ({
        id: key,
        title: label(key),
        type: "ongoing" as const,
        color: "bg-slate-50 border-slate-200 text-slate-700",
        hex: "#64748b",
      })),
    ],
    [statuses, leads, label]
  );

  const boardRef = useRef<HTMLDivElement>(null);

  // --- Auto-scroll (rAF based, smooth, eased, window-driven — same as Task CategoryBoard) ---
  const scrollAnimationRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<0 | 1 | -1>(0);
  const scrollSpeedRef = useRef(0);
  const isDraggingRef = useRef(false);

  // --- Drag state ---
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const dragLeadRef = useRef<Lead | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const dragActivateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [boardData, setBoardData] = useState<Record<string, Lead[]>>({});

  // Sync leads to columns whenever leads prop changes
  useEffect(() => {
    const newBoardData: Record<string, Lead[]> = {};
    COLUMNS.forEach((col) => {
      newBoardData[col.id] = [];
    });

    leads.forEach((lead) => {
      const status = lead.status as string;
      if (newBoardData[status]) {
        newBoardData[status].push(lead);
      } else {
        if (!newBoardData[SALES_STATUS.NEW]) newBoardData[SALES_STATUS.NEW] = [];
        newBoardData[SALES_STATUS.NEW].push(lead);
      }
    });

    setBoardData(newBoardData);
  }, [leads, COLUMNS]);

  // ---------------- Auto scroll engine (rAF) ----------------
  const tickScroll = () => {
    const container = boardRef.current;
    if (container && scrollDirectionRef.current !== 0 && isDraggingRef.current) {
      container.scrollLeft += scrollDirectionRef.current * scrollSpeedRef.current;
      scrollAnimationRef.current = requestAnimationFrame(tickScroll);
    } else {
      scrollAnimationRef.current = null;
    }
  };

  const startAutoScroll = (direction: 1 | -1, speed: number) => {
    scrollDirectionRef.current = direction;
    scrollSpeedRef.current = speed;
    if (!scrollAnimationRef.current) {
      scrollAnimationRef.current = requestAnimationFrame(tickScroll);
    }
  };

  const stopAutoScroll = () => {
    scrollDirectionRef.current = 0;
    scrollSpeedRef.current = 0;
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  };

  const computeScrollFromClientX = (clientX: number) => {
    const container = boardRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (clientX < rect.left + SCROLL_EDGE_THRESHOLD) {
      const raw = Math.min(1, (rect.left + SCROLL_EDGE_THRESHOLD - clientX) / SCROLL_EDGE_THRESHOLD);
      const intensity = raw * raw;
      const speed = SCROLL_MIN_SPEED + intensity * (SCROLL_MAX_SPEED - SCROLL_MIN_SPEED);
      startAutoScroll(-1, speed);
    } else if (clientX > rect.right - SCROLL_EDGE_THRESHOLD) {
      const raw = Math.min(1, (clientX - (rect.right - SCROLL_EDGE_THRESHOLD)) / SCROLL_EDGE_THRESHOLD);
      const intensity = raw * raw;
      const speed = SCROLL_MIN_SPEED + intensity * (SCROLL_MAX_SPEED - SCROLL_MIN_SPEED);
      startAutoScroll(1, speed);
    } else {
      stopAutoScroll();
    }
  };

  const resetDragState = () => {
    dragCounterRef.current = {};
    if (dragActivateTimeoutRef.current) {
      clearTimeout(dragActivateTimeoutRef.current);
      dragActivateTimeoutRef.current = null;
    }
    setDragOverStatusId(null);
  };

  // ---------------- Global drag tracking ----------------
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      computeScrollFromClientX(e.clientX);
    };

    const handleWindowDrop = () => {
      stopAutoScroll();
      isDraggingRef.current = false;
    };

    const handleWindowDragEnd = () => {
      stopAutoScroll();
      isDraggingRef.current = false;
      resetDragState();
      dragLeadRef.current = null;
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragend", handleWindowDragEnd);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragend", handleWindowDragEnd);
      stopAutoScroll();
      if (dragActivateTimeoutRef.current) clearTimeout(dragActivateTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, lead: Lead) => {
    dragLeadRef.current = lead;
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", lead.id);
    } catch {}
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => {
      el.style.opacity = "0.5";
    }, 0);
    e.currentTarget.addEventListener(
      "dragend",
      () => {
        el.style.opacity = "1";
      },
      { once: true }
    );
  };

  const handleDragEnter = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const prevCount = dragCounterRef.current[statusId] || 0;
    dragCounterRef.current[statusId] = prevCount + 1;

    if (prevCount === 0 && dragOverStatusId !== statusId) {
      if (dragActivateTimeoutRef.current) clearTimeout(dragActivateTimeoutRef.current);
      dragActivateTimeoutRef.current = setTimeout(() => {
        if ((dragCounterRef.current[statusId] || 0) > 0) {
          setDragOverStatusId(statusId);
        }
      }, DRAG_ACTIVATE_DELAY);
    }
  };

  const handleDragOverColumn = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeaveColumn = (e: React.DragEvent, statusId: string) => {
    dragCounterRef.current[statusId] = Math.max(0, (dragCounterRef.current[statusId] || 0) - 1);

    if (dragCounterRef.current[statusId] === 0) {
      if (dragActivateTimeoutRef.current) {
        clearTimeout(dragActivateTimeoutRef.current);
        dragActivateTimeoutRef.current = null;
      }
      setDragOverStatusId((prev) => (prev === statusId ? null : prev));
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    e.stopPropagation();
    stopAutoScroll();
    isDraggingRef.current = false;

    const lead = dragLeadRef.current;
    dragLeadRef.current = null;
    resetDragState();

    if (!lead) return;
    const sourceStatus = lead.status as string;
    if (sourceStatus === targetStatusId) return;

    const targetColumn = COLUMNS.find((col) => col.id === targetStatusId);
    if (targetColumn?.type === "final" && !lead.inDeal) {
      // Navigate directly. The lead stays in its current stage until the deal
      // is saved, when the create-deal API moves it to the final stage.
      window.location.assign(`/leads/make-deal/${lead.id}`);
      return;
    }

    const previousBoardData = boardData;
    const updatedLead: Lead = { ...lead, status: targetStatusId as SALES_STATUS };

    // Optimistically update board state immediately
    setBoardData((prev) => {
      const sourceKey = prev[sourceStatus] ? sourceStatus : SALES_STATUS.NEW;
      const sourceList = (prev[sourceKey] || []).filter((item) => item.id !== lead.id);
      const destList = [updatedLead, ...(prev[targetStatusId] || []).filter((item) => item.id !== lead.id)];
      return {
        ...prev,
        [sourceKey]: sourceList,
        [targetStatusId]: destList,
      };
    });

    const success = await onStatusChange(lead.id, targetStatusId);
    if (!success) {
      setBoardData(previousBoardData);
    }
  };

  const handleDragEnd = () => {
    stopAutoScroll();
    isDraggingRef.current = false;
    resetDragState();
    dragLeadRef.current = null;
  };

  if (statusError)
    return (
      <div role="alert" className="p-4 text-red-600">
        {statusError}{" "}
        <button onClick={refreshStatuses} className="underline">
          Retry
        </button>
      </div>
    );
  if (statusesLoading) return <div className="h-96 flex items-center justify-center">Loading board...</div>;

  return (
    <div
      ref={boardRef}
      className="w-full flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start scroll-smooth min-h-[70vh] p-2"
      onDrop={() => {
        stopAutoScroll();
        isDraggingRef.current = false;
      }}
    >
      {COLUMNS.map((column) => {
        const columnLeads = boardData[column.id] || [];
        const isDragOver = dragOverStatusId === column.id;

        return (
          <div
            key={column.id}
            className={`flex flex-col w-[300px] shrink-0 rounded-xl transition-all duration-150 ease-out max-h-[650px] ${
              isDragOver
                ? "border-2 border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 ring-2 ring-cyan-500/20 scale-[1.01]"
                : "border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 scale-100"
            }`}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragOver={handleDragOverColumn}
            onDragLeave={(e) => handleDragLeaveColumn(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              style={{ color: column.hex, backgroundColor: `${column.hex}12` }}
              className={`px-3 py-2.5 rounded-t-xl border-b border-slate-200/80 dark:border-slate-700/80 font-semibold text-sm flex justify-between items-center shrink-0 ${column.color}`}
            >
              <span className="truncate">{column.title}</span>
              <span className="bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-full text-xs tabular-nums">
                {columnLeads.length}
              </span>
            </div>

            {/* Scrollable Lead Cards Container */}
            <div className="flex-1 overflow-y-auto min-h-[150px] p-2 space-y-3 custom-scrollbar">
              {columnLeads.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center py-8 rounded-xl border border-dashed transition-colors duration-150 ${
                    isDragOver
                      ? "border-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/60"
                      : "border-slate-200 dark:border-slate-700/60"
                  }`}
                >
                  <Inbox className="w-5 h-5 mb-1 text-slate-300 dark:text-slate-600" />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {isDragOver ? "Drop here" : "No leads"}
                  </p>
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-150 cursor-grab active:cursor-grabbing select-none group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {lead.fullName || lead.lead_id || "Unnamed Lead"}
                      </h4>
                      <div className="flex gap-1 shrink-0">
                        <Link
                          href={`/leads/view/${lead.id}`}
                          draggable={false}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors">
                            <FaRegEye size={14} />
                          </div>
                        </Link>
                        <Link
                          href={`/leads/update/${lead.id}`}
                          draggable={false}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <MdOutlineEdit size={14} />
                          </div>
                        </Link>
                        {onDelete && lead.status !== SALES_STATUS.DELETE && (
                          <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(lead.id, lead.fullName || lead.lead_id || "Lead");
                            }}
                            title="Delete"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                          >
                            <MdDeleteOutline size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
                      {lead.email}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {lead.projectType && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 capitalize">
                          {lead.projectType.replace("_", " ")}
                        </span>
                      )}
                      {lead.source && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800 capitalize">
                          {lead.source}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <AssignedToAvatar user={lead.assignedTo ? lead.assignedTo[0] : null} />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <StatusBadge status={lead.status} label={label(lead.status)} color={column.hex} />
                    </div>
                  </div>
                ))
              )}

              {columnLeads.length > 0 && isDragOver && (
                <div className="flex items-center justify-center py-2.5 rounded-xl border border-dashed border-cyan-400 dark:border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/20">
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Drop here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadKanbanBoard;
