"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import LeadService from "@/src/services/lead.service";
import { UserFormService } from "@/src/services/userForm.service";
import { AuthService } from "@/src/services/auth.service";
import { UserForm } from "@/src/types/userForm/userForm.types";
import { User } from "@/src/types/auth/auth.types";
import { BulkLeadPayload, LeadPayload } from "@/src/types/leads/leads.types";
import {
  EMPLOYEE_SENIORITY,
  INDUSTRIES,
  LANGUAGE_CODE,
  PRIORITY,
  SALES_STATUS,
} from "@/src/constants/enum";
import axios from "axios";
import React, { JSX, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { FaUpload, FaFileCsv, FaTrash, FaCheck } from "react-icons/fa";
import { HiDownload } from "react-icons/hi";
import { FiUpload } from "react-icons/fi";
import { Tag, AlertCircle, X } from "lucide-react";
import { CiSearch } from "react-icons/ci";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import FieldMappingModal, {
  AppFieldDef,
  GenericFieldMapping,
} from "@/src/components/pages/enquiry/FieldMappingModal";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ParsedLead {
  [key: string]: string | number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

// ─── Helper: convert UserForm fields → AppFieldDef[] ─────────────────────────

/**
 * Converts the dynamic `userFormData.selectedFormFields` from the API
 * into the generic `AppFieldDef[]` format that FieldMappingModal understands.
 *
 * Each field uses its `key` as both the field key and the primary alias,
 * so an exact-match CSV header will be auto-detected.
 */
const buildLeadAppFields = (userForm: UserForm | null): AppFieldDef[] => {
  if (!userForm?.selectedFormFields) return [];
  return userForm.selectedFormFields.map((field) => ({
    key: field.key,
    label: field.name || field.key,
    // email and fullName are always required; rest follow their form definition
    required: field.required ?? (field.key === "email" || field.key === "fullName"),
    // The field key itself and common lowercase variants are tried for auto-detection
    aliases: [
      field.key.toLowerCase(),
      field.name?.toLowerCase() ?? "",
      // handy aliases for common fields
      ...(field.key === "fullName" ? ["name", "full name", "fullname", "client name"] : []),
      ...(field.key === "email" ? ["email address", "mail", "e-mail"] : []),
      ...(field.key === "phone" ? ["mobile", "phone number", "mobile number", "contact no"] : []),
      ...(field.key === "companyName" ? ["company", "company name", "organization", "firm"] : []),
      ...(field.key === "projectType" ? ["project", "project type", "service type"] : []),
      ...(field.key === "priority" ? ["urgency", "importance"] : []),
      ...(field.key === "source" ? ["lead source", "channel"] : []),
    ].filter(Boolean),
  }));
};

// ─── Page ────────────────────────────────────────────────────────────────────

const BulkLeadUpload = (): JSX.Element => {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Form / field config ──
  const [userFormData, setUserFormData] = useState<UserForm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── File & raw rows ──
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState<number>(0);

  // ── Mapping modal ──
  const [showMappingModal, setShowMappingModal] = useState(false);

  // ── Processed / validated data ──
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // ── Batch assign-to ──
  const [batchAssignTo, setBatchAssignTo] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [openAgentDropdown, setOpenAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // ── UI ──
  const [dataTag, setDataTag] = useState<string>("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // ── Derived ──
  const totalPages = Math.ceil(parsedData.length / ITEMS_PER_PAGE);
  const invalidCount = new Set(validationErrors.map((e) => e.row)).size;

  /** AppFieldDef[] derived from fetched form config */
  const leadAppFields = useMemo(() => buildLeadAppFields(userFormData), [userFormData]);

  // ── Fetch form fields ──
  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) setUserFormData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        toast.error(Array.isArray(m) ? m[0] : m);
      } else toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { getFormFields(); }, []);

  // ── Close agent dropdown on outside click ──
  useEffect(() => {
    const handleOutClick = (e: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setOpenAgentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutClick);
    return () => document.removeEventListener("mousedown", handleOutClick);
  }, []);

  // ── Fetch agents with debounced search ──
  const fetchAgents = async (search?: string) => {
    try {
      const res = await AuthService.getAllTeamUsers({ search });
      if (res.status === 200) setUsersData(res.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchAgents(agentSearch), 300);
    return () => clearTimeout(timer);
  }, [agentSearch]);

  const filteredAgents = usersData.filter((user) => {
    const q = agentSearch.trim().toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(q) ||
      user.lastName?.toLowerCase().includes(q) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(q)
    );
  });

  // ── Sample CSV download ──
  const downloadCSVTemplate = () => {
    if (!userFormData?.selectedFormFields) { toast.error("Form fields not loaded"); return; }
    const headers = userFormData.selectedFormFields.map((f) => f.key);
    const exampleRow = userFormData.selectedFormFields.map((field) => {
      switch (field.type) {
        case "email": return "example@email.com";
        case "text": return field.key === "phone" ? "+919876543210" : `example_${field.key}`;
        case "number": return "12345";
        case "select": return field.options?.[0]?.value || "";
        default: return "";
      }
    }).join(",");
    const blob = new Blob([headers.join(",") + "\n" + exampleRow], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lead_template.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  // ── Validation (unchanged) ──
  const validateLeadData = (data: ParsedLead[], startIndex = 0): ValidationError[] => {
    const errors: ValidationError[] = [];
    const optionalFields = new Set(["phone", "priority", "projectType", "country"]);

    data.forEach((lead, index) => {
      const rowNumber = startIndex + index + 2;

      const emailValue = String(lead["email"] ?? "").trim();
      if (emailValue === "") {
        errors.push({ row: rowNumber, field: "email", message: "Email is required" });
      } else if (!EMAIL_REGEX.test(emailValue)) {
        errors.push({ row: rowNumber, field: "email", message: "Invalid email format" });
      }

      const phoneValue = String(lead["phone"] ?? "").trim();
      if (phoneValue !== "") {
        if (!PHONE_REGEX.test(phoneValue))
          errors.push({ row: rowNumber, field: "phone", message: "Phone must contain only numbers (optionally starting with +)" });
      }

      if (!userFormData?.selectedFormFields) return;

      userFormData.selectedFormFields.forEach((field) => {
        const value = lead[field.key];
        const isOptional = optionalFields.has(field.key);

        if (field.required && !isOptional && (!value || value === ""))
          errors.push({ row: rowNumber, field: field.key, message: `${field.name} is required` });

        if (value && value !== "") {
          switch (field.type) {
            case "email":
              if (field.key !== "email" && !EMAIL_REGEX.test(String(value).trim()))
                errors.push({ row: rowNumber, field: field.key, message: "Invalid email format" });
              break;
            case "number":
              if (isNaN(Number(value)))
                errors.push({ row: rowNumber, field: field.key, message: "Must be a number" });
              break;
            case "select":
              if (field.options && !isOptional && field.key !== "source") {
                const valid = field.options.map((o) => o.value);
                if (!valid.includes(String(value)))
                  errors.push({ row: rowNumber, field: field.key, message: `Must be one of: ${valid.join(", ")}` });
              }
              break;
            case "text":
              if (field.key === "fullName" && String(value).trim().length < 1)
                errors.push({ row: rowNumber, field: field.key, message: "Full name is required" });
              break;
          }
        }
      });
    });

    return errors;
  };

  // ── Raw file parsers (no schema transform; just get headers + raw rows) ──
  const parseRawCSV = (f: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> =>
    new Promise((resolve, reject) => {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve({
          headers: r.meta.fields || [],
          rows: r.data as Record<string, string>[],
        }),
        error: (e) => reject(e),
      });
    });

  const parseRawXLSX = async (f: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
    return { headers: rows.length > 0 ? Object.keys(rows[0]) : [], rows };
  };

  // ── Handle file pick → open mapping modal ──
  const handleFile = async (f: File) => {
    const isCSV = f.name.endsWith(".csv") || f.type === "text/csv";
    const isXLSX = f.name.endsWith(".xlsx") || f.name.endsWith(".xls") ||
      f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      f.type === "application/vnd.ms-excel";

    if (!isCSV && !isXLSX) { toast.error("Only CSV or XLSX files are allowed"); return; }

    try {
      const { headers, rows } = isXLSX
        ? await parseRawXLSX(f)
        : await parseRawCSV(f);

      if (!rows.length) { toast.error("File is empty"); return; }

      setFile(f);
      setCsvHeaders(headers);
      setRawRows(rows);
      setParsedData([]); // clear old preview
      setCurrentPage(1);
      setShowMappingModal(true);
    } catch {
      toast.error("Could not parse file. Check file format.");
    }
  };

  // ── Apply mapping → produce ParsedLead[] ──
  const applyMappingToRows = (
    rows: Record<string, string>[],
    mapping: GenericFieldMapping
  ): ParsedLead[] => {
    return rows.map((rawRow) => {
      const lead: ParsedLead = {};
      for (const [appKey, csvCol] of Object.entries(mapping)) {
        if (csvCol) lead[appKey] = rawRow[csvCol] ?? "";
      }
      return lead;
    });
  };

  // ── Mapping confirmed ──
  const handleMappingConfirm = (mapping: GenericFieldMapping) => {
    setShowMappingModal(false);
    const data = applyMappingToRows(rawRows, mapping);
    setParsedData(data);
    setCurrentPage(1);
    const errors = validateLeadData(data);
    setValidationErrors(errors);
    if (errors.length > 0)
      toast.warning(`Found ${errors.length} validation error${errors.length > 1 ? "s" : ""}`);
    else
      toast.success(`Parsed ${data.length} lead${data.length > 1 ? "s" : ""} successfully`);
  };

  // ── Mapping cancelled ──
  const handleMappingCancel = () => {
    setShowMappingModal(false);
    if (parsedData.length === 0) {
      setFile(null);
      setCsvHeaders([]);
      setRawRows([]);
    }
  };

  // ── Re-open mapping for current file ──
  const reopenMapping = () => {
    if (csvHeaders.length > 0) setShowMappingModal(true);
  };

  // ── Drag & drop handlers ──
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX <= r.left || e.clientX >= r.right || e.clientY <= r.top || e.clientY >= r.bottom)
      setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFormData]);

  // ── Reset ──
  const resetUpload = () => {
    setFile(null); setParsedData([]); setValidationErrors([]);
    setCurrentPage(1); setDataTag(""); setCsvHeaders([]); setRawRows([]);
    setFileInputKey((k) => k + 1);
  };

  const deleteRow = (globalIdx: number) => {
    const updated = parsedData.filter((_, i) => i !== globalIdx);
    setParsedData(updated);
    const errors = validateLeadData(updated);
    setValidationErrors(errors);
    const newTotal = Math.ceil(updated.length / ITEMS_PER_PAGE);
    if (currentPage > newTotal && newTotal > 0) setCurrentPage(newTotal);
    if (updated.length === 0) resetUpload();
  };

  const deleteInvalidRows = () => {
    const bad = new Set(validationErrors.map((e) => e.row));
    const updated = parsedData.filter((_, i) => !bad.has(i + 2));
    setParsedData(updated);
    setValidationErrors(validateLeadData(updated));
    const newTotal = Math.ceil(updated.length / ITEMS_PER_PAGE);
    setCurrentPage(Math.min(currentPage, newTotal || 1));
    if (updated.length === 0) resetUpload();
  };

  const getErrorsForRow = (gi: number) => validationErrors.filter((e) => e.row === gi + 2);

  // ── Submit ──
  const handleBulkUpload = async () => {
    if (!parsedData.length) { toast.error("No data to upload"); return; }
    if (validationErrors.length > 0) { toast.error("Fix validation errors before uploading"); return; }
    setIsUploading(true);
    try {
      const coreFields = new Set([
        "fullName", "email", "phone", "priority", "source", "projectType",
        "status", "companyName", "city", "country", "postalCode", "language",
        "industry", "employeeRole", "employeeSeniority", "message", "membershipNotes",
      ]);
      const leadsPayload: LeadPayload[] = parsedData.map((row) => {
        const lead: LeadPayload = { fullName: String(row.fullName || ""), email: String(row.email || "") };
        const extraFields: Record<string, string | number | boolean | null> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (value === undefined || value === "") return;
          if (coreFields.has(key)) {
            switch (key) {
              case "phone": lead.phone = String(value); break;
              case "priority": lead.priority = value as PRIORITY; break;
              case "source": lead.source = String(value); break;
              case "projectType": lead.projectType = String(value); break;
              case "status": lead.status = value as SALES_STATUS; break;
              case "companyName": case "city": case "employeeRole":
              case "message": case "membershipNotes": (lead as any)[key] = String(value); break;
              case "postalCode": lead.postalCode = Number(value); break;
              case "country": lead.country = String(value); break;
              case "language": lead.language = value as LANGUAGE_CODE; break;
              case "industry": lead.industry = value as INDUSTRIES; break;
              case "employeeSeniority": lead.employeeSeniority = value as EMPLOYEE_SENIORITY; break;
            }
          } else {
            const v = String(value).trim();
            if (!v) return;
            if (!isNaN(Number(v))) extraFields[key] = Number(v);
            else if (v.toLowerCase() === "true" || v.toLowerCase() === "false")
              extraFields[key] = v.toLowerCase() === "true";
            else extraFields[key] = v;
          }
        });
        if (Object.keys(extraFields).length > 0) lead.extraFields = extraFields;
        return lead;
      });
      // Inject batch-level assignTo if set
      if (batchAssignTo) {
        leadsPayload.forEach((lead) => { (lead as any).assignTo = batchAssignTo; });
      }

      const payload: BulkLeadPayload = {
        leads: leadsPayload,
        ...(dataTag.trim() ? { dataTag: dataTag.trim() } : {}),
      };
      const result = await LeadService.bulkCreate(payload);
      if (result.status === 201) {
        toast.success(result.data.message);
        resetUpload();
        router.push("/leads");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        toast.error(Array.isArray(m) ? m[0] : m);
      } else toast.error("Something went wrong");
    } finally { setIsUploading(false); }
  };

  const paginatedData = parsedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const assignBatchNode = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm">
          👤
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Assign Batch To <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            All leads in this import will be assigned to the selected agent
          </p>
        </div>
      </div>
      <div ref={agentDropdownRef} className="relative w-full sm:w-72">
        <button
          type="button"
          onClick={() => setOpenAgentDropdown(!openAgentDropdown)}
          className="w-full px-3 py-2.5 capitalize rounded-lg border transition-all duration-200
            bg-white dark:bg-gray-800 text-black dark:text-white
            border-gray-200 dark:border-gray-700
            focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
            flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-2">
            {selectedAgent ? (
              <>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {selectedAgent.firstName?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-800 dark:text-white">
                  {selectedAgent.firstName} {selectedAgent.lastName}
                </span>
              </>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">Unassigned — select an agent</span>
            )}
          </div>
          <MdOutlineKeyboardArrowDown className="text-gray-400 dark:text-gray-500 text-xl flex-shrink-0" />
        </button>

        {openAgentDropdown && (
          <div className="absolute bottom-full mb-1 left-0 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[200]">
            <div className="p-2 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                <CiSearch className="text-slate-400 text-lg flex-shrink-0" />
                <input
                  placeholder="Search agent..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="outline-none bg-transparent text-sm text-slate-600 dark:text-white/80 w-full"
                />
              </div>
            </div>
            <div
              className="px-4 py-2.5 cursor-pointer text-sm text-slate-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => { setBatchAssignTo(null); setSelectedAgent(null); setOpenAgentDropdown(false); }}
            >
              — Unassigned
            </div>
            {filteredAgents.length ? (
              filteredAgents.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-2.5 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => { setBatchAssignTo(user.id); setSelectedAgent(user); setOpenAgentDropdown(false); }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {user.firstName?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-white/80 capitalize">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  {selectedAgent?.id === user.id && <FaCheck className="text-emerald-500 text-xs" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400">{t("no_users_found")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* ── Field Mapping Modal (reused generically) ── */}
      <FieldMappingModal
        isOpen={showMappingModal}
        csvHeaders={csvHeaders}
        previewRows={rawRows.slice(0, 3)}
        fileName={file?.name ?? ""}
        appFields={leadAppFields}
        assignBatchNode={assignBatchNode}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700  px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
              🚀
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{t("bulk_leads")}</h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                {t("upload_a_csv_or_xlsx_to")}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
            <p>{t("download_the_sample_sheet_fill_it")}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("supported_formats")}{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{t("csv")}</code>{" · "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{t("xlsx")}</code>{" · "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{t("xls")}</code>
            </p>
          </div>
          <button
            onClick={downloadCSVTemplate}
            disabled={isLoading || !userFormData}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap ml-6 flex-shrink-0"
          >
            <HiDownload className="text-base" /> {t("download_sample")}
          </button>
        </div>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed transition-all duration-200 p-12
          ${isDragging
            ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 scale-[1.01]"
            : "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700"}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragging ? "bg-cyan-100 dark:bg-cyan-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
            <FaFileCsv className={`text-3xl transition-colors
              ${isDragging ? "text-cyan-500" : "text-gray-400 dark:text-gray-500"}`} />
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              {isDragging ? "Drop your file here" : "Drag & drop your CSV or XLSX file"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t("or_click_the_button_below_to_browse")}
            </p>
          </div>

          <input
            key={fileInputKey}
            type="file" accept=".csv,.xlsx,.xls"
            className="hidden" id="leadFileUpload"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <label
            htmlFor="leadFileUpload"
            className="cursor-pointer flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <FaUpload /> {t("choose_file")}
          </label>

          {file && (
            <div className="flex items-center gap-3 mt-1 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 px-4 py-2.5 rounded-xl">
              <FaFileCsv className="text-cyan-500 text-lg" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
              {parsedData.length > 0 && (
                <span className="text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                  {parsedData.length} {t("rows")}
                </span>
              )}
              {/* Re-map button */}
              {csvHeaders.length > 0 && parsedData.length > 0 && (
                <button
                  type="button"
                  onClick={reopenMapping}
                  className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-700 px-2.5 py-1 rounded-lg transition-all"
                >
                  ✎ Re-map
                </button>
              )}
              <button
                onClick={resetUpload}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all ml-1"
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Data Tag (shown only after mapping confirmed) ── */}
      {parsedData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
              <Tag size={17} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="shrink-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t("data_tag")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("optional_group_this_batch_for_easy")}
              </p>
            </div>
            <div className="flex-1 ml-2 relative">
              <input
                type="text"
                value={dataTag}
                onChange={(e) => setDataTag(e.target.value)}
                placeholder={t("e_g_q2_campaign_mumbai_expo")}
                maxLength={60}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
              />
              {dataTag && (
                <button
                  type="button"
                  onClick={() => setDataTag("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Errors ── */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1.5">
                {validationErrors.length} {t("validation_error")}{validationErrors.length > 1 ? "s" : ""}
              </h3>
              <div className="max-h-36 overflow-y-auto space-y-0.5">
                {validationErrors.slice(0, 10).map((error, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">
                    {t("row")} {error.row},{" "}
                    <span className="font-semibold">{error.field}</span>: {error.message}
                  </p>
                ))}
                {validationErrors.length > 10 && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                    {t("and")} {validationErrors.length - 10} {t("more_errors")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Table ── */}
      {parsedData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t("preview_2")}</h3>

              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                {parsedData.length} {t("records")}
              </span>

              {invalidCount > 0 ? (
                <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full font-medium">
                  ⚠ {invalidCount} {t("invalid")}
                </span>
              ) : (
                <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full font-medium">
                  {t("all_rows_valid")}
                </span>
              )}

              {dataTag.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-800">
                  <Tag size={10} /> {dataTag.trim()}
                </span>
              )}
            </div>
            {invalidCount > 0 && (
              <button
                type="button"
                onClick={deleteInvalidRows}
                className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg transition-all"
              >
                <FaTrash className="text-xs" />
                {t("delete")} {invalidCount} {t("invalid_row")}{invalidCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800/60">
                    #
                  </th>
                  {Object.keys(parsedData[0] || {}).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedData.map((lead, pageIdx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + pageIdx;
                  const rowErrs = getErrorsForRow(globalIdx);
                  const isInvalid = rowErrs.length > 0;
                  const fieldHasError = (f: string) => rowErrs.some((e) => e.field === f);
                  return (
                    <tr
                      key={globalIdx}
                      onMouseEnter={() => setHoveredRow(globalIdx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-colors relative
                        ${isInvalid
                          ? "bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"}`}
                    >
                      <td className="px-4 py-3 relative">
                        <div className="flex items-center gap-1.5">
                          {isInvalid && (
                            <div className="relative group">
                              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center cursor-help flex-shrink-0">
                                !
                              </span>
                              <div className="absolute z-50 left-6 top-full mt-2 w-72
                                bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-xl shadow-2xl p-3
                                space-y-1.5 pointer-events-none opacity-0 group-hover:opacity-100
                                transition-opacity border border-red-800">
                                <p className="font-bold text-red-400 mb-1.5">
                                  ⚠ {rowErrs.length} {t("error")}{rowErrs.length > 1 ? "s" : ""}
                                </p>
                                {rowErrs.map((e, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    <span>
                                      <span className="font-semibold text-red-300">{e.field}:</span>{" "}
                                      <span className="text-gray-300">{e.message}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <span className={`text-xs ${isInvalid ? "text-red-400" : "text-gray-400"}`}>
                            {globalIdx + 1}
                          </span>
                        </div>
                      </td>

                      {Object.entries(lead).map(([header, value]) => {
                        const hasErr = fieldHasError(header);
                        const errMsg = rowErrs.find((e) => e.field === header)?.message;

                        return (
                          <td
                            key={header}
                            title={errMsg}
                            className={`px-4 py-3 whitespace-nowrap text-sm max-w-[180px] truncate
                              ${hasErr
                                ? "text-red-600 dark:text-red-400 font-medium underline decoration-dotted"
                                : "text-gray-700 dark:text-gray-200"}`}
                          >
                            {value !== undefined && String(value).trim() !== ""
                              ? (
                                <span className={hasErr ? "inline-flex items-center gap-1" : ""}>
                                  {String(value)}
                                  {hasErr && (
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex-shrink-0" title={errMsg}>
                                      ✕
                                    </span>
                                  )}
                                </span>
                              )
                              : hasErr
                                ? <span className="italic text-red-400 text-xs">{t("missing")}</span>
                                : <span className="text-gray-300 dark:text-gray-600">—</span>
                            }
                          </td>
                        );
                      })}

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteRow(globalIdx)}
                          title={t("delete_row")}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                            ${isInvalid
                              ? "bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/60"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"}`}
                        >
                          <FaTrash className="text-[10px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("showing")}{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {Math.min(currentPage * ITEMS_PER_PAGE, parsedData.length)}
              </span>{" "}
              {t("of")}{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">{parsedData.length}</span>
            </span>

            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (currentPage <= 3) p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else p = currentPage - 2 + i;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${currentPage === p
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit ── */}
      {parsedData.length > 0 && (
        <div className="flex justify-end items-center gap-3">
          {invalidCount > 0 && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {invalidCount} {t("invalid_row_2")}{invalidCount > 1 ? "s" : ""} {t("must_be_fixed_or_removed_before_submitting")}
            </p>
          )}
          <button
            onClick={handleBulkUpload}
            disabled={isUploading || invalidCount > 0}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiUpload />
            {isUploading
              ? "Uploading..."
              : `Create ${parsedData.length} Lead${parsedData.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkLeadUpload;