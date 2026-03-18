"use client";
import React, { useState, useMemo } from "react";
import { DESIGNATION } from "@/src/constants/enum";
import { FiX, FiSearch, FiCopy, FiCheck } from "react-icons/fi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DesignationModal = ({ isOpen, onClose }: Props): React.JSX.Element | null => {
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const designations = useMemo(() => {
    const entries = Object.entries(DESIGNATION) as [string, string][];
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      ([key, value]) =>
        key.toLowerCase().includes(q) || value.toLowerCase().includes(q)
    );
  }, [search]);

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(value);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm "
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg flex flex-col max-h-[60vh] min-h-[60vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="bg-linear-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base">
              🏷️
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Designation List</h2>
              <p className="text-xs text-violet-200 mt-0.5">
                {Object.keys(DESIGNATION).length} designations available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              autoFocus
              type="text"
              placeholder="Search designations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>
          {search && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-1">
              {designations.length} result{designations.length !== 1 ? "s" : ""} for &quot;{search}&quot;
            </p>
          )}
        </div>

        {/* ── List ── */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {designations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No designations found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            designations.map(([enumKey, enumValue]) => {
              const isCopied = copiedKey === enumValue;
              return (
                <div
                  key={enumKey}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Enum key badge */}
                    <span className="shrink-0 text-[10px] font-bold text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 px-2 py-0.5 rounded-md font-mono uppercase tracking-wide">
                      {enumKey}
                    </span>
                    {/* Enum value */}
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                      {enumValue}
                    </span>
                  </div>

                  {/* Copy button */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(enumValue)}
                    title={`Copy "${enumValue}"`}
                    className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all
                      ${isCopied
                        ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 dark:hover:border-violet-700 opacity-0 group-hover:opacity-100"
                      }`}
                  >
                    {isCopied ? (
                      <>
                        <FiCheck className="text-xs" />
                        Copied
                      </>
                    ) : (
                      <>
                        <FiCopy className="text-xs" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Click <span className="font-semibold">Copy</span> to copy the value for use in CSV
          </p>
          <button
            onClick={onClose}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignationModal;