"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw, Search, Users, UserRound, ContactRound, Activity, Megaphone,
  ClipboardList, PhoneMissed, PhoneCall, HeartHandshake, CalendarCheck,
  PhoneForwarded, UserRoundX, UserCheck, Mail, Phone, ChevronLeft,
  ChevronRight, Info, LoaderCircle, SearchX, BarChart3,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CampaignService from "@/src/services/campaign.service";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useFeatures } from "@/src/hooks/useFeatures";
import { FEATURES, PERMISSIONS } from "@/src/constants/enum";

interface Agent {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: string;
  campaigns: number;
  totalLeads: number;
  notReached: number;
  connected: number;
  interested: number;
  meetings: number;
  callBack: number;
  notInterested: number;
}

const columns = [
  ["campaigns", "Campaigns", Megaphone, "text-indigo-500"],
  ["totalLeads", "Total Leads Assigned", ClipboardList, "text-cyan-600 dark:text-cyan-400"],
  ["notReached", "Not Reached", PhoneMissed, "text-slate-400"],
  ["connected", "Connected", PhoneCall, "text-blue-500"],
  ["interested", "Interested", HeartHandshake, "text-emerald-500"],
  ["meetings", "Meetings Scheduled", CalendarCheck, "text-violet-500"],
  ["callBack", "Call Back", PhoneForwarded, "text-amber-500"],
  ["notInterested", "Not Interested", UserRoundX, "text-rose-500"],
] as const;

const avatarColors = [
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
];

export default function AgentsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { hasFeature } = useFeatures();
  const allowed = hasPermission(PERMISSIONS.readLead) && hasPermission(PERMISSIONS.readUser)
    && hasFeature(FEATURES.CRM) && hasFeature(FEATURES.SALES);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(() => {
    return CampaignService.getAgents().then(response => {
      setAgents(response.data.data.agents);
      setError(false);
    }).catch(() => {
      setError(true);
    }).finally(() => {
      setLoading(false);
    });
  }, []);
  useEffect(() => { if (allowed) void load(); }, [allowed, load]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agents.filter(agent => `${agent.firstName} ${agent.lastName ?? ""} ${agent.email ?? ""} ${agent.phone ?? ""}`.toLowerCase().includes(query));
  }, [agents, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const label = (text: string) => t(text, { defaultValue: text });

  if (!allowed) return <div className="p-6">{label("You do not have access to the agent breakdown.")}</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-100 bg-linear-to-br from-cyan-50 via-white to-indigo-50/60 p-6 dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-cyan-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"><Users size={24} aria-hidden="true" /></div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">{label("Sales workspace")}</p>
            <h1 className="text-2xl font-bold tracking-tight">{label("Agents")}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label("Agent-wise lead assignments and engagement across your company.")}</p>
          </div>
        </div>
        <button onClick={() => { setLoading(true); void load(); }} disabled={loading} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:text-cyan-300 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{label("Refresh")}
        </button>
      </div>
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:bg-red-950 dark:border-red-800">
          {label("Unable to load agents. Please try refreshing.")}
        </div>
      ) : <>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Total Agents", value: agents.length, icon: Users, color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400", detail: "Your sales team at a glance" },
            { title: "Active Agents", value: agents.filter(agent => agent.status === "active").length, icon: UserCheck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", detail: "Currently active accounts" },
            { title: "Total Lead Assignments", value: agents.reduce((sum, agent) => sum + agent.totalLeads, 0), icon: ClipboardList, color: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", detail: "Assigned across your agents" },
          ].map(({ title, value, icon: Icon, color, detail }) => <div key={title} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label(title)}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{loading ? "—" : value.toLocaleString()}</p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{label(detail)}</p>
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={22} aria-hidden="true" /></div>
          </div>)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold"><BarChart3 size={19} className="text-cyan-600 dark:text-cyan-400" />{label("Agent breakdown")}<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">{loading ? "—" : agents.length}</span></h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label("Assignments, activity and engagement in one place")}</p>
            </div>
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input aria-label={label("Search agents")} placeholder={label("Search by name, email or phone...")} value={search}
                onChange={event => { setSearch(event.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 py-2.5 pl-10 pr-3 text-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 sm:w-80" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-gray-100 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400">
                <tr>
                  {[["Agent", UserRound], ["Contact", ContactRound], ["Status", Activity]].map(([title, Icon]) => <th key={String(title)} scope="col" className="whitespace-nowrap px-5 py-4 text-xs font-semibold"><span className="flex items-center gap-2"><Icon size={15} className="text-slate-400" aria-hidden="true" />{label(String(title))}</span></th>)}
                  {columns.map(([key, title, Icon, color]) => <th key={key} scope="col" className={`whitespace-nowrap px-4 py-4 text-xs font-semibold ${key === "totalLeads" ? "bg-cyan-50/70 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300" : ""}`}><span className="flex items-center justify-center gap-2"><Icon size={15} className={color} aria-hidden="true" />{label(title)}</span></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? <tr><td colSpan={11} className="p-14 text-center text-gray-500"><LoaderCircle size={28} className="mx-auto mb-3 animate-spin text-cyan-600" />{label("Loading agents...")}</td></tr>
                  : visible.length === 0 ? <tr><td colSpan={11} className="p-14 text-center text-gray-500"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700"><SearchX size={26} /></div>{label(search ? "No agents match your search." : "No agents found. Agents appear when added to a campaign or assigned leads.")}</td></tr>
                  : visible.map(agent => <tr key={agent.id}
                    onClick={event => {
                      if (!(event.target as HTMLElement).closest("a")) router.push(`/users/${agent.id}`);
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-700/30">
                    <td className="whitespace-nowrap px-5 py-4"><Link href={`/users/${agent.id}`} aria-label={`${label("View agent")} ${agent.firstName} ${agent.lastName ?? ""}`} className="flex items-center gap-3 rounded-lg transition hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 dark:hover:text-cyan-300"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColors[agent.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length]}`}>{agent.firstName.charAt(0)}{agent.lastName?.charAt(0)}</div><div className="font-semibold">{agent.firstName} {agent.lastName}</div></Link></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-2 text-xs"><Mail size={13} className="shrink-0 text-gray-400" />{agent.email || "—"}</div><div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Phone size={13} className="shrink-0 text-gray-400" />{agent.phone || "—"}</div></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${agent.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-gray-100 text-gray-600 ring-gray-500/15 dark:bg-gray-700 dark:text-gray-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />{agent.status}</span></td>
                    {columns.map(([key, , , color]) => <td key={key} className={`px-4 py-4 text-center tabular-nums ${key === "totalLeads" ? "bg-cyan-50/30 dark:bg-cyan-950/10" : ""}`}><span className={key === "totalLeads" ? "inline-flex min-w-10 justify-center rounded-lg bg-cyan-100/70 px-2 py-1 font-bold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" : agent[key] > 0 ? `font-semibold ${color}` : "text-gray-300 dark:text-gray-600"}>{agent[key].toLocaleString()}</span></td>)}
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 p-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{filtered.length} {label("agents")} · {label("Page")} {currentPage} / {pages}</span>
            <div className="flex gap-2">
              <button disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft size={15} />{label("Previous")}</button>
              <button disabled={loading || currentPage === pages} onClick={() => setPage(currentPage + 1)} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">{label("Next")}<ChevronRight size={15} /></button>
            </div>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400"><Info size={15} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />{label("Each lead is counted once per assigned agent. Shared leads count for each assignee; engagement columns show current outcomes, not call history.")}</p>
      </>}
    </div>
  );
}
