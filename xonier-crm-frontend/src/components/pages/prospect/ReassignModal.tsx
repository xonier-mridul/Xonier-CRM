"use client";

import { JSX, useState } from "react";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { FaXmark, FaCheck } from "react-icons/fa6";
import { MdOutlinePersonAdd } from "react-icons/md";
import { Prospect } from "@/src/types/prospect/prospect.type";
import { User } from "@/src/types/auth/auth.types";
import UserSelect from "@/src/components/common/userselect";

interface ReassignModalProps {
  leads: Prospect[];
  assignableUsers: User[];
  onClose: () => void;
  onReassign: (userId: string, leadIds: string[]) => Promise<void>;
}

const Spinner = ({ color }: { color: string }) => (
  <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const ReassignModal = ({
  leads,
  assignableUsers,
  onClose,
  onReassign,
}: ReassignModalProps): JSX.Element => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  const handleReassign = async () => {
    if (!selectedUserId) return;
    setIsReassigning(true);
    try {
      await onReassign(selectedUserId, leads.map((l) => l.id));
      onClose();
    } catch (error) {
      console.error("Reassign failed:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header - Light Yellow Theme */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <MdOutlinePersonAdd className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reassign Leads</h3>
              <p className="text-xs text-yellow-100">
                {leads.length} lead{leads.length > 1 ? "s" : ""} selected for reassignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {/* Info Banner */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Reassigning Leads
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                These leads will be reassigned to a new user. The previous assignment will be replaced.
              </p>
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Select New User <span className="text-red-500">*</span>
            </label>
            {/* <UserSelect
              users={assignableUsers}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              placeholder="Search & select user..."
            /> */}
            <UserSelect
              mode="single"
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder="Search & select user..."
            />
          </div>

          {/* Selected Leads List */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Leads to Reassign ({leads.length})
            </label>
            <div className="bg-amber-50/50 dark:bg-gray-700/50 rounded-xl border border-amber-100 dark:border-gray-600 max-h-64 overflow-y-auto">
              {leads.map((lead, idx) => (
                <div
                  key={lead.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx !== leads.length - 1 ? "border-b border-amber-100 dark:border-gray-600" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold capitalize truncate text-slate-700 dark:text-slate-200">
                      {lead.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {lead.email || lead.phone || "No contact info"}
                    </p>
                  </div>
                  {lead.assignTo?.id && (
                    <div className="shrink-0">
                      <div className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Currently: {lead.assignTo.firstName || "Assigned"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warning if no user selected */}
          {!selectedUserId && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
                ⚠️ Please select a user to reassign the leads
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm border border-slate-200 dark:border-gray-600 transition-colors shadow-sm"
          >
            <FaXmark className="w-3.5 h-3.5" /> Cancel
          </button>

          <button
            onClick={handleReassign}
            disabled={!selectedUserId || isReassigning}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 disabled:from-amber-300 disabled:to-yellow-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            {isReassigning ? (
              <>
                <Spinner color="text-white" /> Reassigning...
              </>
            ) : (
              <>
                <MdOutlinePersonAdd className="w-4 h-4" /> Reassign Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReassignModal;