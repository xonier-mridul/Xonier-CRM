"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdCheck, MdClose, MdKeyboardArrowDown, MdSearch } from "react-icons/md";
import LeadService from "@/src/services/lead.service";
import dealService from "@/src/services/deal.service";

export interface CrmEntityRecordPickerProps {
  entityType: "lead" | "deal";
  value: string;
  displayName?: string;
  onChange: (entityId: string, entityName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CrmEntityRecordPicker({
  entityType,
  value,
  displayName = "",
  onChange,
  placeholder,
  disabled = false,
  className = "",
}: CrmEntityRecordPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSearch("");
    setOpen(false);
  }, [entityType]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const searchFilter = search.trim() ? { search: search.trim() } : undefined;
        if (entityType === "lead") {
          const res = await LeadService.getAll(1, 100, searchFilter);
          const list = res?.data?.data?.data || [];
          if (!cancelled) {
            setRecords(
              list.map((lead: any) => ({
                value: lead.id,
                label: `${lead.fullName || lead.email || "Lead"}${lead.lead_id ? ` (${lead.lead_id})` : ""}`,
              }))
            );
          }
        } else {
          const res = await dealService.getAll(1, 100, searchFilter);
          const list = res?.data?.data?.data || [];
          if (!cancelled) {
            setRecords(
              list.map((deal: any) => ({
                value: deal.id,
                label: `${deal.dealName || "Deal"}${deal.deal_id ? ` (${deal.deal_id})` : ""}`,
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [entityType, search]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
    );
  }, [records, search]);

  const selectedLabel = useMemo(() => {
    if (displayName) return displayName;
    if (!value) return "";
    const match = records.find((r) => r.value === value);
    return match ? match.label : `#${value.slice(-6)}`;
  }, [displayName, records, value]);

  const defaultPlaceholder =
    placeholder ||
    (loading
      ? "Loading records..."
      : entityType === "lead"
      ? "Select or search a lead..."
      : "Select or search a deal...");

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          className ||
          "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        <span
          className={`truncate ${
            value ? "text-gray-900 dark:text-white font-medium" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {selectedLabel || defaultPlaceholder}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("", "");
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
              title="Clear selection"
            >
              <MdClose className="w-4 h-4" />
            </span>
          )}
          <MdKeyboardArrowDown
            className={`w-5 h-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
            <MdSearch className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                entityType === "lead" ? "Search lead by name or ID..." : "Search deal by name or ID..."
              }
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <MdClose className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/40">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No matching {entityType === "lead" ? "leads" : "deals"} found
              </div>
            ) : (
              filteredRecords.map((item) => {
                const isSelected = value === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value, item.label);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <MdCheck className="w-4 h-4 text-cyan-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
