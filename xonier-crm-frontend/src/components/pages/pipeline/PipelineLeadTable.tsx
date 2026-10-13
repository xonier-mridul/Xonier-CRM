"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw, Search, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import CampaignService from "@/src/services/campaign.service";
import Pagination from "@/src/components/common/pagination";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import SensitiveField from "@/src/components/common/SensitiveField";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";
import { Lead } from "@/src/types/leads/leads.types";
import { User } from "@/src/types/auth/auth.types";

export type PipelineLeadFilter =
  | "all"
  | "in_progress"
  | "meetings_scheduled"
  | "meetings_done"
  | "follow_ups"
  | "fresh_enquiry"
  | "contacted"
  | "engaged"
  | "meetings"
  | "closed_won";

type PipelineLead = Partial<Lead> & { id: string };

interface Props {
  filter: PipelineLeadFilter;
  title: string;
  onBack: () => void;
}

const LIMIT = 10;

const getUserName = (user?: Partial<User> | null) => {
  if (!user) return "Unassigned";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown user";
};

const valueOrDash = (value?: string | null) => value?.trim() || "—";

const PipelineLeadTable = ({ filter, title, onBack }: Props) => {
  const router = useRouter();
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await CampaignService.getPipelineLeads(filter, page, LIMIT, {
        search: debouncedSearch,
      });
      const payload = response.data?.data;
      setLeads(payload?.data ?? []);
      setTotal(Number(payload?.total) || 0);
      setTotalPages(Number(payload?.totalPages) || 1);
    } catch {
      toast.error("Failed to load pipeline leads");
      setLeads([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filter, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLeads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLeads]);

  const renderAssignedTo = (assignedTo?: User[] | null) => {
    if (!assignedTo?.length) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <UserRound size={13} /> Unassigned
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {assignedTo.map((user) => (
          <Link
            key={user.id || user._id}
            href={`/users/${user.id || user._id}`}
            onClick={(event) => event.stopPropagation()}
            className="text-xs font-semibold text-slate-700 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400"
          >
            {getUserName(user)}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-cyan-700 dark:hover:text-cyan-400"
            aria-label="Back to pipeline overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                {total.toLocaleString()} lead{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Unique leads from your campaign pipeline
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchLeads()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Lead details</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Assignment, status, source, owner and contact information for this segment
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-800 outline-none transition-shadow focus:ring-2 focus:ring-cyan-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/70">
              <tr>
                {[
                  "Lead",
                  "Contact",
                  "Company / Project",
                  "Lifecycle",
                  "Engagement",
                  "Assigned To",
                  "Created By",
                  "Source",
                  "Created",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="border-b border-gray-100 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-5">
                        <div className={`h-3 rounded bg-gray-100 dark:bg-gray-700 ${cell === 0 ? "w-32" : "w-20"}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                    No leads match this pipeline filter.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-4">
                      <Link href={`/leads/view/${lead.id}`} className="group block">
                        <span className="block text-sm font-bold text-gray-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                          {valueOrDash(lead.fullName)}
                        </span>
                        <span className="mt-1 block text-[11px] text-gray-400">{valueOrDash(lead.lead_id)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {lead.email ? <SensitiveField value={lead.email} maskedValue={maskEmail(lead.email)} link={`mailto:${lead.email}`} fontSize="[11px]" /> : <span className="text-xs text-gray-400">—</span>}
                        {lead.phone ? <SensitiveField value={lead.phone} maskedValue={maskPhone(lead.phone)} link={`tel:${lead.phone}`} fontSize="[11px]" /> : <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block max-w-[170px] truncate text-xs font-semibold text-gray-700 dark:text-gray-200" title={lead.companyName || undefined}>
                        {valueOrDash(lead.companyName)}
                      </span>
                      <span className="mt-1 block max-w-[170px] truncate text-[11px] capitalize text-gray-400" title={lead.projectType || undefined}>
                        {valueOrDash(lead.projectType?.replace(/_/g, " "))}
                      </span>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={lead.status || "new"} /></td>
                    <td className="px-4 py-4"><StatusBadge status={lead.connectStatus || "not_reached"} /></td>
                    <td className="px-4 py-4">{renderAssignedTo(lead.assignedTo)}</td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-300">{getUserName(lead.createdBy)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold capitalize text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                        {valueOrDash(lead.source?.replace(/_/g, " "))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {lead.createdAt ? <CreatedAt timestamp={lead.createdAt} /> : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => router.push(`/leads/view/${lead.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:border-cyan-300 hover:text-cyan-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-cyan-600 dark:hover:text-cyan-400"
                      >
                        View <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineLeadTable;
