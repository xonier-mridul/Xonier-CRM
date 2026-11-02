"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { X, Search, UploadCloud, Check, ChevronDown, AlertCircle, Megaphone, CheckCircle2, Users, SlidersHorizontal, FileSpreadsheet } from "lucide-react";
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
    setOpen(false);
    setSearch("");
  };

  const removeChip = (id: string) => onChange(selected.filter((s) => s !== id));
  const getUser = (id: string) => users.find((u) => (u.id || u._id) === id);

  return (
    <div className="flex min-w-0 flex-col gap-2" ref={ref}>
      <label id={`${idPrefix}-label`} className="text-xs font-semibold text-slate-700 dark:text-gray-200">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const u = getUser(id);
            if (!u) return null;
            return (
              <span key={`chip-${idPrefix}-${id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#18A1C4]/20 bg-[#18A1C4]/8 px-2.5 py-1 text-xs font-medium text-[#1389a8] dark:bg-[#18A1C4]/15 dark:text-cyan-300">
                {u.firstName} {u.lastName}
                <button type="button" aria-label={`Remove ${u.firstName} ${u.lastName} from ${label}`} onClick={() => removeChip(id)} className="rounded-full p-0.5 transition-colors hover:bg-white/70 hover:text-red-500 dark:hover:bg-gray-700">
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <button type="button" aria-labelledby={`${idPrefix}-label`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition-colors hover:border-[#18A1C4] focus:outline-none focus:ring-2 focus:ring-[#18A1C4]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <span className={selected.length ? "font-medium text-slate-700 dark:text-gray-200" : "text-slate-400"}>
          {selected.length === 0 ? `Select ${label.toLowerCase()}…` : `${selected.length} selected`}
        </span>
        <ChevronDown className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`} size={16} />
      </button>
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
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
        : f.key === "email"
          ? ["email", "email id", "email address", "e-mail"]
          : f.key === "fullName"
            ? ["fullName", "full name", "name", "lead name"]
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
      });

      if (leads.length === 0) {
        toast.error("The file has no rows to import");
        setIsImporting(false);
        return;
      }

      const res = await CampaignService.importLeads(createdCampaignId, { leads });
      if (res.status === 201) {
        const { inserted = 0, skipped = 0, skippedRecords = [], distributed } = res.data?.data || {};
        let msg = `Imported ${inserted} lead${inserted !== 1 ? "s" : ""}`;
        if (skipped) msg += ` (${skipped} skipped)`;
        if (distributed) msg += `. Auto-assigned ${distributed} lead${distributed !== 1 ? "s" : ""} to agents`;
        if (inserted) toast.success(msg);
        else toast.warning(msg);
        if (skippedRecords.length) {
          const reasons = [...new Set(skippedRecords.map((row: { reason: string }) => row.reason))];
          toast.warning(`Skipped because: ${reasons.slice(0, 2).join("; ")}`, { autoClose: 12000 });
        }
        if (inserted > 0) onSuccess();
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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[3px] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 dark:border-gray-700 dark:bg-gray-900 sm:px-7 sm:py-6">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#18A1C4]/20 bg-[#18A1C4]/10 text-[#1389a8] dark:bg-[#18A1C4]/15">
              <Megaphone size={21} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#1389a8]">Sales workspace</p>
              <h3 id="create-campaign-title" className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Create campaign</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 sm:text-sm">Set up your team, distribution, and lead import.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close create campaign" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 px-4 py-5 dark:bg-gray-950/30 sm:px-7 sm:py-6">
          {/* Campaign Name */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">01</span>
              <div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Campaign details</h4><p className="text-xs text-slate-500 dark:text-gray-400">Give this outreach a clear name.</p></div>
            </div>
            <label htmlFor="campaign-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-gray-200">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              id="campaign-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-[#18A1C4] focus:ring-2 focus:ring-[#18A1C4]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              placeholder="e.g. Q4 outreach"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18A1C4]/10 text-[#1389a8]"><Users size={16} /></span>
              <div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Campaign team</h4><p className="text-xs text-slate-500 dark:text-gray-400">Choose who manages and works on these leads.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">

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
            </div>
          </section>

          {/* Distribution Mode */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><SlidersHorizontal size={16} /></span>
              <div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Lead distribution</h4><p className="text-xs text-slate-500 dark:text-gray-400">Decide how leads reach your agents.</p></div>
            </div>
            <label htmlFor="campaign-distribution" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-gray-200">Distribution mode</label>
            <select
              id="campaign-distribution"
              value={distributionMode}
              onChange={(e) => setDistributionMode(e.target.value as CampaignDistributionMode)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#18A1C4] focus:ring-2 focus:ring-[#18A1C4]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' height='1em' width='1em' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value={CampaignDistributionMode.ON_DEMAND}>On Demand</option>
              <option value={CampaignDistributionMode.EQUAL}>Equal Distribution</option>
            </select>
          </section>

          {/* Bulk Leads Upload */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><FileSpreadsheet size={16} /></span>
              <div className="min-w-0 flex-1"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Import leads</h4><p className="text-xs text-slate-500 dark:text-gray-400">Add a CSV or spreadsheet now, or later.</p></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-gray-800 dark:text-gray-400">Optional</span>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors ${
                csvFile
                  ? "border-[#18A1C4]/50 bg-[#18A1C4]/5 dark:bg-[#18A1C4]/10"
                  : "border-slate-300 bg-slate-50/60 hover:border-[#18A1C4] hover:bg-[#18A1C4]/5 dark:border-gray-700 dark:bg-gray-800/30"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${csvFile ? "bg-[#18A1C4]/15 text-[#18A1C4]" : "bg-white text-slate-500 dark:bg-gray-800"}`}>
                <UploadCloud size={18} />
              </div>
              {csvFile ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#18A1C4]">
                    <CheckCircle2 size={16} />
                    <span className="truncate max-w-[250px]">{csvFile.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Click to replace file</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-2 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">Choose a file to import</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">CSV or XLSX · Up to 10 MB</p>
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
          </section>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-7">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#18A1C4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#158ca8] focus:outline-none focus:ring-4 focus:ring-[#18A1C4]/20 disabled:opacity-50">
              {isSubmitting ? "Creating..." : csvFile ? "Create & Map Columns →" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
