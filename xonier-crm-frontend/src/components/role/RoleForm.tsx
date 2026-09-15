"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HiOutlineSearch } from "react-icons/hi";
import { FaXmark, FaShieldHalved } from "react-icons/fa6";
import { FiZap, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import Input from "@/src/components/ui/Input";
import { UserRolePayload, Permissions } from "@/src/types/roles/roles.types";
import { getPowerConfig } from "@/src/app/utils/rolePower";

interface ExpandedModules {
  [key: string]: boolean;
}

interface RoleFormProps {
  formData: UserRolePayload;
  setFormData: React.Dispatch<React.SetStateAction<UserRolePayload>>;
  permissionData?: Permissions[] | null;
  maxPower?: number;
  /** show skeletons instead of real fields (e.g. while fetching role on update page) */
  loading?: boolean;
  /** custom remove-all handler (e.g. with confirmation popup). Defaults to instant clear. */
  onRemoveAll?: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  formData,
  setFormData,
  permissionData,
  maxPower = 100,
  loading = false,
  onRemoveAll,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedModules, setExpandedModules] = useState<ExpandedModules>({});

  const toggleModule = (module: string): void => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const addPermission = (permissionId: string) => {
    if (formData.permissions.includes(permissionId)) {
      removePermission(permissionId);
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...prev.permissions, permissionId],
      }));
    }
  };

  const removePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((id) => id !== permissionId),
    }));
  };

  const isSelected = (permissionId: string) =>
    formData.permissions.includes(permissionId);

  const isModuleSelected = (perms: Permissions[]) =>
    perms.every((perm) => isSelected(perm.id));

  const handleModulePermission = (perms: Permissions[], checked: boolean) => {
    if (checked) {
      perms.forEach((perm) => {
        if (!isSelected(perm.id)) addPermission(perm.id);
      });
    } else {
      perms.forEach((perm) => {
        if (isSelected(perm.id)) removePermission(perm.id);
      });
    }
  };

  const groupedPermissions = useMemo(() => {
    if (!permissionData) return {};
    const filtered = permissionData.filter((p) =>
      searchTerm
        ? p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.action?.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );
    return filtered.reduce((acc, perm) => {
      const module = perm.module ?? "General";
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {} as Record<string, Permissions[]>);
  }, [permissionData, searchTerm]);

  const allPermissions = Object.values(groupedPermissions).flat();

  const isAllSelected =
    allPermissions.length > 0 &&
    allPermissions.every((perm) => isSelected(perm.id));

  const handleAllPermissions = (checked: boolean) => {
    if (checked) {
      allPermissions.forEach((perm) => {
        if (!isSelected(perm.id)) addPermission(perm.id);
      });
    } else {
      allPermissions.forEach((perm) => {
        if (isSelected(perm.id)) removePermission(perm.id);
      });
    }
  };

  const handlePowerChange = (value: number) => {
    const clamped = Math.min(Math.max(1, value), maxPower);
    setFormData((prev) => ({ ...prev, power: clamped }));
  };

  const handleRemoveAllClick = () => {
    if (onRemoveAll) onRemoveAll();
    else setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  const powerValue = formData.power ?? 1;
  const powerConfig = getPowerConfig(powerValue);

  return (
    <div className="space-y-5">
      {/* Role Name */}
      {loading ? (
        <div className="flex flex-col gap-1 animate-pulse">
          <Skeleton height={14} width={100} />
          <Skeleton height={36} borderRadius={12} />
        </div>
      ) : (
        <Input
          label={t("role_name")}
          name="name"
          placeholder={t("e_g_sales_manager_team_lead")}
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      )}

      {/* Power Level + Can Manage Below */}
      {loading ? (
        <Skeleton height={140} borderRadius={12} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Power Level */}
          <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-200 dark:border-gray-600 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiZap className="text-amber-500 text-base" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("power_level")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePowerChange(powerValue - 1)}
                  disabled={powerValue <= 1}
                  className="h-7 w-7 outline-none rounded-lg border border-slate-200 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxPower}
                  value={powerValue}
                  onChange={(e) => handlePowerChange(Number(e.target.value))}
                  className="w-14 text-center text-sm font-bold rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 py-1"
                />
                <button
                  type="button"
                  onClick={() => handlePowerChange(powerValue + 1)}
                  disabled={powerValue >= maxPower}
                  className="h-7 w-7 rounded-lg outline-none border border-slate-200 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="relative h-2 rounded-full bg-slate-200 dark:bg-gray-600">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${powerConfig.color}`}
                style={{ width: `${(powerValue / maxPower) * 100}%` }}
              />
              <input
                type="range"
                min={1}
                max={maxPower}
                step={1}
                value={powerValue}
                onChange={(e) => handlePowerChange(Number(e.target.value))}
                className="w-full h-2 absolute top-0 bottom-0 rounded-lg appearance-none cursor-pointer bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-400">
                {t("least_powerful")} (1)
              </span>
              <span
                className={`text-[11px] font-semibold ${powerConfig.color.replace(
                  "bg-",
                  "text-"
                )}`}
              >
                {t(powerConfig.label)}
              </span>
              <span className="text-[11px] text-slate-400">
                {t("max")} ({maxPower})
              </span>
            </div>
            {powerValue >= maxPower && (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                {t("maximum_power_level_reached")} ({maxPower})
              </p>
            )}
          </div>

          {/* Can Manage Below */}
          <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-200 dark:border-gray-600 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FaShieldHalved className="text-cyan-500 text-sm" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("can_manage_below")}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t("when_enabled_this_role_can_manage")}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  canManageBelow: !prev.canManageBelow,
                }))
              }
              className="flex items-center gap-2.5 mt-4 w-fit"
            >
              {formData.canManageBelow ? (
                <FiToggleRight className="text-3xl text-cyan-500" />
              ) : (
                <FiToggleLeft className="text-3xl text-slate-400 dark:text-gray-500" />
              )}
              <span
                className={`text-sm font-semibold transition-colors ${
                  formData.canManageBelow
                    ? "text-cyan-600 dark:text-cyan-400"
                    : "text-slate-400 dark:text-gray-500"
                }`}
              >
                {formData.canManageBelow ? t("enabled") : t("disabled")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Permissions */}
      {formData.permissions.length > 0 && (
        <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-xl p-4 border border-cyan-100 dark:border-cyan-900/30 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
              {t("selected_permissions")}
            </span>
            <button
              type="button"
              onClick={handleRemoveAllClick}
              className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              {t("remove_all")} ({formData.permissions.length})
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.permissions.map((id) => {
              const perm = permissionData?.find((p) => p.id === id);
              if (!perm) return null;
              return (
                <span
                  key={id}
                  className="group bg-white dark:bg-gray-700 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 capitalize hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                  {perm.title}
                  <button
                    type="button"
                    onClick={() => removePermission(id)}
                    className="ml-1 hover:text-red-500 cursor-pointer dark:hover:text-red-400 transition-colors"
                  >
                    <FaXmark className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Permissions */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("available_permissions")}
          </span>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("search_permissions")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent w-56"
              />
            </div>
            <div className="bg-white text-sm rounded-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-4 py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleAllPermissions(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isAllSelected
                      ? "bg-cyan-500 border-cyan-500"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isAllSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {isAllSelected
                    ? t("deselect_all_permissions")
                    : t("select_all_permissions")}
                </span>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton height={320} borderRadius={12} />
        ) : (
          <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            {Object.entries(groupedPermissions).map(([module, perms]) => {
              const isOpen = !!expandedModules[module];
              return (
                <div
                  key={module}
                  className="border-b border-gray-200 dark:border-gray-600 last:border-0"
                >
                  <div
                    onClick={() => toggleModule(module)}
                    className="sticky top-0 bg-slate-50 flex justify-between items-center dark:bg-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 z-10 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isOpen ? "rotate-90" : "rotate-0"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span>{t(module)}</span>
                    </div>

                    <label
                      className="flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isModuleSelected(perms)}
                        onChange={(e) =>
                          handleModulePermission(perms, e.target.checked)
                        }
                        className="hidden"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isModuleSelected(perms)
                            ? "bg-cyan-500 border-cyan-500"
                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {isModuleSelected(perms) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </label>
                  </div>

                  {isOpen && (
                    <div className="p-2">
                      {perms.map((permission) => {
                        const selected = isSelected(permission.id);
                        return (
                          <button
                            key={permission.id}
                            type="button"
                            onClick={() => addPermission(permission.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-transparent mb-1 transition-all hover:bg-white dark:hover:bg-gray-600"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                    selected
                                      ? "bg-cyan-500 border-cyan-500"
                                      : "border-gray-300 dark:border-gray-500"
                                  }`}
                                >
                                  {selected && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-700 dark:text-slate-200 capitalize text-sm">
                                    {permission.title}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {permission.action}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(groupedPermissions).length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                {t("no_permissions_match_your_search")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleForm;