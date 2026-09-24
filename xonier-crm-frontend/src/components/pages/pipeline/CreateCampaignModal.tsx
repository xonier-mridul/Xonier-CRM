"use client";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FiX, FiSearch, FiUpload, FiCheck, FiChevronDown } from "react-icons/fi";
import { AuthService } from "@/src/services/auth.service";
import CampaignService from "@/src/services/campaign.service";
import { CampaignDistributionMode } from "@/src/types/campaign/campaign.types";
import { User } from "@/src/types";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/* ── tiny reusable multi-select with search + chips ── */
interface UserMultiSelectProps {
  label: string;
  users: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
  idPrefix: string;
}

const UserMultiSelect: React.FC<UserMultiSelectProps> = ({
  label,
  users,
  selected,
  onChange,
  idPrefix,
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
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selected.map((id) => {
            const u = getUser(id);
            if (!u) return null;
            return (
              <span
                key={`chip-${idPrefix}-${id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs rounded-full border border-cyan-200 dark:border-cyan-700"
              >
                {u.firstName} {u.lastName}
                <button
                  type="button"
                  onClick={() => removeChip(id)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <FiX size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors"
      >
        <span className="text-gray-400 dark:text-gray-400">
          {selected.length === 0
            ? `Select ${label.toLowerCase()}…`
            : `${selected.length} selected`}
        </span>
        <FiChevronDown
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-2 border-b dark:border-gray-600">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-md">
                <FiSearch className="text-gray-400" size={13} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                />
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No users found</p>
              ) : (
                filtered.map((u) => {
                  const uid = u.id || u._id || "";
                  const isSelected = selected.includes(uid);
                  return (
                    <button
                      key={`${idPrefix}-opt-${uid}`}
                      type="button"
                      onClick={() => toggle(uid)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors ${
                        isSelected
                          ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span>{u.firstName} {u.lastName}</span>
                      {isSelected && <FiCheck size={13} className="text-cyan-600" />}
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

/* ── Main Modal ── */
const CreateCampaignModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [managers, setManagers] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<CampaignDistributionMode>(
    CampaignDistributionMode.ON_DEMAND
  );
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        distributionConfig:
          distributionMode === CampaignDistributionMode.CONDITIONAL ? {} : undefined,
      };

      const res = await CampaignService.create(payload);
      if (res.status === 201) {
        toast.success("Campaign created successfully");
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Campaign
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 flex flex-col gap-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              placeholder="e.g. Q4 Marketing"
            />
          </div>

          {/* Managers */}
          {isLoadingUsers ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          ) : (
            <UserMultiSelect
              label="Managers"
              users={users}
              selected={managers}
              onChange={setManagers}
              idPrefix="mgr"
            />
          )}

          {/* Agents */}
          {isLoadingUsers ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          ) : (
            <UserMultiSelect
              label="Agents"
              users={users}
              selected={agents}
              onChange={setAgents}
              idPrefix="agt"
            />
          )}

          {/* Distribution Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Distribution Mode
            </label>
            <select
              value={distributionMode}
              onChange={(e) => setDistributionMode(e.target.value as CampaignDistributionMode)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
            >
              <option value={CampaignDistributionMode.ON_DEMAND}>On Demand</option>
              <option value={CampaignDistributionMode.EQUAL}>Equal Distribution</option>
              <option value={CampaignDistributionMode.CONDITIONAL}>Conditional (Rules)</option>
            </select>
          </div>

          {/* Bulk Leads Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bulk Leads Upload <span className="text-xs text-gray-400">(CSV / XLSX)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                csvFile
                  ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <FiUpload
                className={`text-2xl ${csvFile ? "text-cyan-500" : "text-gray-400"}`}
              />
              {csvFile ? (
                <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-300">
                  <FiCheck size={14} />
                  <span className="font-medium truncate max-w-[220px]">{csvFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-red-400 hover:text-red-600 ml-1"
                  >
                    <FiX size={13} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click to upload or drag & drop your file
                </p>
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
            <p className="text-xs text-gray-400 mt-1">
              File will be processed after campaign is saved.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
