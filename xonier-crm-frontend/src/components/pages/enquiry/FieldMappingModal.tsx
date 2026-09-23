"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FiCheck, FiX, FiZap, FiAlertTriangle } from "react-icons/fi";
import { MdOutlineSwapHoriz } from "react-icons/md";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppFieldKey =
  | "fullName"
  | "email"
  | "phone"
  | "companyName"
  | "designation"
  | "projectType"
  | "priority"
  | "source"
  | "industry"
  | "technologies"
  | "keywords"
  | "numberOfEmployees"
  | "infoType"
  | "country"
  | "state"
  | "city"
  | "zipcode"
  | "message";

export type FieldMapping = Record<AppFieldKey, string | null>;

export interface FieldMappingModalProps {
  isOpen: boolean;
  csvHeaders: string[];
  previewRows: Record<string, string>[]; // first few rows for sample preview
  fileName: string;
  onConfirm: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

// ─── App field definitions ────────────────────────────────────────────────────

interface AppFieldDef {
  key: AppFieldKey;
  label: string;
  required: boolean;
  aliases: string[]; // lowercase exact-match aliases for auto-detection
  hint?: string;
}

const APP_FIELDS: AppFieldDef[] = [
  { key: "fullName",          label: "Full Name",           required: true,  aliases: ["fullname", "full name", "name", "client name", "contact name", "naam"] },
  { key: "email",             label: "Email",               required: true,  aliases: ["email", "email address", "mail", "e-mail"] },
  { key: "phone",             label: "Phone",               required: true,  aliases: ["phone", "mobile", "phone number", "mobile number", "contact", "mob", "number", "contact no"] },
  { key: "companyName",       label: "Company Name",        required: false, aliases: ["company", "company name", "organization", "org", "firm"] },
  { key: "designation",       label: "Designation",         required: false, aliases: ["designation", "role", "position", "job title", "title"] },
  { key: "projectType",       label: "Project Type",        required: true,  aliases: ["projecttype", "project type", "project", "type", "service type", "service"] },
  { key: "priority",          label: "Priority",            required: true,  aliases: ["priority", "urgency", "importance"] },
  { key: "source",            label: "Source",              required: true,  aliases: ["source", "lead source", "channel", "from", "referred by"] },
  { key: "industry",          label: "Industry",            required: true,  aliases: ["industry", "sector", "domain", "vertical"], hint: "Use | as separator for multiple values" },
  { key: "technologies",      label: "Technologies",        required: false, aliases: ["technologies", "tech", "tech stack", "stack"], hint: "Use | as separator" },
  { key: "keywords",          label: "Keywords",            required: false, aliases: ["keywords", "tags", "key terms"], hint: "Use | as separator" },
  { key: "numberOfEmployees", label: "No. of Employees",    required: false, aliases: ["numberofemployees", "employees", "employee count", "team size", "headcount"] },
  { key: "infoType",          label: "Info Type",           required: false, aliases: ["infotype", "info type", "type of info", "category"] },
  { key: "country",           label: "Country",             required: false, aliases: ["country", "nation"] },
  { key: "state",             label: "State / Province",    required: false, aliases: ["state", "province", "region"] },
  { key: "city",              label: "City",                required: false, aliases: ["city", "town", "location"] },
  { key: "zipcode",           label: "Zipcode / Pin",       required: false, aliases: ["zipcode", "zip", "pin", "pincode", "postal code", "zip code"] },
  { key: "message",           label: "Message / Note",      required: false, aliases: ["message", "note", "notes", "comment", "remarks", "description"] },
];

// ─── Fuzzy auto-detect ────────────────────────────────────────────────────────

const SKIP_VALUE = "__skip__";

/**
 * Attempt to auto-map CSV headers to app fields via alias matching.
 * Each CSV header can only be matched once (one-to-one).
 */
export function autoDetectMapping(csvHeaders: string[]): FieldMapping {
  const mapping = {} as FieldMapping;
  const usedCsvHeaders = new Set<string>();

  for (const field of APP_FIELDS) {
    let matched: string | null = null;
    for (const alias of field.aliases) {
      const found = csvHeaders.find(
        (h) => h.toLowerCase().trim() === alias && !usedCsvHeaders.has(h)
      );
      if (found) {
        matched = found;
        usedCsvHeaders.add(found);
        break;
      }
    }
    mapping[field.key] = matched;
  }

  return mapping;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FieldMappingModal: React.FC<FieldMappingModalProps> = ({
  isOpen,
  csvHeaders,
  previewRows,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [mapping, setMapping] = useState<FieldMapping>(() => autoDetectMapping(csvHeaders));
  const [autoDetected, setAutoDetected] = useState<Set<AppFieldKey>>(new Set());

  // Re-run auto-detect every time a new file is uploaded
  useEffect(() => {
    const detected = autoDetectMapping(csvHeaders);
    setMapping(detected);
    const autoKeys = new Set<AppFieldKey>();
    for (const field of APP_FIELDS) {
      if (detected[field.key] !== null) autoKeys.add(field.key);
    }
    setAutoDetected(autoKeys);
  }, [csvHeaders]);

  // Track already-used headers so we can disable them in other dropdowns (one-to-one)
  const usedHeaders = useMemo(() => {
    const used = new Set<string>();
    for (const val of Object.values(mapping)) {
      if (val && val !== SKIP_VALUE) used.add(val);
    }
    return used;
  }, [mapping]);

  const handleChange = (fieldKey: AppFieldKey, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: value === SKIP_VALUE ? null : value || null,
    }));
    // Remove auto badge once user manually touches this row
    setAutoDetected((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
  };

  const unmetRequired = APP_FIELDS.filter((f) => f.required && !mapping[f.key]);
  const canConfirm = unmetRequired.length === 0;
  const autoDetectedCount = autoDetected.size;
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center px-4 py-16 bg-black/40 dark:bg-black/60"
      onClick={onCancel}
    >

      {/* Modal Card — light bg white, dark bg gray-900 (matches rest of app) */}
      <div
        className="relative w-full max-w-4xl max-h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MdOutlineSwapHoriz className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Map Your CSV Fields</h2>
              <p className="text-xs text-cyan-100 mt-0.5">
                <span className="font-medium text-white/90">{fileName}</span>
                {" · "}Match your file columns to app fields before importing
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80 hover:text-white transition-all"
          >
            <FiX />
          </button>
        </div>

        {/* ── Auto-detect Banner ── */}
        {autoDetectedCount > 0 && (
          <div className="flex items-center gap-2.5 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
            <FiZap className="text-emerald-500 dark:text-emerald-400 text-sm flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">{autoDetectedCount} field{autoDetectedCount > 1 ? "s" : ""}</span>
              {" "}auto-detected from your CSV headers.{" "}
              <span className="text-emerald-500 dark:text-emerald-400">Review and adjust if needed.</span>
            </p>
          </div>
        )}

        {/* ── Column Labels ── */}
        <div className="grid grid-cols-2 gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            App Field (Required ★)
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            → Your CSV Column
          </span>
        </div>

        {/* ── Scrollable Mapping List ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {APP_FIELDS.map((field) => {
            const currentVal = mapping[field.key];
            const isMapped = !!currentVal;
            const isAutoDetected = autoDetected.has(field.key);
            const isRequiredUnmet = field.required && !isMapped;

            return (
              <div
                key={field.key}
                className={`grid grid-cols-2 gap-3 items-center rounded-xl px-4 py-2.5 transition-all border
                  ${isRequiredUnmet
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700/40"
                    : isMapped
                      ? "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600"
                      : "bg-white dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/30 hover:border-gray-200 dark:hover:border-gray-600/50"
                  }`}
              >
                {/* Left: App field label */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors
                      ${isMapped
                        ? "bg-emerald-500"
                        : isRequiredUnmet
                          ? "bg-amber-400 animate-pulse"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">★</span>
                      )}
                      {isAutoDetected && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700/60 px-1.5 py-0.5 rounded-full">
                          <FiZap className="text-[8px]" /> Auto
                        </span>
                      )}
                    </div>
                    {field.hint && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">{field.hint}</p>
                    )}
                  </div>
                </div>

                {/* Right: Dropdown + inline preview */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={currentVal ?? SKIP_VALUE}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={`w-full appearance-none text-sm rounded-lg px-3 py-2 pr-7 border outline-none transition-all cursor-pointer
                        bg-white dark:bg-gray-800
                        focus:ring-2 focus:ring-cyan-400/30 dark:focus:ring-cyan-500/20
                        ${isMapped
                          ? "border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:border-cyan-400 dark:focus:border-cyan-500"
                          : isRequiredUnmet
                            ? "border-amber-300 dark:border-amber-600/50 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 focus:border-amber-400"
                            : "border-gray-200 dark:border-gray-600/60 text-gray-400 dark:text-gray-500 focus:border-cyan-400 dark:focus:border-cyan-500"
                        }`}
                    >
                      <option value={SKIP_VALUE}>
                        {field.required ? "⚠ Select a column..." : "— Skip (leave empty) —"}
                      </option>
                      {csvHeaders.map((h) => {
                        const isUsedElsewhere = usedHeaders.has(h) && h !== currentVal;
                        return (
                          <option key={h} value={h} disabled={isUsedElsewhere}>
                            {isUsedElsewhere ? `✗ ${h} (already mapped)` : h}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[10px]">
                      ▾
                    </div>
                  </div>

                  {/* Sample value from first data row */}
                  {currentVal && previewRows[0]?.[currentVal] !== undefined && (
                    <span
                      className="hidden sm:block text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600/60 px-2 py-1 rounded-lg truncate max-w-[80px] flex-shrink-0"
                      title={String(previewRows[0][currentVal])}
                    >
                      {String(previewRows[0][currentVal])}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{mappedCount}</span>
              <span className="text-gray-400 dark:text-gray-500"> / {APP_FIELDS.length} mapped</span>
            </span>
            {!canConfirm && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <FiAlertTriangle className="text-xs flex-shrink-0" />
                <span>
                  Required:{" "}
                  <span className="font-semibold">
                    {unmetRequired.map((f) => f.label).join(", ")}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              disabled={!canConfirm}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all
                ${canConfirm
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-sm shadow-cyan-500/20"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }`}
            >
              <FiCheck className="text-base" />
              Confirm Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldMappingModal;
