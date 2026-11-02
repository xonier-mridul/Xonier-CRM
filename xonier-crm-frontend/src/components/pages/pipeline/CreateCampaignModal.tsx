"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { X, Search, UploadCloud, Check, ChevronDown, AlertCircle, Megaphone, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AuthService } from "@/src/services/auth.service";
import CampaignService from "@/src/services/campaign.service";
import { CampaignDistributionMode } from "@/src/types/campaign/campaign.types";
import { User } from "@/src/types";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/* ── CRM Lead fields that the backend accepts ── */
export const LEAD_FIELDS: { key: string; label: string; required?: boolean }[] = [
  // ── Core (matches "Client Info" column in Leads table) ──
  { key: "fullName",          label: "Full Name",           required: true },
  { key: "email",             label: "Email",               required: true },
  { key: "phone",             label: "Phone" },
  // ── Leads table columns ──
  { key: "projectType",       label: "Project Type" },
  { key: "source",            label: "Source" },
  { key: "status",            label: "Status" },
  { key: "dataTag",           label: "Data Tag" },
  // ── Additional importable fields ──
  { key: "priority",          label: "Priority" },
  { key: "companyName",       label: "Company Name" },
  { key: "city",              label: "City" },
  { key: "country",           label: "Country" },
  { key: "postalCode",        label: "Postal Code" },
  { key: "language",          label: "Language" },
  { key: "industry",          label: "Industry" },
  { key: "employeeRole",      label: "Employee Role" },
  { key: "employeeSeniority", label: "Employee Seniority" },
  { key: "message",           label: "Message" },
  { key: "membershipNotes",   label: "Membership Notes" },
];

/* ── tiny reusable multi-select with search + chips ── */
interface UserMultiSelectProps {
  label: string;
  users: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
  idPrefix: string;
}

const UserMultiSelect: React.FC<UserMultiSelectProps> = ({
  label, users, selected, onChange, idPrefix,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = users.filter((u) => {
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const toggle = (id: string) => {
    if (!id) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeChip = (id: string) => onChange(selected.filter((s) => s !== id));
  const getUser = (id: string) => users.find((u) => (u.id || u._id) === id);

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {selected.map((id) => {
            const u = getUser(id);
            if (!u) return null;
            return (
              <span key={`chip-${idPrefix}-${id}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#18A1C4]/10 dark:bg-[#18A1C4]/20 text-[#18A1C4] dark:text-[#18A1C4] text-xs font-bold rounded-full border border-[#18A1C4]/20">
                {u.firstName} {u.lastName}
                <button type="button" onClick={() => removeChip(id)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full p-0.5 transition-colors">
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 hover:border-[#18A1C4] focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/10 focus:border-[#18A1C4] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm">
        <span className="text-gray-400">
          {selected.length === 0 ? `Select ${label.toLowerCase()}…` : `${selected.length} selected`}
        </span>
        <ChevronDown className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`} size={16} />
      </button>
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus-within:border-[#18A1C4] focus-within:ring-2 focus-within:ring-[#18A1C4]/10 transition-all shadow-sm">
                <Search className="text-gray-400" size={14} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="flex-1 text-xs font-medium bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400" />
              </div>
            </div>
            <div className="overflow-y-auto p-2 flex flex-col gap-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 font-medium">No users found</p>
              ) : (
                filtered.map((u) => {
                  const uid = u.id || u._id || "";
                  const isSelected = selected.includes(uid);
                  return (
                    <button key={`${idPrefix}-opt-${uid}`} type="button" onClick={() => toggle(uid)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isSelected ? "bg-[#18A1C4]/10 text-[#18A1C4]" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                      <span>{u.firstName} {u.lastName}</span>
                      {isSelected && <Check size={16} className="text-[#18A1C4]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── CSV Column Mapping Modal ── */
interface CsvMappingProps {
  csvHeaders: string[];
  previewRows: Record<string, string>[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
  isImporting: boolean;
}

export const CsvMappingModal: React.FC<CsvMappingProps> = ({ csvHeaders, previewRows, onConfirm, onCancel, isImporting }) => {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    // Auto-map exact or case-insensitive matches
    const auto: Record<string, string> = {};
    LEAD_FIELDS.forEach((f) => {
      const normalize = (value: string) => value.toLowerCase().replace(/[\s_\-().]/g, "");
      const aliases = f.key === "phone"
        ? ["phone", "phone number", "phone no", "mobile", "mobile number", "mobile no", "contact number", "telephone"]
        : [f.key, f.label];
      const match = csvHeaders.find(
        (h) => aliases.some((alias) => normalize(h) === normalize(alias))
      );
      if (match) auto[f.key] = match;
    });
    return auto;
  });

  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const requiredMapped = LEAD_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[3px] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="csv-mapping-title">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:max-h-[calc(100dvh-2rem)] lg:h-[min(760px,calc(100dvh-2rem))]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#1389a8]">
              <span className="h-2 w-2 rounded-full bg-[#18A1C4]" /> Lead import
            </div>
            <h3 id="csv-mapping-title" className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Map CSV columns</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 sm:text-sm">Connect your CSV headers to CRM fields, then review the sample data.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close column mapping" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-800 dark:hover:text-white"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:overflow-hidden dark:bg-gray-950/40">
          <section aria-labelledby="mapping-fields-title" className="min-w-0 px-4 py-5 sm:px-7 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 id="mapping-fields-title" className="text-sm font-semibold text-slate-900 dark:text-white">Field mapping</h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">Choose a CSV column for each CRM field.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{Object.values(mapping).filter(Boolean).length} of {LEAD_FIELDS.length} mapped</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {LEAD_FIELDS.map((f) => {
                const selectedCol = mapping[f.key] || "";
                const previewVal = selectedCol && previewRows[0] ? (previewRows[0][selectedCol] || "") : "";
                return (
                  <div key={f.key} className="grid gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 dark:border-gray-800 sm:grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-4 sm:px-4">
                    <label htmlFor={`csv-map-${f.key}`} className="text-xs font-semibold text-slate-700 dark:text-gray-200 sm:text-sm">{f.label}{f.required && <span className="ml-1 text-rose-500">*</span>}</label>
                    <div className="min-w-0">
                      <select id={`csv-map-${f.key}`} value={selectedCol} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-[#18A1C4] focus:ring-2 focus:ring-[#18A1C4]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                        <option value="">Skip this field</option>
                        {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {selectedCol && <p title={previewVal || "No sample value"} className="mt-1.5 truncate text-[11px] text-slate-500 dark:text-gray-400">Sample: {previewVal || "—"}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="csv-preview-title" className="min-w-0 border-t border-slate-200 px-4 py-5 sm:px-7 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0 dark:border-gray-700">
            <div className="mb-4">
              <h4 id="csv-preview-title" className="text-sm font-semibold text-slate-900 dark:text-white">CSV preview</h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">First {Math.min(previewRows.length, 3)} rows · {csvHeaders.length} columns · {previewRows.length} total rows</p>
            </div>
            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-max text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 dark:bg-gray-800 dark:text-gray-300"><tr>{csvHeaders.map((h) => <th key={h} scope="col" className="max-w-48 truncate whitespace-nowrap border-r border-slate-200 px-4 py-3 font-semibold last:border-r-0 dark:border-gray-700" title={h}>{h}</th>)}</tr></thead>
                <tbody>{previewRows.slice(0, 3).map((row, i) => <tr key={i} className="border-t border-slate-100 dark:border-gray-800">{csvHeaders.map((h) => <td key={h} className="max-w-48 truncate whitespace-nowrap border-r border-slate-100 px-4 py-3 text-slate-700 last:border-r-0 dark:border-gray-800 dark:text-gray-300" title={row[h] || ""}>{row[h] || "—"}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">Scroll sideways in the preview to see every CSV column.</p>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-7">
          {!requiredMapped && <p className="mr-auto flex min-w-0 items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400"><AlertCircle size={16} className="shrink-0" /> Map Full Name and Email to continue.</p>}
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
          <button type="button" disabled={!requiredMapped || isImporting} onClick={() => onConfirm(mapping)} className="rounded-lg bg-[#18A1C4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#158ca8] focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/20 disabled:cursor-not-allowed disabled:opacity-50">{isImporting ? "Importing..." : "Import Leads"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ── Main Modal ── */
const CreateCampaignModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [managers, setManagers] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<CampaignDistributionMode>(
    CampaignDistributionMode.EQUAL
  );
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV mapping state
  const [showMapping, setShowMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [createdCampaignId, setCreatedCampaignId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await AuthService.getAllActiveWithoutPagination();
        if (res.status === 200) {
          setUsers(res.data.data || []);
        }
      } catch {
        toast.error("Failed to fetch users");
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  /* Parse CSV / XLSX and show mapping modal */
  const parseFile = (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            const headers = res.meta.fields || [];
            resolve({ headers, rows: res.data as Record<string, string>[] });
          },
          error: reject,
        });
      } else {
        // xlsx / xls
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
            const headers = json.length > 0 ? Object.keys(json[0]) : [];
            resolve({ headers, rows: json });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        managers,
        agents,
        distributionMode,
      };

      const res = await CampaignService.create(payload);
      if (res.status === 201) {
        const campId = res.data?.data?.id || res.data?.data?._id || "";
        toast.success("Campaign created successfully");

        if (csvFile && campId) {
          // Parse the file and show mapping
          try {
            const { headers, rows } = await parseFile(csvFile);
            if (headers.length === 0 || rows.length === 0) {
              toast.warning("CSV file is empty — campaign created without leads");
              onSuccess();
              return;
            }
            setCreatedCampaignId(campId);
            setCsvHeaders(headers);
            setCsvRows(rows);
            setShowMapping(true);
          } catch {
            toast.error("Could not parse the file. Campaign was created — import leads manually.");
            onSuccess();
          }
        } else {
          onSuccess();
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Called when user confirms the column mapping */
  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    setIsImporting(true);
    try {
      // Build leads array from CSV rows using the mapping
      const leads = csvRows.map((row) => {
        const lead: Record<string, any> = {};
        LEAD_FIELDS.forEach((f) => {
          const col = mapping[f.key];
          if (col && row[col] != null && row[col] !== "") {
            lead[f.key] = String(row[col]).trim();
          }
        });
        return lead;
      }).filter((l) => l.email && l.fullName); // require both required fields

      if (leads.length === 0) {
        toast.error("No valid rows found (fullName and email are required)");
        setIsImporting(false);
        return;
      }

      const res = await CampaignService.importLeads(createdCampaignId, { leads });
      if (res.status === 201) {
        const { inserted, skipped, distributed } = res.data?.data || {};
        let msg = `Imported ${inserted} lead${inserted !== 1 ? "s" : ""}`;
        if (skipped) msg += ` (${skipped} skipped)`;
        if (distributed) msg += `. Auto-assigned ${distributed} lead${distributed !== 1 ? "s" : ""} to agents`;
        toast.success(msg);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lead import failed");
    } finally {
      setIsImporting(false);
    }
  };

  if (showMapping) {
    return (
      <CsvMappingModal
        csvHeaders={csvHeaders}
        previewRows={csvRows}
        onConfirm={handleMappingConfirm}
        onCancel={() => {
          setShowMapping(false);
          toast.info("Campaign created. You can import leads later.");
          onSuccess();
        }}
        isImporting={isImporting}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#18A1C4]/5 rounded-bl-full -z-10"></div>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-[#18A1C4] shrink-0">
              <Megaphone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">Create Campaign</h3>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-[240px]">Set up a new outreach campaign and assign agents to handle leads.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600 relative z-10 bg-transparent">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex flex-col gap-5">
          {/* Campaign Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#18A1C4] focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/10 transition-all shadow-sm"
              placeholder="e.g. Q4 Marketing"
            />
          </div>

          {/* Managers */}
          {isLoadingUsers ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          ) : (
            <UserMultiSelect label="Managers" users={users} selected={managers} onChange={setManagers} idPrefix="mgr" />
          )}

          {/* Agents */}
          {isLoadingUsers ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          ) : (
            <UserMultiSelect label="Agents" users={users} selected={agents} onChange={setAgents} idPrefix="agt" />
          )}

          {/* Distribution Mode */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Distribution Mode</label>
            <select
              value={distributionMode}
              onChange={(e) => setDistributionMode(e.target.value as CampaignDistributionMode)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:border-[#18A1C4] focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/10 transition-all appearance-none shadow-sm"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' height='1em' width='1em' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value={CampaignDistributionMode.ON_DEMAND}>On Demand</option>
              <option value={CampaignDistributionMode.EQUAL}>Equal Distribution</option>
            </select>
          </div>

          {/* Bulk Leads Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Bulk Leads Upload
              </label>
              <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">Optional</span>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                csvFile
                  ? "border-[#18A1C4] bg-[#18A1C4]/5 dark:bg-[#18A1C4]/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-[#18A1C4]/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${csvFile ? "bg-[#18A1C4]/20 text-[#18A1C4]" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                <UploadCloud size={22} />
              </div>
              {csvFile ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#18A1C4]">
                    <CheckCircle2 size={16} />
                    <span className="truncate max-w-[250px]">{csvFile.name}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mt-1">Click to replace file</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-3 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors border border-red-100 dark:border-red-500/20"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Click to upload file</p>
                  <p className="text-xs font-medium text-gray-400 mt-1">Supports CSV, XLSX up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCsvFile(file);
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-700 mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-[#18A1C4] shadow-sm shadow-[#18A1C4]/30 hover:bg-[#158ca8] hover:shadow-md hover:shadow-[#18A1C4]/40 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/20 disabled:opacity-50 transition-all flex items-center gap-2">
              {isSubmitting ? "Creating..." : csvFile ? "Create & Map Columns →" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
