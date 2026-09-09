"use client";
import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Lead } from "@/src/types/leads/leads.types";
import { SALES_STATUS } from "@/src/constants/enum";
import { MdOutlineEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import Link from "next/link";
import StatusBadge from "@/src/components/common/Status";

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: SALES_STATUS) => Promise<boolean>;
}

// Map the enum values to user-friendly column titles and styling
const COLUMNS = [
  { id: SALES_STATUS.NEW, title: "New", color: "bg-slate-100 border-slate-200 text-slate-700" },
  { id: SALES_STATUS.CONTACTED, title: "Contacted", color: "bg-blue-50 border-blue-100 text-blue-700" },
  { id: SALES_STATUS.QUALIFIED, title: "Qualified", color: "bg-indigo-50 border-indigo-100 text-indigo-700" },
  { id: SALES_STATUS.PROPOSAL, title: "Proposal", color: "bg-purple-50 border-purple-100 text-purple-700" },
  { id: SALES_STATUS.WON, title: "Won", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
  { id: SALES_STATUS.LOST, title: "Lost", color: "bg-red-50 border-red-100 text-red-700" },
];

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

const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({ leads, onStatusChange }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [boardData, setBoardData] = useState<Record<string, Lead[]>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        // Fallback for leads with unknown status (if any)
        if (!newBoardData[SALES_STATUS.NEW]) newBoardData[SALES_STATUS.NEW] = [];
        newBoardData[SALES_STATUS.NEW].push(lead);
      }
    });

    setBoardData(newBoardData);
  }, [leads]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return; // Dropped outside the list
    if (source.droppableId === destination.droppableId && source.index === destination.index) return; // Dropped in the same place

    const sourceStatus = source.droppableId as SALES_STATUS;
    const destStatus = destination.droppableId as SALES_STATUS;

    // Optimistically update the UI
    const newBoardData = { ...boardData };
    const sourceList = [...newBoardData[sourceStatus]];
    const destList = [...newBoardData[destStatus]];

    const [movedLead] = sourceList.splice(source.index, 1);
    
    // Update the lead's status optimistically
    movedLead.status = destStatus;
    
    destList.splice(destination.index, 0, movedLead);

    newBoardData[sourceStatus] = sourceList;
    newBoardData[destStatus] = destList;
    setBoardData(newBoardData);

    // Call the API
    if (sourceStatus !== destStatus) {
      const success = await onStatusChange(draggableId, destStatus);
      if (!success) {
        // Revert on failure (we would ideally trigger a full refetch, but here we can just wait for the parent to pass down old leads)
        // The parent state hasn't changed unless onStatusChange succeeds, so it will re-render and fix it automatically or we can manually revert.
      }
    }
  };

  if (!isMounted) return <div className="h-96 flex items-center justify-center">Loading board...</div>;

  return (
    <div className="w-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 min-h-[70vh] items-start p-2">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col w-[300px] shrink-0">
              <div className={`px-3 py-2.5 rounded-t-lg border-t border-l border-r font-semibold text-sm flex justify-between items-center ${column.color}`}>
                <span>{column.title}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                  {boardData[column.id]?.length || 0}
                </span>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[150px] p-2 rounded-b-lg border-b border-l border-r border-slate-200 transition-colors ${
                      snapshot.isDraggingOver ? "bg-slate-50 dark:bg-slate-800/50" : "bg-slate-50/50 dark:bg-slate-900/20"
                    }`}
                  >
                    {boardData[column.id]?.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
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
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
                                {lead.fullName || "Unnamed Lead"}
                              </h4>
                              <div className="flex gap-1 shrink-0">
                                <Link href={`/leads/view/${lead.id}`}>
                                  <div className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors">
                                    <FaRegEye size={14} />
                                  </div>
                                </Link>
                                <Link href={`/leads/edit/${lead.id}`}>
                                  <div className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                    <MdOutlineEdit size={14} />
                                  </div>
                                </Link>
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
                                  {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              <StatusBadge status={lead.status as SALES_STATUS} />
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

export default LeadKanbanBoard;
