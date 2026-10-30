"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  FiArrowLeft,
  FiUsers,
  FiUser,
  FiActivity,
  FiCalendar,
  FiLayers,
  FiChevronDown,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import CampaignService from "@/src/services/campaign.service";
import LeadService from "@/src/services/lead.service";
import { ICampaign } from "@/src/types/campaign/campaign.types";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import AddLeadsToCampaign from "./AddLeadsToCampaign";
import Pagination from "@/src/components/common/pagination";
import CallModal from "@/src/components/pages/lead/CallModal";
import CallablePhone from "@/src/components/common/CallablePhone";
import { Lead } from "@/src/types/leads/leads.types";
import { RootState } from "@/src/store";

interface Props {
  campaign: ICampaign;
  onBack: () => void;
  onStatusChange?: (status: string) => void;
}

interface LeadData {
  _id?: string;
  lead_id?: string;
  fullName?: string;
  status?: string;
  priority?: string;
  source?: string;
  companyName?: string | null;
  projectType?: string;
  createdAt?: string;
  connectStatus?: string | null;
  followUpAt?: string | null;
  phone?: string;
}

interface CampaignLead {
  _id: string;
  campaignStatus: string;
  importedAt?: string;
  importBatch?: string;
  lead?: LeadData;
  assignedTo?: { _id?: string; firstName?: string; lastName?: string; email?: string } | null;
}

const ENGAGEMENT_STATUSES = [
  { label: "Not Reached",       value: "not_reached",       dot: "bg-gray-400" },
  { label: "Connected",         value: "connected",         dot: "bg-sky-400" },
  { label: "Not Connected",     value: "not_connected",     dot: "bg-yellow-400" },
  { label: "Interested",        value: "interested",        dot: "bg-emerald-400" },
  { label: "Meeting Scheduled", value: "meeting_scheduled", dot: "bg-violet-400" },
  { label: "Not Interested",    value: "not_interested",    dot: "bg-rose-400" },
  { label: "Wrong Number",      value: "wrong_number",      dot: "bg-red-400" },
  { label: "Call Back",         value: "call_back",         dot: "bg-amber-400" },
];

