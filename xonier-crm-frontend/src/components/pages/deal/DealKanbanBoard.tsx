"use client";
import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Deal } from "@/src/types/deals/deal.types";
import { DEAL_STAGES } from "@/src/constants/enum";
import { MdOutlineEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FaRegPaperPlane } from "react-icons/fa";
import Link from "next/link";

interface DealKanbanBoardProps {
  deals: Deal[];
  onStageChange: (dealId: string, newStage: DEAL_STAGES) => Promise<boolean>;
  canViewDeal?: boolean;
  canUpdateDeal?: boolean;
  canCreateQuote?: boolean;
}

// Each column maps to a DEAL_STAGES value — ordered by typical sales pipeline flow
const COLUMNS = [
  {
    id: DEAL_STAGES.QUALIFICATION,
    title: "Qualification",
    color: "bg-slate-100 border-slate-200 text-slate-700",
    dot: "bg-slate-400",
  },
  {
    id: DEAL_STAGES.REQUIREMENT_ANALYSIS,
    title: "Requirement Analysis",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    dot: "bg-orange-400",
  },
  {
    id: DEAL_STAGES.PROPOSAL,
    title: "Proposal",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    id: DEAL_STAGES.NEGOTIATION,
    title: "Negotiation",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    dot: "bg-purple-400",
  },
  {
    id: DEAL_STAGES.WON,
    title: "Won",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    id: DEAL_STAGES.LOST,
    title: "Lost",
    color: "bg-red-50 border-red-200 text-red-700",
    dot: "bg-red-400",
  },
];

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
  onStageChange,
  canViewDeal = true,
  canUpdateDeal = true,
  canCreateQuote = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [boardData, setBoardData] = useState<Record<string, Deal[]>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync incoming deals into columns whenever the prop changes
  useEffect(() => {
    const newBoardData: Record<string, Deal[]> = {};
    COLUMNS.forEach((col) => {
      newBoardData[col.id] = [];
    });

    deals.forEach((deal) => {
      const stage = deal.dealStage as string;
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
  }, [deals]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceStage = source.droppableId as DEAL_STAGES;
    const destStage = destination.droppableId as DEAL_STAGES;

    // Optimistic UI update
    const newBoardData = { ...boardData };
    const sourceList = [...newBoardData[sourceStage]];
    const destList = [...newBoardData[destStage]];

    const [movedDeal] = sourceList.splice(source.index, 1);
    movedDeal.dealStage = destStage;
    destList.splice(destination.index, 0, movedDeal);

    newBoardData[sourceStage] = sourceList;
    newBoardData[destStage] = destList;
    setBoardData(newBoardData);

    // Persist if stage changed
    if (sourceStage !== destStage) {
      await onStageChange(draggableId, destStage);
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
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col w-[300px] shrink-0">
              {/* Column Header */}
              <div
                className={`px-3 py-2.5 rounded-t-lg border-t border-l border-r font-semibold text-sm flex justify-between items-center ${column.color}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${column.dot}`} />
                  {column.title}
                </span>
                <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-bold">
                  {boardData[column.id]?.length || 0}
                </span>
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
                                ₹ {Number(deal.amount).toLocaleString("en-IN")}
                              </div>
                            )}

                            {/* Stage badge */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${getStageBadgeClass(deal.dealStage)}`}
                              >
                                {(deal.dealStage || "").replace(/_/g, " ")}
                              </span>
                            </div>

                            {/* Footer: Avatar + Date */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default DealKanbanBoard;
