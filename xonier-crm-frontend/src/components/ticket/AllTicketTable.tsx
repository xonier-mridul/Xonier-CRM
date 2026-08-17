"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FiSearch,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiInbox,
  FiFilter,
  FiCheck,
  FiUserPlus,
  FiX,
  FiUsers,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Ticket, TicketStatus, TicketPriority } from "@/src/types/ticket/ticket.type";
import { allTickets } from "@/src/constants/ticket";

/* ---------------------------------- */
/* Dummy Agents Data                   */
/* ---------------------------------- */

const availableAgents = [
  { id: "AG-01", name: "Ravi Kumar", department: "Engineering" },
  { id: "AG-02", name: "Neha Verma", department: "Customer Success" },
  { id: "AG-03", name: "Suresh Iyer", department: "Sales Operations" },
  { id: "AG-04", name: "Priya Nair", department: "Marketing" },
  { id: "AG-05", name: "Arjun Reddy", department: "IT Admin" },
];

/* ---------------------------------- */
/* Local Helpers (badges)              */
/* ---------------------------------- */

const statusStyles: Record<TicketStatus, { bg: string; text: string; key: string }> = {
  OPEN: { bg: "bg-blue-50", text: "text-blue-700", key: "status_open" },
  UNDER_REVIEW: { bg: "bg-orange-50", text: "text-orange-700", key: "status_under_review" },
  IN_PROGRESS: { bg: "bg-teal-50", text: "text-teal-700", key: "status_in_progress" },
  WAITING_FOR_USER: { bg: "bg-yellow-50", text: "text-yellow-700", key: "status_waiting_for_user" },
  RESOLVED: { bg: "bg-emerald-50", text: "text-emerald-700", key: "status_resolved" },
};

const priorityStyles: Record<TicketPriority, { text: string; key: string }> = {
  LOW: { text: "text-gray-500", key: "priority_low" },
  MEDIUM: { text: "text-amber-500", key: "priority_medium" },
  HIGH: { text: "text-red-500", key: "priority_high" },
};

function StatusPill({ status }: { status: TicketStatus }) {
  const { t } = useTranslation();
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(style.key)}
    </span>
  );
}

/* ---------------------------------- */
/* Assign Modal Component              */
/* ---------------------------------- */

interface AssignModalProps {
  isOpen: boolean;
  selectedCount: number;
  onAssign: (agentId: string) => void;
  onClose: () => void;
}

