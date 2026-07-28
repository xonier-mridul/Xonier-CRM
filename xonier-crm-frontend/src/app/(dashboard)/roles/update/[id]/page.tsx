"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import Input from "@/src/components/ui/Input";
import { RoleService } from "@/src/services/role.service";
import { PermissionsService } from "@/src/services/permission.service";
import { UserRolePayload, Permissions } from "@/src/types/roles/roles.types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState, FormEvent, useMemo } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { FaXmark, FaShieldHalved, FaFloppyDisk } from "react-icons/fa6";
import { HiOutlineSearch } from "react-icons/hi";
import { FiToggleLeft, FiToggleRight, FiZap } from "react-icons/fi";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import { useTranslation } from "react-i18next";

const MAX_POWER = 92;

const UpdateRolePage = (): JSX.Element => {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | string[]>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [permissionData, setPermissionData] = useState<Permissions[]>([]);

 
  const [formData, setFormData] = useState<UserRolePayload>({
    name: "",
    permissions: [],
    power: 1,
    canManageBelow: false,
  });

  const { id } = useParams();
  const {hasPermission} = usePermissions()
  const router = useRouter();

  const groupedPermissions = useMemo(() => {
    const filtered = permissionData.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.action?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.reduce<Record<string, Permissions[]>>((acc, perm) => {
      const module = perm.module ?? "General";
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {});
  }, [permissionData, searchTerm]);

  const getAllPermissions = async () => {
    try {
      const result = await PermissionsService.getAll();
      if (result.status === 200) setPermissionData(result.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    }
  };

  const getRoleData = async (id: ParamValue) => {
    try {
      const result = await RoleService.getRoleById(id);
      if (result.status === 200) {
        const data = result.data.data;
        setFormData({
          name: data.name ?? "",
          permissions: data.permissions.map((p: any) =>
            typeof p === "string" ? p : p.id || p._id
          ),
          power: Math.min(data.power ?? 1, MAX_POWER),
          canManageBelow: data.canManageBelow ?? false,
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllPermissions();
    if (!id) return;
    getRoleData(id);
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    setIsLoading(true);
    try {
      const result = await RoleService.update(id, formData);
      if (result.status === 200) toast.success("Role updated successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAll = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const confirm = await ConfirmPopup({
      title: "Remove all permissions?",
      text: "Are you sure you want to remove all permissions from this role? This action cannot be reverted.",
      btnTxt: "Yes, remove all",
      cancelTxt: "No, keep them",
    });
    if (confirm) setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  const addPermission = (permId: string) => {
    if (isSelected(permId)) removePermission(permId);
    else setFormData((prev) => ({ ...prev, permissions: [...prev.permissions, permId] }));
  };

  const removePermission = (permId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((p) => p !== permId),
    }));
  };

  const isSelected = (permId: string) => formData.permissions.includes(permId.toString());

  const handlePowerChange = (value: number) => {
    const clamped = Math.min(Math.max(1, value), MAX_POWER);
    setFormData((prev) => ({ ...prev, power: clamped }));
  };

  const powerPercent = ((formData.power ?? 1) / MAX_POWER) * 100;
  const powerColor =
    powerPercent >= 80
      ? "bg-red-500"
      : powerPercent >= 50
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <FaShieldHalved className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("update_role")}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("modify_role_name_power_level_and")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-5">

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
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              )}

              {loading ? (
                <Skeleton height={100} borderRadius={12} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

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
                          onClick={() => handlePowerChange((formData.power ?? 1) - 1)}
                          disabled={(formData.power ?? 1) <= 1}
                          className="h-7 w-7 outline-none rounded-lg border border-slate-200 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={MAX_POWER}
                          value={formData.power ?? 1}
                          onChange={(e) => handlePowerChange(Number(e.target.value))}
                          className="w-14 text-center text-sm font-bold rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => handlePowerChange((formData.power ?? 1) + 1)}
                          disabled={(formData.power ?? 1) >= MAX_POWER}
                          className="h-7 w-7 rounded-lg outline-none border border-slate-200 dark:border-gray-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="relative h-2 rounded-full bg-slate-200 dark:bg-gray-600 ">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${powerColor}`}
                        style={{ width: `${powerPercent}%` }}
                      />
                       <input
                          type="range"
                          min={1}
                          max={92}
                          step={1}
                          value={formData.power}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, power: Number(e.target.value) }))
                          }
                          className={`w-full h-2 absolute top-0 bottom-0 rounded-lg appearance-none cursor-pointer accent-cyan-600
                      `}
                  />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-slate-400">{t("1_least_powerful")}</span>
                      <span className="text-[11px] text-slate-400">{t("max")} {MAX_POWER}</span>
                    </div>
                    {(formData.power ?? 1) >= MAX_POWER && (
                      <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                        {t("maximum_power_level_reached")}{MAX_POWER})
                      </p>
                    )}
                  </div>

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
                        setFormData((prev) => ({ ...prev, canManageBelow: !prev.canManageBelow }))
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
                        {formData.canManageBelow ? "Enabled" : "Disabled"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {formData.permissions.length > 0 && (
                <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-xl p-4 border border-cyan-100 dark:border-cyan-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                      {t("selected_permissions")}
                    </span>
                    <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/40 px-2 py-0.5 rounded-full">
                      <button
                        onClick={handleRemoveAll}
                        className="ml-1 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        {t("remove_all_nbsp")}{formData.permissions.length}
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.permissions.map((permId) => {
                      const perm = permissionData.find((p) => p.id === permId);
                      if (!perm) return null;
                      return (
                        <span
                          key={permId}
                          className="group bg-white dark:bg-gray-700 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 capitalize hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                          {perm.title}
                          <button
                            type="button"
                            onClick={() => removePermission(permId)}
                            className="ml-1 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            <FaXmark className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("available_permissions")}
                  </span>
                  <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t("search_permissions")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent w-56"
                    />
                  </div>
                </div>

                {loading ? (
                  <Skeleton height={320} borderRadius={12} />
                ) : (
                  <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="border-b border-gray-200 dark:border-gray-600 last:border-0">
                        <div className="sticky top-0 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 z-10">
                          {module}
                        </div>
                        <div className="p-2">
                          {perms.map((permission) => {
                            const selected = isSelected(permission.id);
                            return (
                              <button
                                key={permission.id}
                                type="button"
                                onClick={() => addPermission(permission.id)}
                                className="w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all hover:bg-white dark:hover:bg-gray-600"
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
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
                      </div>
                    ))}
                    {Object.keys(groupedPermissions).length === 0 && (
                      <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t("no_permissions_match_your_search")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {err && (
                <div className="rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {Array.isArray(err) ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {err.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  ) : err}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
              >
                {t("cancel")}
              </button>
              <FormButton
                type="submit"
                isLoading={isLoading}
                onClick={()=> router.back()}
                disabled={formData.name === "" || formData.permissions.length === 0 || !hasPermission(PERMISSIONS.updateRole)}
              >
                <FaFloppyDisk className="w-4 h-4" />
                {t("update_role")}
              </FormButton>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateRolePage;