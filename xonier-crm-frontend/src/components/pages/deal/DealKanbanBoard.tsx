"use client";
import React, { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Deal, DealStageUpdatePayload } from "@/src/types/deals/deal.types";
import { DEAL_STAGES } from "@/src/constants/enum";
import { MdOutlineEdit } from "react-icons/md";
import { FaRegEye, FaRegPaperPlane } from "react-icons/fa";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import Link from "next/link";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import DealClosureModal from "./DealClosureModal";

import type { LeadStatus } from "@/src/services/leadStatus.service";

interface DealKanbanBoardProps {
  stages: LeadStatus[];
  deals: Deal[];
  onStageChange: (
    dealId: string,
    newStage: string,
    closurePayload?: DealStageUpdatePayload
  ) => Promise<boolean>;
  canViewDeal?: boolean;
  canUpdateDeal?: boolean;
  canCreateQuote?: boolean;
}

// Stage badge colour — matches existing table badges in DealContent
const getStageBadgeClass = (stage: DEAL_STAGES | string): string => {
  switch (stage) {
    case DEAL_STAGES.QUALIFICATION:
      return "bg-cyan-100 text-cyan-700 border border-cyan-200";
    case DEAL_STAGES.REQUIREMENT_ANALYSIS:
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case DEAL_STAGES.PROPOSAL:
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case DEAL_STAGES.NEGOTIATION:
      return "bg-purple-100 text-purple-700 border border-purple-200";
    case DEAL_STAGES.WON:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case DEAL_STAGES.LOST:
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
};

const AssignedToAvatar = ({ user }: { user: any }) => {
  if (!user) return null;
  const initials =
    `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();
  return (
    <div
      title={`${user.firstName ?? ""} ${user.lastName ?? ""}`}
      className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[9px] font-bold shrink-0 border border-cyan-200"
    >
      {initials || "?"}
    </div>
  );
};

const DealKanbanBoard: React.FC<DealKanbanBoardProps> = ({
  deals,
  stages,
  onStageChange,
  canViewDeal = true,
  canUpdateDeal = true,
  canCreateQuote = false,
}) => {
  const columns = useMemo(() => stages.map(stage => ({
    id: stage.key, title: stage.name, color: stage.color, probability: stage.probability,
  })), [stages]);
  const currency = useCompanyCurrency();
  const [moving, setMoving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [boardData, setBoardData] = useState<Record<string, Deal[]>>({});
  const [pendingClosure, setPendingClosure] = useState<{
    deal: Deal;
    sourceStage: string;
    targetStage: "won" | "lost";
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync incoming deals into columns whenever the prop changes
  useEffect(() => {
    const newBoardData: Record<string, Deal[]> = {};
    columns.forEach((col) => {
      newBoardData[col.id] = [];
    });

    deals.forEach((deal) => {
      const stage = deal.dealStage === DEAL_STAGES.CLOSED_WON ? DEAL_STAGES.WON : deal.dealStage;
      if (newBoardData[stage] !== undefined) {
        newBoardData[stage].push(deal);
      } else {
        // Fallback — put unknown stages into Qualification column
        if (!newBoardData[DEAL_STAGES.QUALIFICATION])
          newBoardData[DEAL_STAGES.QUALIFICATION] = [];
        newBoardData[DEAL_STAGES.QUALIFICATION].push(deal);
      }
    });

    setBoardData(newBoardData);
  }, [deals, columns]);

  const isClosureStage = (stageKey: string): boolean => {
    if (
      stageKey === DEAL_STAGES.WON ||
      stageKey === DEAL_STAGES.CLOSED_WON ||
      stageKey === DEAL_STAGES.LOST
    ) {
      return true;
    }
    return stages.find((s) => s.key === stageKey)?.type === "final";
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    if (!canUpdateDeal || source.droppableId === destination.droppableId) return;

    const draggedDeal = boardData[source.droppableId]?.find(
      (deal) => deal.id === draggableId
    );
    if (!draggedDeal) return;

    if (isClosureStage(destination.droppableId)) {
      setPendingClosure({
        deal: draggedDeal,
        sourceStage: source.droppableId,
        targetStage: destination.droppableId === DEAL_STAGES.LOST ? "lost" : "won",
      });
      return;
    }

    setMoving(true);
    try {
      const saved = await onStageChange(draggableId, destination.droppableId);
      if (saved) {
        setBoardData((previous) => ({
          ...previous,
          [source.droppableId]: previous[source.droppableId].filter(
            (deal) => deal.id !== draggableId
          ),
          [destination.droppableId]: [
            ...previous[destination.droppableId].filter(
              (deal) => deal.id !== draggableId
            ),
            { ...draggedDeal, dealStage: destination.droppableId },
          ],
        }));
      }
    } finally {
      setMoving(false);
    }
  };

  const handleConfirmClosure = async (payload: DealStageUpdatePayload): Promise<boolean> => {
    if (!pendingClosure) return false;
    setMoving(true);
    try {
      const saved = await onStageChange(
        pendingClosure.deal.id,
        payload.dealStage,
        payload
      );
      if (saved) {
        const destCol =
          payload.dealStage === DEAL_STAGES.CLOSED_WON
            ? DEAL_STAGES.WON
            : payload.dealStage;
        const updatedDeal: Deal = {
          ...pendingClosure.deal,
          dealStage: destCol,
          closeDate: payload.closeDate ?? pendingClosure.deal.closeDate,
          closedWonReason:
            payload.closedWonReason ?? pendingClosure.deal.closedWonReason,
          closedLostReason:
            payload.closedLostReason ?? pendingClosure.deal.closedLostReason,
          amount: payload.amount ?? pendingClosure.deal.amount,
          dealProbability:
            payload.dealProbability ?? pendingClosure.deal.dealProbability,
          forecastProbability:
            payload.forecastProbability ?? pendingClosure.deal.forecastProbability,
          forecastCategory:
            payload.forecastCategory ?? pendingClosure.deal.forecastCategory,
          nextStep:
            payload.nextStep !== undefined
              ? payload.nextStep
              : pendingClosure.deal.nextStep,
        };
        setBoardData((previous) => {
          const next: Record<string, Deal[]> = {};
          Object.keys(previous).forEach((colKey) => {
            next[colKey] = previous[colKey].filter(
              (d) => d.id !== pendingClosure.deal.id
            );
          });
          if (next[destCol] !== undefined) {
            next[destCol] = [...next[destCol], updatedDeal];
          }
          return next;
        });
      }
      return saved;
    } finally {
      setMoving(false);
    }
  };

  if (!isMounted)
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        Loading board...
      </div>
    );

  return (
    <div className="w-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 min-h-[70vh] items-start p-2">
          {columns.map((column) => {
            const colDeals = boardData[column.id] || [];
            const colTotal = colDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            let colMissingProb = 0;
            const colWeighted = colDeals.reduce((sum, d) => {
              const prob = d.forecastProbability ?? d.dealProbability ?? column.probability;
              if (prob == null) {
                colMissingProb += 1;
                return sum;
              }
              return sum + (Number(d.amount) || 0) * Math.max(0, Math.min(100, prob)) / 100;
            }, 0);
            return (
            <div key={column.id} className="flex flex-col w-[300px] shrink-0">
              {/* Column Header */}
              <div
                className="px-3.5 py-3 rounded-t-lg border-t border-l border-r font-semibold text-sm"
                style={{ color: column.color, backgroundColor: `${column.color}12`, borderColor: `${column.color}45` }}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                    <span className="truncate">{column.title}</span>
                    {column.probability != null && (
                      <span className="shrink-0 rounded bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                        {column.probability}%
                      </span>
                    )}
                  </span>
                  <span className="bg-white/75 dark:bg-slate-800/80 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 tabular-nums">
                    {colDeals.length}
                  </span>
                </div>
                <div
                  className="mt-2 pt-2 border-t flex items-center justify-between gap-2 text-[11px] tabular-nums"
                  style={{ borderColor: `${column.color}25` }}
                >
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wide opacity-70">Total</span>
                    <span className="font-semibold">{formatCurrency(colTotal, currency)}</span>
                  </div>
                  <div className="min-w-0 text-right">
                    <span className="block text-[10px] uppercase tracking-wide opacity-70">
                      Weighted{colMissingProb > 0 ? ` (${colMissingProb} no %)` : ""}
                    </span>
                    <span className="font-bold">{formatCurrency(colWeighted, currency)}</span>
                  </div>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[150px] p-2 rounded-b-lg border-b border-l border-r border-slate-200 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-slate-100 dark:bg-slate-800/60"
                        : "bg-slate-50/50 dark:bg-slate-900/20"
                    }`}
                  >
                    {boardData[column.id]?.map((deal, index) => (
                      <Draggable
                        key={deal.id}
                        draggableId={deal.id}
                        index={index}
                        isDragDisabled={!canUpdateDeal || moving}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 bg-white dark:bg-slate-800 rounded-lg p-4 border transition-all ${
                              snapshot.isDragging
                                ? "border-cyan-400 shadow-lg shadow-cyan-500/20 rotate-1 scale-105"
                                : "border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            {/* Card top row: Deal Name + Actions */}
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2 capitalize">
                                {deal.dealName || "Unnamed Deal"}
                              </h4>
                              <div className="flex gap-1 shrink-0">
                                {canViewDeal && (
                                  <Link href={`/deals/view/${deal.id}`}>
                                    <div className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors">
                                      <FaRegEye size={13} />
                                    </div>
                                  </Link>
                                )}
                                {canUpdateDeal && (
                                  <Link href={`/deals/update/${deal.id}`}>
                                    <div className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                      <MdOutlineEdit size={14} />
                                    </div>
                                  </Link>
                                )}
                                {canCreateQuote && !deal.inQuotation && (
                                  <Link href={`/deals/quotation/${deal.id}`}>
                                    <div className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                                      <FaRegPaperPlane size={13} />
                                    </div>
                                  </Link>
                                )}
                              </div>
                            </div>

                            {/* Lead ID badge */}
                            {deal.lead_id?.lead_id && (
                              <div className="text-[10px] mb-2 truncate">
                                <span className="bg-cyan-50 text-cyan-600 border border-cyan-100 px-2 py-0.5 rounded-full font-mono">
                                  {deal.lead_id.lead_id}
                                </span>
                              </div>
                            )}

                            {/* Amount */}
                            {deal.amount != null && deal.amount > 0 && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                                {formatCurrency(Number(deal.amount), currency)}
                              </div>
                            )}

                            {/* Stage badge */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${getStageBadgeClass(deal.dealStage)}`}
                              >
                                {column.title}
                              </span>
                            </div>

                            {/* Outcome reason pill when closed */}
                            {([DEAL_STAGES.WON, DEAL_STAGES.CLOSED_WON] as string[]).includes(deal.dealStage) &&
                              deal.closedWonReason && (
                                <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 line-clamp-2 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  <span className="font-semibold">Won:</span> {deal.closedWonReason}
                                </div>
                              )}
                            {deal.dealStage === DEAL_STAGES.LOST &&
                              deal.closedLostReason && (
                                <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 line-clamp-2 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                                  <span className="font-semibold">Lost:</span> {deal.closedLostReason}
                                </div>
                              )}

                            {/* Footer: Avatar + Date + Quick Close */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                              <div className="flex items-center gap-2">
                                <AssignedToAvatar
                                  user={deal.assignedTo ?? deal.createdBy}
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {deal.createDate
                                    ? new Date(deal.createDate).toLocaleDateString(
                                        "en-GB",
                                        { day: "numeric", month: "short" }
                                      )
                                    : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {canUpdateDeal && !isClosureStage(deal.dealStage) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingClosure({
                                          deal,
                                          sourceStage: column.id,
                                          targetStage: "won",
                                        });
                                      }}
                                      title="Mark Closed Won"
                                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    >
                                      <FiCheckCircle size={10} /> Won
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingClosure({
                                          deal,
                                          sourceStage: column.id,
                                          targetStage: "lost",
                                        });
                                      }}
                                      title="Mark Closed Lost"
                                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                    >
                                      <FiXCircle size={10} /> Lost
                                    </button>
                                  </>
                                )}
                                {deal.closeDate && (
                                  <span className="text-[10px] text-rose-500 font-medium">
                                    Close:{" "}
                                    {new Date(deal.closeDate).toLocaleDateString(
                                      "en-GB",
                                      { day: "numeric", month: "short" }
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            );
          })}
        </div>
      </DragDropContext>

      <DealClosureModal
        isOpen={Boolean(pendingClosure)}
        deal={pendingClosure?.deal ?? null}
        initialStage={pendingClosure?.targetStage ?? "won"}
        onClose={() => setPendingClosure(null)}
        onConfirm={handleConfirmClosure}
      />
    </div>
  );
};

export default DealKanbanBoard;