function AssignModal({ isOpen, selectedCount, onAssign, onClose }: AssignModalProps) {
  const { t } = useTranslation();
  const [searchAgent, setSearchAgent] = useState("");

  const filteredAgents = availableAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchAgent.toLowerCase()) ||
      agent.department.toLowerCase().includes(searchAgent.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1BA2C3]/10 text-[#1BA2C3]">
                <FiUserPlus size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t("assign_tickets")}</h3>
                <p className="text-xs text-gray-500">
                  {t("assign_selected_count", { count: selectedCount })}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <FiX size={16} />
            </motion.button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <FiSearch
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchAgent}
              onChange={(e) => setSearchAgent(e.target.value)}
              placeholder={t("search_agents_placeholder") ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-700 outline-none focus:border-[#1BA2C3] focus:bg-white focus:ring-2 focus:ring-[#1BA2C3]/20 transition-all"
            />
          </div>

          {/* Agent List */}
          <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
            {filteredAgents.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">{t("no_agents_found")}</p>
            ) : (
              filteredAgents.map((agent) => (
                <motion.button
                  key={agent.id}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onAssign(agent.id)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1BA2C3]/20 to-[#33BF8B]/20 text-[#1BA2C3] text-xs font-bold">
                    {agent.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.department}</p>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            {t("cancel")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------------------------------- */
/* Main Component                      */
/* ---------------------------------- */

const PAGE_SIZE = 5;
const FILTER_OPTIONS: Array<TicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
];

export default function AllTicketsTable() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignedAgents, setAssignedAgents] = useState<Record<string, string>>({});
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const router = useRouter();

  const filteredTickets: Ticket[] = useMemo(() => {
    return allTickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const paginatedTickets = filteredTickets.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: TicketStatus | "ALL") => {
    setStatusFilter(value);
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedTickets.map((t) => t.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const handleAssign = (agentId: string) => {
    const agent = availableAgents.find((a) => a.id === agentId);
    if (!agent) return;

    setAssignedAgents((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = agent.name;
      });
      return next;
    });

    setSelectedIds(new Set());
    setIsAssignModalOpen(false);
  };

  const handleReassign = (ticketId: string, agentId: string) => {
    const agent = availableAgents.find((a) => a.id === agentId);
    if (!agent) return;

    setAssignedAgents((prev) => ({
      ...prev,
      [ticketId]: agent.name,
    }));
  };

  const getAgentName = (ticketId: string): string | null => {
    return assignedAgents[ticketId] || null;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-gray-100 p-6 md:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t("all_tickets")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("all_tickets_subtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk Assign Button */}
            <AnimatePresence>
              {selectedCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setIsAssignModalOpen(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#33BF8B] to-[#1BA2C3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow whitespace-nowrap"
                >
                  <FiUsers size={16} />
                  {t("assign_selected", { count: selectedCount })}
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => router.push("/support/raiseTicket")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow whitespace-nowrap"
            >
              <FiPlus size={16} />
              {t("raise_ticket")}
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 md:flex-row md:items-center md:gap-4 md:p-8 md:py-5">
          <div className="relative flex-1">
            <FiSearch
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("search_tickets_placeholder") ?? ""}
              aria-label={t("search_tickets_placeholder")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-[#1BA2C3] focus:bg-white focus:ring-2 focus:ring-[#1BA2C3]/20 transition-all"
            />
          </div>

          <div className="relative">
            <FiFilter
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as TicketStatus | "ALL")}
              aria-label={t("filter_by_status")}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-8 text-sm font-medium text-gray-700 outline-none focus:border-[#1BA2C3] focus:bg-white focus:ring-2 focus:ring-[#1BA2C3]/20 transition-all md:w-56"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? t("all_statuses") : t(statusStyles[option].key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                {/* Checkbox Column */}
                <th className="whitespace-nowrap px-4 md:px-6 py-3 font-medium">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        paginatedTickets.length > 0 &&
                        paginatedTickets.every((t) => selectedIds.has(t.id))
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#1BA2C3] focus:ring-[#1BA2C3] cursor-pointer"
                    />
                  </label>
                </th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("ticket_id")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("subject")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("department")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("status")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("priority")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("assigned_to")}</th>
                <th className="whitespace-nowrap px-6 py-3 font-medium">{t("updated")}</th>
                <th className="whitespace-nowrap px-6 md:px-8 py-3 font-medium text-right">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {paginatedTickets.map((ticket, index) => {
                  const isSelected = selectedIds.has(ticket.id);
                  const assignedName = getAgentName(ticket.id);

                  return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${
                        isSelected ? "bg-[#1BA2C3]/5" : "hover:bg-gray-50/70"
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="whitespace-nowrap px-4 md:px-6 py-4">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(ticket.id)}
                            className="h-4 w-4 relative rounded border-gray-300 text-[#1BA2C3] focus:ring-[#1BA2C3] cursor-pointer"
                          />
                          {/* {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute"
                            >
                              <FiCheck className="h-3.5 w-3.5 text-white" />
                            </motion.span>
                          )} */}
                        </label>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-gray-900">
                        #{ticket.id}
                      </td>
                      <td className="max-w-xs px-6 py-4 text-gray-600 truncate">{ticket.subject}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{ticket.department}</td>
                      <td className="px-6 py-4">
                        <StatusPill status={ticket.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`text-sm font-medium ${priorityStyles[ticket.priority].text}`}>
                          {t(priorityStyles[ticket.priority].key)}
                        </span>
                      </td>
                      {/* Assigned To Column */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {assignedName ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <FiCheck size={12} />
                              {assignedName}
                            </span>
                            {/* Reassign Dropdown */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleReassign(ticket.id, e.target.value);
                              }}
                              className="h-7 w-7 appearance-none flex justify-center items-center outline-none rounded-lg border border-gray-200 bg-white text-xs text-gray-400 hover:border-[#1BA2C3]/40 cursor-pointer px-1"
                              title={t("reassign") ?? ""}
                            >
                              <option value="" disabled>
                                ↻
                              </option>
                              {availableAgents
                                .filter((a) => a.name !== assignedName)
                                .map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{t("not_assigned")}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">{ticket.updatedAt}</td>
                      <td className="whitespace-nowrap px-6 md:px-8 py-4 text-right">
                        <motion.button
                          onClick={() => router.push(`/support/ticket/${ticket.id}`)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={t("view_ticket")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-[#1BA2C3]/10 hover:text-[#1BA2C3] transition-colors"
                        >
                          <FiEye size={16} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {paginatedTickets.length === 0 && <EmptyState />}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          <AnimatePresence mode="wait">
            {paginatedTickets.map((ticket, index) => {
              const isSelected = selectedIds.has(ticket.id);
              const assignedName = getAgentName(ticket.id);

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className={`p-5 space-y-3 ${isSelected ? "bg-[#1BA2C3]/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <label className="flex items-center justify-center cursor-pointer mt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(ticket.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#1BA2C3] focus:ring-[#1BA2C3] cursor-pointer"
                        />
                      </label>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">#{ticket.id}</p>
                        <p className="text-sm text-gray-600 mt-1">{ticket.subject}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => router.push(`/support/ticket/${ticket.id}`)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={t("view_ticket")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-[#1BA2C3]/10 hover:text-[#1BA2C3] transition-colors"
                    >
                      <FiEye size={16} />
                    </motion.button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={ticket.status} />
                    <span className={`text-xs font-medium ${priorityStyles[ticket.priority].text}`}>
                      {t(priorityStyles[ticket.priority].key)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{ticket.department}</span>
                  </div>
                  {/* Mobile Assigned To */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{t("assigned_to")}:</span>
                    {assignedName ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <FiCheck size={10} />
                        {assignedName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{t("not_assigned")}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {t("updated")}: {ticket.updatedAt}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {paginatedTickets.length === 0 && <EmptyState />}
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-gray-100 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <p className="text-sm text-gray-500">
              {t("showing_results", {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, filteredTickets.length),
                total: filteredTickets.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: page === 1 ? 1 : 1.05 }}
                whileTap={{ scale: page === 1 ? 1 : 0.95 }}
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                aria-label={t("previous_page")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#1BA2C3]/40 hover:text-[#1BA2C3] transition-colors"
              >
                <FiChevronLeft size={16} />
              </motion.button>
              <span className="text-sm font-medium text-gray-600 px-2">
                {t("page_of", { page, totalPages })}
              </span>
              <motion.button
                whileHover={{ scale: page === totalPages ? 1 : 1.05 }}
                whileTap={{ scale: page === totalPages ? 1 : 0.95 }}
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                aria-label={t("next_page")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#1BA2C3]/40 hover:text-[#1BA2C3] transition-colors"
              >
                <FiChevronRight size={16} />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Assign Modal */}
      <AssignModal
        isOpen={isAssignModalOpen}
        selectedCount={selectedCount}
        onAssign={handleAssign}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </>
  );
}

/* ---------------------------------- */
/* Empty State                         */
/* ---------------------------------- */

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
        <FiInbox size={24} />
      </div>
      <p className="text-sm font-medium text-gray-500">{t("no_tickets_found")}</p>
      <p className="text-xs text-gray-400 max-w-xs">{t("no_tickets_found_desc")}</p>
    </div>
  );
}