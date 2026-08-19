"use client";
import { useEffect, useMemo, useState } from "react";
import { Lead, LeadActivity, LeadStage, DealType } from "@/src/types/referral/referral.type";
import {
  Plus, Upload, Search, X, Loader2, AlertTriangle, CheckCircle2,
  TrendingUp, Users, IndianRupee, Clock, Trash2, Database,
  ArrowUpDown, FileSpreadsheet, MessageSquare, Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

// ============================================================
// Constants
// ============================================================
const STAGES: LeadStage[] = [
  "new" , "contacted" , "qualified" ,"demo" ,"proposal","won" , "lost"
];

const DEAL_TYPES: DealType[] = [
  "new_subscription", "renewal", "additional_license", "upsell", "ai_addon",
];

const stageColor: Record<LeadStage, string> = {
  new: "bg-slate-100 text-slate-700 ring-slate-200",
  contacted: "bg-blue-100 text-blue-700 ring-blue-200",
  qualified: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  demo: "bg-purple-100 text-purple-700 ring-purple-200",
  proposal: "bg-amber-100 text-amber-700 ring-amber-200",
  won: "bg-green-100 text-green-700 ring-green-200",
  lost: "bg-red-100 text-red-700 ring-red-200",
};

const stageOrder: LeadStage[] = ["new" , "contacted" , "qualified" ,"demo" ,"proposal","won" , "lost"];

const LOSS_REASONS = [
  "Budget constraints", "Chose competitor", "Timeline mismatch",
  "No response / went cold", "Feature gap", "Internal HR tool build decided",
];

const STORAGE_KEY = "hrjee_referral_demo_leads";

// ============================================================
// Demo Data Generator (for presentation purposes)
// ============================================================
function generateId(prefix = "LD") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNowISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const DEMO_COMPANIES = [
  "Nimbus Retail Pvt Ltd", "Zenith Manufacturing Co.", "Kavya Logistics",
  "BluePeak Analytics", "Ganges Fintech Solutions", "Orbit Consulting Group",
  "Prakash Textiles Ltd", "Meridian Health Systems", "Vertex Software Labs",
  "Copper Leaf Hospitality", "Suryansh Infra Projects", "Lotus BPO Services",
  "Highline Media Group", "Anantara Realty",
];

function buildDemoLeads(): Lead[] {
  const now = Date.now();
  const templates: Partial<Lead>[] = [
    { stage: "new", dealType: "new_subscription", dealValue: 240000, slaBreached: false, createdDaysAgo: 0 },
    { stage: "new", dealType: "new_subscription", dealValue: 180000, slaBreached: true, createdDaysAgo: 3 },
    { stage: "contacted", dealType: "new_subscription", dealValue: 320000, slaBreached: false, createdDaysAgo: 2 },
    { stage: "qualified", dealType: "ai_addon", dealValue: 95000, slaBreached: false, createdDaysAgo: 6 },
    { stage: "qualified", dealType: "new_subscription", dealValue: 410000, slaBreached: false, createdDaysAgo: 9 },
    { stage: "demo", dealType: "upsell", dealValue: 150000, slaBreached: false, createdDaysAgo: 11 },
    { stage: "demo", dealType: "new_subscription", dealValue: 275000, slaBreached: false, createdDaysAgo: 14 },
    { stage: "proposal", dealType: "additional_license", dealValue: 60000, slaBreached: false, createdDaysAgo: 18 },
    { stage: "proposal", dealType: "new_subscription", dealValue: 500000, slaBreached: false, createdDaysAgo: 21 },
    { stage: "won", dealType: "new_subscription", dealValue: 360000, slaBreached: false, createdDaysAgo: 30 },
    { stage: "won", dealType: "renewal", dealValue: 220000, slaBreached: false, createdDaysAgo: 45 },
    { stage: "won", dealType: "ai_addon", dealValue: 80000, slaBreached: false, createdDaysAgo: 12 },
    { stage: "lost", dealType: "new_subscription", dealValue: 190000, slaBreached: false, createdDaysAgo: 25 },
    { stage: "lost", dealType: "new_subscription", dealValue: 300000, slaBreached: false, createdDaysAgo: 40 },
  ];

  return templates.map((t, i) => {
    const created = daysAgoISO((t as any).createdDaysAgo ?? 5);
    const isOpen = !["Won", "Lost"].includes(t.stage as LeadStage);
    return {
      id: generateId(),
      partnerId: "PTR-001",
      submittedBy: "USR-PARTNER-ADMIN",
      company: DEMO_COMPANIES[i % DEMO_COMPANIES.length],
      contactName: ["Rahul Mehta", "Priya Nair", "Arjun Singh", "Sneha Kulkarni", "Vikram Rao"][i % 5],
      contactEmail: "contact@example.com",
      contactPhone: "+91 98" + (10000000 + i).toString().slice(0, 8),
      companySize: ["11-50", "51-200", "201-500", "500+"][i % 4],
      requirement: "Looking for a comprehensive HRMS with payroll and attendance modules.",
      dealValue: t.dealValue as number,
      dealType: t.dealType as DealType,
      stage: t.stage as LeadStage,
      assignedTo: "Sales Rep " + ((i % 3) + 1),
      slaDueAt: isOpen ? daysFromNowISO(2) : undefined,
      slaBreached: t.slaBreached as boolean,
      source: "Partner Referral",
      isDuplicate: false,
      lossReason: t.stage === "lost" ? LOSS_REASONS[i % LOSS_REASONS.length] : undefined,
      createdAt: created,
      updatedAt: created,
    } as Lead;
  });
}

function generateActivities(lead: Lead): LeadActivity[] {
  const activities: LeadActivity[] = [];
  const stagesReached = stageOrder.slice(0, stageOrder.indexOf(
    lead.stage === "lost" ? "proposal" : lead.stage
  ) + 1);

  stagesReached.forEach((stage, idx) => {
    activities.push({
      id: generateId("ACT"),
      leadId: lead.id,
      actor: idx === 0 ? "You (Partner)" : lead.assignedTo || "HRJee Sales Rep",
      action: idx === 0 ? "Lead submitted" : `Stage moved to ${stage}`,
      note: idx === 0 ? "Submitted via Partner Portal" : undefined,
      visibility: "partner",
      timestamp: daysAgoISO(30 - idx * 4),
    });
  });

  if (lead.stage === "lost") {
    activities.push({
      id: generateId("ACT"),
      leadId: lead.id,
      actor: lead.assignedTo || "HRJee Sales Rep",
      action: "Marked as Lost",
      note: lead.lossReason,
      visibility: "partner",
      timestamp: lead.updatedAt,
    });
  }
  return activities;
}

// ============================================================
// Toast System (lightweight, self-contained)
// ============================================================
type Toast = { id: string; message: string; type: "success" | "error" | "info" };

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (message: string, type: Toast["type"] = "success") => {
    const id = generateId("TOAST");
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg animate-in slide-in-from-bottom-2 ${
            t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-slate-800"
          }`}
        >
          {t.type === "success" && <CheckCircle2 size={16} />}
          {t.type === "error" && <AlertTriangle size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function PartnerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [filterStage, setFilterStage] = useState<LeadStage | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sortKey, setSortKey] = useState<"createdAt" | "dealValue">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { toasts, push } = useToasts();

  const router = useRouter()
  const {t}= useTranslation()

  // ---- Load from localStorage on mount ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLeads(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // ---- Persist to localStorage whenever leads change ----
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      /* ignore */
    }
  }, [leads]);

  // ---- Derived: filtered + searched + sorted ----
  const filtered = useMemo(() => {
    let result = leads.filter(
      (l) => filterStage === "all" || l.stage === filterStage
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "dealValue") return (a.dealValue - b.dealValue) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return result;
  }, [leads, filterStage, searchQuery, sortKey, sortDir]);

  // ---- Stats ----
  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.stage === "won").length;
    const pipelineValue = leads
      .filter((l) => !["Won", "Lost"].includes(l.stage))
      .reduce((s, l) => s + l.dealValue, 0);
    const wonValue = leads.filter((l) => l.stage === "won").reduce((s, l) => s + l.dealValue, 0);
    const closedCount = leads.filter((l) => ["Won", "Lost"].includes(l.stage)).length;
    const conversionRate = closedCount ? (won / closedCount) * 100 : 0;
    const slaBreaches = leads.filter((l) => l.slaBreached).length;
    return { total, won, pipelineValue, wonValue, conversionRate, slaBreaches };
  }, [leads]);

  // ---- Handlers ----
  const handleAddLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    setShowForm(false);
    push(`Lead "${newLead.company}" submitted successfully`, "success");
  };

  const handleBulkAdd = (count: number) => {
    const generated = buildDemoLeads()
      .slice(0, count)
      .map((l) => ({ ...l, id: generateId(), createdAt: new Date().toISOString() }));
    setLeads((prev) => [...generated, ...prev]);
    setShowBulkUpload(false);
    push(`${count} leads imported from CSV`, "success");
  };

  const loadDemoData = () => {
    setLeads(buildDemoLeads());
    push("Demo dataset loaded (14 sample leads)", "success");
  };

  const clearAll = () => {
    setLeads([]);
    setSelectedLead(null);
    push("All leads cleared", "info");
  };

  const toggleSort = (key: "createdAt" | "dealValue") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-text-2">
            Submit and track leads through the sales pipeline
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadDemoData}
            className="flex items-center gap-2 rounded-lg bg-white/70 border border-dashed border-brand-400 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
            title="Load sample data for demo/presentation"
          >
            <Sparkles size={16} /> Load Demo Data
          </button>
          {leads.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} /> Clear All
            </button>
          )}
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2 rounded-lg border bg-white/70 border-slate-300 px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <Upload size={16} /> Bulk Upload (CSV)
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm text-white hover:bg-brand-700 shadow-sm"
          >
            <Plus size={16} /> Submit Lead
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Users size={16} />} label="Total Leads" value={stats.total.toString()} />
        <StatCard
          icon={<IndianRupee size={16} />}
          label="Open Pipeline Value"
          value={`₹${stats.pipelineValue.toLocaleString()}`}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Conversion Rate"
          value={`${stats.conversionRate.toFixed(0)}%`}
          tone="green"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          label="Won Value"
          value={`₹${stats.wonValue.toLocaleString()}`}
          tone="green"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="SLA Breaches"
          value={stats.slaBreaches.toString()}
          tone={stats.slaBreaches > 0 ? "red" : undefined}
        />
      </div>

      {/* Search + Stage Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or contact..."
            className="w-full rounded-lg bg-white/70 border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <FilterPill
            active={filterStage === "all"}
            label={`All (${leads.length})`}
            onClick={() => setFilterStage("all")}
          />
          {STAGES.map((s) => {
            const count = leads.filter((l) => l.stage === s).length;
            return (
              <FilterPill
                key={s}
                active={filterStage === s}
                label={`${s} (${count})`}
                onClick={() => setFilterStage(s)}
              />
            );
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto rounded-xl border bg-white/70 border-slate-300">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-left text-text-2">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Deal Type</th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("dealValue")} className="flex items-center gap-1">
                  Deal Value <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1">
                  Submitted <ArrowUpDown size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-text-2">
                  <div className="flex flex-col items-center gap-2">
                    <Database size={28} className="text-text-3" />
                    <p>No leads found.</p>
                    <p className="text-xs">
                      Try{" "}
                      <button onClick={loadDemoData} className="text-brand-600 underline">
                        loading demo data
                      </button>{" "}
                      or submit your first lead.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="cursor-pointer border-t border-slate-300 transition-colors hover:bg-surface-hover"
              >
                <td className="px-4 py-3 font-medium">{lead.company}</td>
                <td className="px-4 py-3 text-text-2">{lead.contactName}</td>
                <td className="px-4 py-3">{`${t(lead.dealType)}`}</td>
                <td className="px-4 py-3 font-medium">₹{lead.dealValue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${stageColor[lead.stage]}`}>
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lead.slaBreached ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle size={12} /> Breached
                    </span>
                  ) : ["Won", "Lost"].includes(lead.stage) ? (
                    <span className="text-xs text-text-2">—</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={12} /> On track
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">
                  {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LeadSubmissionForm
          existingLeads={leads}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddLead}
        />
      )}
      {showBulkUpload && (
        <BulkUploadModal onClose={() => setShowBulkUpload(false)} onImport={handleBulkAdd} />
      )}
      {selectedLead && (
        <LeadDetailDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================
function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-xl border bg-white/70 border-slate-300 bg-surface p-3 sm:p-4">
      <div className={`mb-1 flex items-center gap-1.5 text-xs text-text-2`}>
        {icon} {label}
      </div>
      <p
        className={`text-lg font-semibold sm:text-xl ${
          tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-text-1"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
        active ? "bg-cyan-500 text-white" : "border border-slate-300 bg-white/70 text-text-2 hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// 5.2 — Lead Submission Form (fully controlled + validated)
// ============================================================
function LeadSubmissionForm({
  onClose, onSubmit, existingLeads,
}: { onClose: () => void; onSubmit: (l: Lead) => void; existingLeads: Lead[] }) {
  const [form, setForm] = useState({
    company: "", contactName: "", contactEmail: "", contactPhone: "",
    companySize: "1-10", dealType: DEAL_TYPES[0] as DealType,
    dealValue: "", requirement: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const possibleDuplicate = useMemo(() => {
    if (!form.company.trim()) return false;
    return existingLeads.some(
      (l) => l.company.trim().toLowerCase() === form.company.trim().toLowerCase()
    );
  }, [form.company, existingLeads]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.company.trim()) errs.company = "Company name is required";
    if (!form.contactName.trim()) errs.contactName = "Contact name is required";
    if (!form.contactEmail.trim() || !form.contactEmail.includes("@"))
      errs.contactEmail = "Valid email is required";
    if (!form.dealValue || Number(form.dealValue) <= 0)
      errs.dealValue = "Expected deal value must be greater than 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!isDraft && !validate()) return;

    setSubmitting(true);
    setTimeout(() => {
      const newLead: Lead = {
        id: generateId(),
        partnerId: "PTR-001",
        submittedBy: "USR-PARTNER-ADMIN",
        company: form.company.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        companySize: form.companySize,
        requirement: form.requirement.trim(),
        dealValue: Number(form.dealValue) || 0,
        dealType: form.dealType,
        stage: "new",
        slaDueAt: daysFromNowISO(2),
        slaBreached: false,
        source: "Partner Referral",
        isDuplicate: possibleDuplicate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSubmit(newLead);
      setSubmitting(false);
    }, 600); // simulate network latency
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submit New Lead</h2>
          <button onClick={onClose} className="text-text-2 hover:text-text-1">
            <X size={18} />
          </button>
        </div>

        {possibleDuplicate && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={14} />
            A lead for this company already exists. It will be flagged for duplicate review.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField
            label="Company Name" required error={errors.company}
            value={form.company} onChange={(v) => update("company", v)}
            placeholder="e.g. Nimbus Retail Pvt Ltd"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Contact Name" required error={errors.contactName}
              value={form.contactName} onChange={(v) => update("contactName", v)}
              placeholder="e.g. Priya Nair"
            />
            <FormField
              label="Contact Phone"
              value={form.contactPhone} onChange={(v) => update("contactPhone", v)}
              placeholder="+91 98XXXXXXXX"
            />
          </div>
          <FormField
            label="Contact Email" required error={errors.contactEmail}
            value={form.contactEmail} onChange={(v) => update("contactEmail", v)}
            placeholder="name@company.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-2">Company Size</label>
              <select
                value={form.companySize}
                onChange={(e) => update("companySize", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => (
                  <option key={s} value={s}>{s} employees</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-2">Deal Type</label>
              <select
                value={form.dealType}
                onChange={(e) => update("dealType", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {DEAL_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <FormField
            label="Expected Deal Value (₹)" required error={errors.dealValue} type="number"
            value={form.dealValue} onChange={(v) => update("dealValue", v)}
            placeholder="e.g. 240000"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-text-2">Requirement / Notes</label>
            <textarea
              value={form.requirement}
              onChange={(e) => update("requirement", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Brief description of what the prospect needs..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white  hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Submitting..." : "Submit Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, required, error, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; error?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// 5.2 — Bulk CSV Upload (simulated for demo)
// ============================================================
function BulkUploadModal({
  onClose, onImport,
}: { onClose: () => void; onImport: (count: number) => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleImport = () => {
    setProcessing(true);
    setTimeout(() => {
      onImport(5); // simulate 5 leads parsed from CSV
      setProcessing(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl bg-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bulk Upload Leads</h2>
          <button onClick={onClose} className="text-text-2 hover:text-text-1">
            <X size={18} />
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400">
          <FileSpreadsheet size={28} className="text-text-2" />
          <span className="text-sm text-text-2">
            {fileName ? fileName : "Click to select a CSV file"}
          </span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>

        <p className="mt-3 text-xs text-text-2">
          Expected columns: company, contact name, contact email, deal value, deal type
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!fileName || processing}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {processing && <Loader2 size={14} className="animate-spin" />}
            {processing ? "Processing..." : "Import Leads"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 5.4 — Lead Detail Drawer with Activity Timeline + Comments
// ============================================================
function LeadDetailDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; text: string; time: string }[]>([]);
  const activities = useMemo(() => generateActivities(lead), [lead]);

  const handlePostComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [...c, { id: generateId("CMT"), text: comment.trim(), time: new Date().toISOString() }]);
    setComment("");
  };

  const progressPct = lead.stage === "lost"
    ? 100
    : ((stageOrder.indexOf(lead.stage) + 1) / stageOrder.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl bg-white">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{lead.company}</h2>
            <p className="text-xs text-text-2">{lead.contactName} · {lead.contactEmail}</p>
          </div>
          <button onClick={onClose} className="text-text-2 hover:text-text-1">
            <X size={18} />
          </button>
        </div>

        {/* Stage progress bar */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className={`rounded-full px-2 py-1 ring-1 ring-inset ${stageColor[lead.stage]}`}>
              {lead.stage}
            </span>
            {lead.slaBreached && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle size={12} /> SLA Breached
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className={`h-full rounded-full transition-all ${
                lead.stage === "lost" ? "bg-red-500" : "bg-brand-600"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-hover p-3 text-sm">
          <div>
            <p className="text-xs text-text-2">Deal Value</p>
            <p className="font-medium">₹{lead.dealValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-2">Deal Type</p>
            <p className="font-medium">{lead.dealType}</p>
          </div>
          <div>
            <p className="text-xs text-text-2">Company Size</p>
            <p className="font-medium">{lead.companySize || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-text-2">Assigned Rep</p>
            <p className="font-medium">{lead.assignedTo || "Unassigned"}</p>
          </div>
        </div>

        {lead.requirement && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-text-2">Requirement</p>
            <p className="text-sm">{lead.requirement}</p>
          </div>
        )}

        {lead.lossReason && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <p className="text-xs font-semibold">Reason for Loss</p>
            <p>{lead.lossReason}</p>
          </div>
        )}

        {/* Activity Timeline — 5.4 */}
        <h3 className="mt-6 mb-3 text-sm font-semibold">Activity Timeline</h3>
        <div className="space-y-4 border-l border-slate-300 pl-4">
          {activities.map((a) => (
            <div key={a.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-surface" />
              <p className="text-sm font-medium">{a.action}</p>
              {a.note && <p className="text-xs text-text-2">{a.note}</p>}
              <p className="text-xs text-text-3">
                {a.actor} · {new Date(a.timestamp).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>

        {/* 5.9 — Threaded comments between partner and sales rep */}
        <h3 className="mt-6 mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquare size={14} /> Comments
        </h3>
          <div className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
            placeholder="Ask the sales rep a question..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={handlePostComment}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
          >
            Send
          </button>
        </div>
        <div className="space-y-2">
          {comments.length === 0 && (
            <p className="text-xs text-text-2">No comments yet. Start the conversation.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-surface-hover p-2.5 text-sm">
              <p>{c.text}</p>
              <p className="mt-1 text-xs text-text-3">
                {new Date(c.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      
      </div>
    </div>
  );
}