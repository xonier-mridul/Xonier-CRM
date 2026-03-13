"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiRefreshCw } from "react-icons/fi";
import { FaRegEye } from "react-icons/fa";
import { MdFilterAlt, MdFilterAltOff } from "react-icons/md";
import { Message } from "@/src/types/communication/message.types";
import MessageService from "@/src/services/communication/message.servicie";

type StatusType = Message["status"] | "";

interface Filters {
  fromNumber: string;
  toNumber: string;
  status: StatusType;
  conversionId: string;
  dateFrom: string;
  dateTo: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Page() {
  const [logs, setLogs] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    fromNumber: "",
    toNumber: "",
    status: "",
    conversionId: "",
    dateFrom: "",
    dateTo: "",
  });

  // Debounced values — 300ms delay
  const debouncedSearch = useDebounce(search, 300);
  const debouncedFilters = useDebounce(filters, 300);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const res = await MessageService.getAll();
      if (res?.data) {
        setLogs(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = debouncedSearch.toLowerCase();

    // Global search: matches to/from number
    const matchesSearch =
      !q ||
      log.sent_to_number?.toLowerCase().includes(q) ||
      log.sent_from_number?.toLowerCase().includes(q);

    // Individual filters
    const matchesFrom =
      !debouncedFilters.fromNumber ||
      log.sent_from_number
        ?.toLowerCase()
        .includes(debouncedFilters.fromNumber.toLowerCase());

    const matchesTo =
      !debouncedFilters.toNumber ||
      log.sent_to_number
        ?.toLowerCase()
        .includes(debouncedFilters.toNumber.toLowerCase());

    const matchesStatus =
      !debouncedFilters.status || log.status === debouncedFilters.status;

    const matchesConversionId =
      !debouncedFilters.conversionId ||
      String(log.conversion_id ?? "")
        .toLowerCase()
        .includes(debouncedFilters.conversionId.toLowerCase());

    const logDate = log.sent_at ? new Date(log.sent_at) : null;
    const matchesDateFrom =
      !debouncedFilters.dateFrom ||
      (logDate !== null && logDate >= new Date(debouncedFilters.dateFrom));
    const matchesDateTo =
      !debouncedFilters.dateTo ||
      (logDate !== null &&
        logDate <= new Date(debouncedFilters.dateTo + "T23:59:59"));

    return (
      matchesSearch &&
      matchesFrom &&
      matchesTo &&
      matchesStatus &&
      matchesConversionId &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  const hasActiveFilters =
    filters.fromNumber ||
    filters.toNumber ||
    filters.status ||
    filters.conversionId ||
    filters.dateFrom ||
    filters.dateTo;

  const clearFilters = () => {
    setFilters({ fromNumber: "", toNumber: "", status: "", conversionId: "", dateFrom: "", dateTo: "" });
    setSearch("");
  };

  const getStatusStyle = (status: Message["status"]) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-600";
      case "delivered":
        return "bg-green-100 text-green-600";
      case "queued":
        return "bg-yellow-100 text-yellow-600";
      case "failed":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="ml-72 mt-14 p-6">
      {/* HEADER */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900">
            Message Logs
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Monitor inbound and outbound SMS activity
          </p>
        </div>

        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold dark:text-white">Message Logs</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              SMS delivery status and history
              {filteredLogs.length !== logs.length && (
                <span className="ml-2 text-blue-500 font-medium">
                  ({filteredLogs.length} of {logs.length} results)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Global search */}
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl text-gray-400" />
              <input
                type="text"
                placeholder="Search to / from number"
                className="outline-none bg-transparent w-52 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 dark:bg-gray-600 border-slate-900/10 text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-500"
              }`}
            >
              <MdFilterAlt className="text-lg" />
              Filters
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {
                    [
                      filters.fromNumber,
                      filters.toNumber,
                      filters.status,
                      filters.conversionId,
                      filters.dateFrom,
                      filters.dateTo,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            {/* Clear filters */}
            {(hasActiveFilters || search) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <MdFilterAltOff className="text-lg" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-900/10">
            {/* From Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                From Number
              </label>
              <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="+1234567890"
                  className="outline-none bg-transparent text-sm w-full"
                  value={filters.fromNumber}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, fromNumber: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* To Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                To Number
              </label>
              <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="+1234567890"
                  className="outline-none bg-transparent text-sm w-full"
                  value={filters.toNumber}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, toNumber: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Status
              </label>
              <select
                className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 text-sm outline-none w-full"
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    status: e.target.value as StatusType,
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Conversion ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Conversion ID
              </label>
              <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. CNV-001"
                  className="outline-none bg-transparent text-sm w-full"
                  value={filters.conversionId}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      conversionId: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Date Range — spans full row */}
            <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Date Range
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 flex-1 min-w-[160px]">
                  <span className="text-xs text-gray-400 shrink-0">From</span>
                  <input
                    type="date"
                    className="outline-none bg-transparent text-sm w-full dark:text-white dark:color-scheme-dark"
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, dateFrom: e.target.value }))
                    }
                  />
                </div>
                <span className="text-gray-400 text-sm shrink-0">→</span>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 flex-1 min-w-[160px]">
                  <span className="text-xs text-gray-400 shrink-0">To</span>
                  <input
                    type="date"
                    className="outline-none bg-transparent text-sm w-full dark:text-white"
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, dateTo: e.target.value }))
                    }
                  />
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    onClick={() =>
                      setFilters((p) => ({ ...p, dateFrom: "", dateTo: "" }))
                    }
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 underline"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  To
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  From
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Direction
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Channel
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Status
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Conversion ID
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Sent by
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Sent At
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center p-6 text-gray-500">
                    Loading messages...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log, i) => {
                  const even = i % 2 === 0;
                  return (
                    <tr
                      key={log.id}
                      className={`${
                        even
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        {log.sent_to_number}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {log.sent_from_number}
                      </td>
                      <td className="p-4 whitespace-nowrap capitalize">
                        {log.direction}
                      </td>
                      <td className="p-4 whitespace-nowrap uppercase">
                        {log.channel}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {log.conversion_id ? (
                          <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded font-mono text-xs">
                            {log.conversion_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {log.sent_by?.ref || "-"}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {log.sent_at || "-"}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <a
                          href={`/message/${log.id}`}
                          className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 text-green-600"
                        >
                          <FaRegEye className="text-xl" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center p-6 text-gray-500">
                    {hasActiveFilters || search
                      ? "No messages match the current filters."
                      : "No SMS logs found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}