const campaignStatusColors: Record<string, string> = {
  unassigned: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  skipped: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

const CampaignDetailView: React.FC<Props> = ({ campaign, onBack, onStatusChange }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);
  const currentUserId = auth.user?._id ?? auth.user?.id ?? "";
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageLimit = 10;
  
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnectStatusChange = async (leadId: string, newStatus: string) => {
    if (!leadId) return;
    setUpdatingLeadId(leadId);
    setOpenDropdownId(null);
    try {
      const res = await LeadService.updateEngagementStatus(leadId, { status: newStatus as any });
      if (res.status === 200) {
        toast.success("Engagement status updated");
        // Update local state to reflect change immediately without refetch
        setLeads(prev => prev.map(cl => {
          if (cl.lead?._id === leadId) {
            return {
              ...cl,
              lead: { ...cl.lead, connectStatus: newStatus }
            };
          }
          return cl;
        }));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const fetchLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const campaignId = campaign.id || campaign._id;
      const res = await CampaignService.getCampaignLeads(campaignId, currentPage, pageLimit);
      if (res.status === 200) {
        const payload = res.data?.data;
        // Backend returns: { data: [...], page, limit, total, totalPages }
        if (payload?.data) {
          setLeads(payload.data);
          setTotalPages(Number(payload.totalPages) || 1);
          setTotal(Number(payload.total) || 0);
        } else if (Array.isArray(payload)) {
          setLeads(payload);
          setTotalPages(1);
          setTotal(payload.length);
        } else {
          setLeads([]);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch campaign leads");
    } finally {
      setIsLoading(false);
    }
  }, [campaign.id, campaign._id, currentPage]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Other members' claims disappear on refresh without resetting this table.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void fetchLeads(false);
    };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchLeads]);

  const [callingLead, setCallingLead] = useState<CampaignLead | null>(null);
  const [status, setStatus] = useState<string>(String(campaign.status || "active").toLowerCase());
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const isPaused = status === "paused";

  const handleTogglePause = async () => {
    const next = isPaused ? "active" : "paused";
    setIsTogglingPause(true);
    try {
      const campaignId = campaign.id || campaign._id;
      const res = await CampaignService.updateStatus(campaignId, { status: next as any });
      if (res.status === 200) {
        setStatus(next);
        toast.success(next === "paused" ? "Campaign paused" : "Campaign resumed");
        onStatusChange?.(next);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update campaign status");
    } finally {
      setIsTogglingPause(false);
    }
  };
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (cl: CampaignLead) => {
    setClaimingId(cl._id);
    try {
      const campaignId = campaign.id || campaign._id;
      const res = await CampaignService.claimLead(campaignId, cl._id);
      if (res.status === 200) {
        toast.success("Lead assigned to you");
        const leadId = res.data?.data?.leadId || cl.lead?._id;
        if (leadId) setCallingLead({ ...cl, lead: { ...cl.lead, _id: leadId } });
        void fetchLeads(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to claim lead");
      fetchLeads();
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-5">
      {/* Back + Title */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors font-medium"
        >
          <FiArrowLeft size={16} />
          {t("back") || "Back"}
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{campaign.name}</h2>
        <StatusBadge status={status} />
        <button
          onClick={handleTogglePause}
          disabled={isTogglingPause || status === "completed" || status === "archived" || status === "deleted"}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 ${
            isPaused
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-amber-500 hover:bg-amber-600 text-white"
          }`}
        >
          {isPaused ? <FiPlay size={13} /> : <FiPause size={13} />}
          {isTogglingPause ? "Please wait..." : isPaused ? "Resume Campaign" : "Pause Campaign"}
        </button>
      </div>

      {isPaused && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-300 text-sm font-medium">
          <FiPause size={14} />
          This campaign is paused. Calling is disabled until it is resumed.
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<FiLayers />} label="Total Leads" value={campaign.totalLeads ?? total} color="bg-cyan-500" />
        <StatCard icon={<FiActivity />} label="Assigned" value={campaign.assignedLeads ?? "—"} color="bg-indigo-500" />
        <StatCard icon={<FiUsers />} label="Managers" value={campaign.managers?.length ?? 0} color="bg-violet-500" />
        <StatCard icon={<FiUser />} label="Agents" value={campaign.agents?.length ?? 0} color="bg-emerald-500" />
      </div>

      {/* Campaign Meta */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-6 text-sm shadow-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <FiActivity className="text-cyan-500" size={14} />
          <span className="font-medium">Mode:</span>
          <span className="capitalize">{campaign.distributionMode?.replace("_", " ")}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <FiCalendar className="text-cyan-500" size={14} />
          <span className="font-medium">Created:</span>
          <CreatedAt timestamp={campaign.createdAt} />
        </div>
      </div>

      {/* Leads Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Campaign Leads</h3>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {total} total lead{total !== 1 ? "s" : ""}
              </span>
            )}
            <AddLeadsToCampaign campaignId={campaign.id || campaign._id} onImported={fetchLeads} />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Lead Status</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3">Engagement Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700">
                    {Array.from({ length: 9 }).map((__, ci) => (
                      <td key={ci} className="px-5 py-3">
                        <Skeleton width={ci === 0 ? 24 : ci === 1 ? 120 : ci === 7 ? 150 : 90} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FiLayers size={28} className="opacity-30" />
                      <p>No leads found for this campaign</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => {
                  const ld = lead.lead;
                  const isAssignedToMe = Boolean(
                    currentUserId && lead.assignedTo?._id === currentUserId
                  );
                  const canAccessLead = isAssignedToMe || auth.isAdmin;
                  return (
                    <tr
                      key={lead._id}
                      onClick={() => canAccessLead && ld?._id && router.push(`/leads/view/${ld._id}`)}
                      title={canAccessLead ? "Open lead" : "This lead is assigned to another agent"}
                      className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 transition-colors ${
                        canAccessLead
                          ? "hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {(currentPage - 1) * pageLimit + idx + 1}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {ld?.fullName || "—"}
                      </td>
                      <td
                        onClick={(event) => event.stopPropagation()}
                        className="px-5 py-3"
                      >
                        {ld?.phone ? (
                            <CallablePhone
                              lead={{ ...ld, id: ld._id } as Lead}
                              displayValue={ld.phone}
                              campaignId={campaign.id || campaign._id}
                              campaignLeadId={lead._id}
                              campaignAssignment={{
                                campaignId: campaign.id || campaign._id,
                                campaignLeadId: lead._id,
                                assignedAgentId: lead.assignedTo?._id || "",
                                agents: (campaign.agents || []).map((agent) => ({
                                  value: String(agent.id || agent._id || agent),
                                  label: [agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email || "Agent",
                                })),
                                onAssigned: (agentId) => {
                                  const agent = campaign.agents.find((item) => String(item.id || item._id || item) === agentId);
                                  setLeads((previous) => previous.map((item) => item._id === lead._id
                                    ? {
                                        ...item,
                                        assignedTo: { _id: agentId, firstName: agent?.firstName, lastName: agent?.lastName, email: agent?.email },
                                        campaignStatus: "assigned",
                                      }
                                    : item
                                  ));
                                },
                              }}
                              onLeadUpdated={(leadId, updatedLead) => {
                                setLeads((previous) => previous.map((campaignLead) =>
                                  campaignLead.lead?._id === leadId
                                    ? { ...campaignLead, lead: { ...campaignLead.lead, ...updatedLead } }
                                    : campaignLead
                                ));
                              }}
                              onCallDisposed={(leadId, connectStatus) => {
                                setLeads((previous) => previous.map((campaignLead) =>
                                  campaignLead.lead?._id === leadId
                                    ? { ...campaignLead, lead: { ...campaignLead.lead, connectStatus } }
                                    : campaignLead
                                ));
                                // Mobile may have also set followUpAt. Reload this page so
                                // the exact next follow-up date/time appears beneath the number.
                                void fetchLeads();
                              }}
                            />
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3">{ld?.companyName || "—"}</td>
                      <td className="px-5 py-3 capitalize">{ld?.source || "—"}</td>
                      <td className="px-5 py-3 capitalize">{ld?.priority || "—"}</td>
                      <td className="px-5 py-3">
                        {ld?.status ? <StatusBadge status={ld.status} /> : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {lead.assignedTo?._id ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {[lead.assignedTo.firstName, lead.assignedTo.lastName].filter(Boolean).join(" ") || lead.assignedTo.email || "Agent"}
                            </span>
                            <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                              campaignStatusColors[(lead.campaignStatus || "assigned").toLowerCase()] ?? campaignStatusColors.assigned
                            }`}>
                              {(lead.campaignStatus || "assigned").replace(/_/g, " ")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              campaignStatusColors.unassigned
                            }`}>
                              Unassigned
                            </span>
                            {(
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClaim(lead);
                                }}
                                disabled={claimingId === lead._id || isPaused}
                                title={isPaused ? "Campaign is paused" : undefined}
                                className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
                              >
                                {claimingId === lead._id ? "Claiming..." : "Start Calling"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 relative">
                        {ld?._id ? (
                          <div className="relative" ref={openDropdownId === ld._id ? dropdownRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === ld._id ? null : ld._id!);
                              }}
                              disabled={updatingLeadId === ld._id || !canAccessLead}
                              title={!canAccessLead ? "Only the assigned agent can update this lead" : undefined}
                              className={`flex items-center justify-between w-[160px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                updatingLeadId === ld._id
                                  ? "bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 shadow-sm"
                              }`}
                            >
                              {updatingLeadId === ld._id ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                  Updating...
                                </span>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      ENGAGEMENT_STATUSES.find(s => s.value === (ld.connectStatus || 'not_reached'))?.dot || 'bg-gray-400'
                                    }`} />
                                    <span>
                                      {ENGAGEMENT_STATUSES.find(s => s.value === (ld.connectStatus || 'not_reached'))?.label || 'Not Reached'}
                                    </span>
                                  </div>
                                  <FiChevronDown />
                                </>
                              )}
                            </button>

                            {openDropdownId === ld._id && (
                              <div className="absolute top-full left-0 mt-1 w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                {ENGAGEMENT_STATUSES.map((status) => (
                                  <button
                                    key={status.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConnectStatusChange(ld._id!, status.value);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                                  >
                                    <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{status.label}</span>
                                    {status.value === 'not_reached' && (
                                      <span className="ml-auto text-[9px] uppercase tracking-wider text-gray-400 font-semibold group-hover:text-gray-500">Default</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t dark:border-gray-700">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
      {callingLead?.lead?._id && (
        <CallModal
          lead={{ ...callingLead.lead, id: callingLead.lead._id } as Lead}
          campaignId={campaign.id || campaign._id}
          campaignLeadId={callingLead._id}
          onClose={() => { setCallingLead(null); void fetchLeads(false); }}
          onDisposed={() => { void fetchLeads(false); }}
        />
      )}
    </div>
  );
};

export default CampaignDetailView;
