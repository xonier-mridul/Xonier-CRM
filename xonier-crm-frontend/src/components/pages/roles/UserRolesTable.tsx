"use client";

import { RoleTableProps } from "@/src/types/roles/roles.types";
import React, { useState } from "react";
import { MdOutlineEdit, MdDeleteOutline, MdAdminPanelSettings } from "react-icons/md";
import { FaPlus, FaXmark, FaShieldHalved, FaEye, FaBolt } from "react-icons/fa6";
import { HiOutlineSearch, HiOutlineUserGroup } from "react-icons/hi";
import { IoShieldCheckmarkOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import BlurryBackground from "../../common/BlurryBackground";
import FormButton from "../../ui/FormButton";
import Input from "../../ui/Input";
import { PERMISSIONS } from "@/src/constants/enum";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";
import { UserRole } from "@/src/types";
import { useTranslation } from "react-i18next";
import Pagination from "../../common/pagination";
import { IoIosSearch } from "react-icons/io";

const POWER_LEVELS = [
  { value: 10, label: "Viewer", color: "bg-slate-400" },
  { value: 30, label: "Member", color: "bg-blue-400" },
  { value: 50, label: "Manager", color: "bg-emerald-500" },
  { value: 70, label: "Project Manager", color: "bg-amber-500" },
  { value: 90, label: "Admin", color: "bg-rose-500" },
  { value: 100, label: "Owner", color: "bg-purple-600" },
];

function getPowerConfig(power: number) {
  const match = [...POWER_LEVELS].reverse().find((p) => power >= p.value);
  return match ?? POWER_LEVELS[0];
}

function PowerBar({ power }: { power: number }) {
  const pct = Math.min(100, power);
  const cfg = getPowerConfig(power);
  return (
    <div className="flex items-center gap-2.5 min-w-[140px]">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cfg.color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right tabular-nums">
        {power}
      </span>
    </div>
  );
}

const UserRolesTable: React.FC<RoleTableProps> = ({
  roleData,
  handleDelete,
  isLoading,
  permissionData,
  pageLimit,
  setPageLimit,
  isPopupShow,
  setIsPopupShow,
  formData,
  setFormData,
  handleSubmit,
  hasPermissions,
  currentPage,
  totalPages,
  searchVal,
  onSearch,
  setCurrentPage,
  isAdmin,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState("");

  const [viewRoleModal, setViewRoleModal] = React.useState<UserRole | null>(null);
  
  console.log("current page:",currentPage)
  console.log("totalpage page:",totalPages)


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

  const isModuleSelected = (perms: any[]) => {
  return perms.every((perm) => isSelected(perm.id));
};


const handleModulePermission = (perms:any[],
  checked:boolean)=>{
    if(checked){
      perms.forEach((perm)=>{
        if(!isSelected(perm.id)){
          addPermission(perm.id)
        }
      }
    
    )
    }
    else{
        perms.forEach((perm)=>{
          if(isSelected(perm.id)){
            removePermission(perm.id)
          }
        })
      }
  }

  const groupedPermissions = React.useMemo(() => {
    if (!permissionData) return {};
    const filtered = permissionData.filter((p) =>
      searchTerm
        ? p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.module.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );
    return filtered.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, typeof permissionData>);
  }, [permissionData, searchTerm]);

const allPermissions = Object.values(groupedPermissions).flat();

const isAllSelected = allPermissions.every((perm) =>
  isSelected(perm.id)
);



const handleAllPermissions = (checked: boolean) => {
  if (checked) {
    allPermissions.forEach((perm) => {
      if (!isSelected(perm.id)) {
        addPermission(perm.id);
      }
    });
  } else {
    allPermissions.forEach((perm) => {
      if (isSelected(perm.id)) {
        removePermission(perm.id);
      }
    });
  }
};


  return (
    <>
      {viewRoleModal && (
        <>
          <BlurryBackground onClick={() => setViewRoleModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl w-[680px] max-h-[90vh] z-[200] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    viewRoleModal.code === SUPER_ADMIN_ROLE_CODE
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-indigo-400 to-violet-500"
                  }`}
                >
                  {viewRoleModal.code === SUPER_ADMIN_ROLE_CODE ? (
                    <MdAdminPanelSettings className="w-6 h-6 text-white" />
                  ) : (
                    <FaShieldHalved className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                    {viewRoleModal.name}
                    {viewRoleModal.isSystemRole && (
                      <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        {t("system_2")}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <IoShieldCheckmarkOutline className="w-3.5 h-3.5" />
                    {viewRoleModal.code === SUPER_ADMIN_ROLE_CODE
                      ? "All permissions granted"
                      : `${viewRoleModal.permissions.length} permission${viewRoleModal.permissions.length !== 1 ? "s" : ""} assigned`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewRoleModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors group"
              >
                <FaXmark className="text-lg text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:rotate-90 transition-all duration-200" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 border border-slate-200 dark:border-gray-600">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2 flex items-center gap-1.5">
                    <FaBolt className="w-3 h-3" />
                    {t("power_level")}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {viewRoleModal.power}
                    </span>
                    <div className="flex-1">
                      <PowerBar power={viewRoleModal.power} />
                      <span className={`text-xs font-semibold mt-1 block ${getPowerConfig(viewRoleModal.power).color.replace("bg-", "text-")}`}>
                        {getPowerConfig(viewRoleModal.power).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 border border-slate-200 dark:border-gray-600">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                    {t("can_manage_below")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {viewRoleModal.canManageBelow ? (
                      <>
                        <IoCheckmarkCircle className="text-emerald-500 text-xl" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {t("yes_can_manage_lower_power_roles")}
                        </span>
                      </>
                    ) : (
                      <>
                        <IoCloseCircle className="text-slate-400 text-xl" />
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {t("no_management_access")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {viewRoleModal.code === SUPER_ADMIN_ROLE_CODE ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <IoShieldCheckmarkOutline className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">
                    {t("full_system_access")}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t("this_role_has_unrestricted_access_to")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("permissions")}{viewRoleModal.permissions.length})
                    </h3>
                  </div>
                  {(() => {
                    const grouped = viewRoleModal.permissions.reduce((acc, perm) => {
                      if (!acc[perm.module]) acc[perm.module] = [];
                      acc[perm.module].push(perm);
                      return acc;
                    }, {} as Record<string, typeof viewRoleModal.permissions>);

                    return (
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([module, perms]) => (
                          <div
                            key={module}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden"
                          >
                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600">
                              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                {module}
                              </h4>
                            </div>
                            <div className="p-3 space-y-2">
                              {perms.map((perm) => (
                                <div
                                  key={perm.id}
                                  className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="w-5 h-5 rounded border-2 bg-emerald-500 border-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-900 dark:text-white capitalize text-sm">
                                      {perm.title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {perm.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                                        {perm.action}
                                      </span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {perm.code}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t("created")}{" "}
                {new Date(viewRoleModal.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewRoleModal(null)}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  {t("close")}
                </button>
                {hasPermissions(PERMISSIONS.updateRole) &&
                  viewRoleModal.code !== SUPER_ADMIN_ROLE_CODE && (
                    <Link
                      href={`/roles/update/${viewRoleModal.id}`}
                      className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <MdOutlineEdit className="w-4 h-4" />
                      {t("edit_role")}
                    </Link>
                  )}
              </div>
            </div>
          </div>
        </>
      )}

      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl md:w-[720px] max-h-[90vh] z-[200] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <FaShieldHalved className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("create_role")}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("define_a_new_role_with_custom")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPopupShow(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors group"
              >
                <FaXmark className="text-lg text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:rotate-90 transition-all duration-200" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <Input
                label={t("role_name")}
                name="name"
                placeholder={t("e_g_sales_manager_team_lead")}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FaBolt className="w-3.5 h-3.5 text-amber-500" />
                    {t("power_level")}
                    <span className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                      {formData.power}
                    </span>
                  </label>
                 
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span>{t("viewer_1")}</span>
                    <span
                      className={`font-semibold ${getPowerConfig(formData.power).color.replace("bg-", "text-")}`}
                    >
                      {getPowerConfig(formData.power).label}
                    </span>
                    <span>{t("owner_100")}</span>
                  </div>
                  <div className="w-full h-1.5 relative bg-slate-100 dark:bg-gray-700 rounded-full mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${getPowerConfig(formData.power).color}`}
                      style={{ width: `${formData.power}%` }}
                    />
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={formData.power}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, power: Number(e.target.value) }))
                      }
                      className={`w-full h-2 absolute top-0 bottom-0 rounded-lg appearance-none bg-transparent cursor-pointer transition-colors ${getPowerConfig(formData.power).color.replace("bg-", "accent-")}`}
                    />
                  </div>
                  
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("management_access")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, canManageBelow: !prev.canManageBelow }))
                    }
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      formData.canManageBelow
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700"
                        : "border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        formData.canManageBelow ? "bg-emerald-500" : "bg-slate-300 dark:bg-gray-600"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          formData.canManageBelow ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {t("can_manage_below")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formData.canManageBelow
                          ? "Can manage users with lower power"
                          : "Read-only, no user management"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {formData.permissions.length > 0 && (
                <div className="bg-cyan-50 max-h-34 overflow-scroll dark:bg-indigo-950/20 rounded-xl p-4 border border-cyan-100 dark:border-cyan-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                      {t("selected_permissions")}
                    </span>
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, permissions: [] }))}
                      className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {t("remove_all")}{formData.permissions.length})
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.permissions.map((id) => {
                      const perm = permissionData?.find((p) => p.id === id);
                      if (!perm) return null;
                      return (
                        <span
                          key={id}
                          className="group bg-white dark:bg-gray-700 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-lg  text-sm flex items-center gap-2 capitalize hover:bg-stone-50 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                          {perm.title}
                          <button
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

              <div>
                <div className="grid md:grid-cols-3 items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("available_permissions")}
                  </span>
                  <div className="relative flex gap-2">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t("search_permissions")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent w-56"
                    />
                    <div className=" bg-white rounded-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-4 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleAllPermissions(e.target.checked)}
                      className="hidden"
                    />

                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            isAllSelected
                              ? "bg-cyan-500 border-cyan-500"
                              : "border-slate-300 bg-white"
                          }
                        `}
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
                        {isAllSelected? 'Deselect All Permissions':'Select All Permissions'}
                      </span>
                    </label>
                  </div>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div
                      key={module}
                      className="border-b border-gray-200 dark:border-gray-600 last:border-0"
                    >
                      <div className="sticky top-0 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 z-10 flex justify-between items-center">
                        <span>{module}</span>
                        <label className="flex items-center cursor-pointer">
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
                              <div className="flex items-center gap-3">
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
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsPopupShow(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
              >
                {t("cancel")}
              </button>
              <FormButton
                isLoading={isLoading}
                onClick={handleSubmit}
                disabled={formData.name === "" || formData.permissions.length <= 0}
              >
                <FaPlus className="w-4 h-4" />
                {t("create_role")}
              </FormButton>
            </div>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <HiOutlineUserGroup className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("user_roles")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("manage_roles_permissions_and_power_hierarchy")}
              </p>
            </div>
          </div>
           <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={pageLimit}
                      className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white outline-none"
                      onChange={(e) => setPageLimit(Number(e.target.value))}
                    >
                      {[10, 20, 30, 40].map((n) => (
                        <option key={n} value={n}>{n} {t("page_2")}</option>
                      ))}
                    </select>
          
                    <div className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 flex items-center gap-2">
                      <IoIosSearch className="text-lg text-gray-400" />
                      <input
                        type="text"
                        className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400 w-44"
                        placeholder={t("search_role")}
                        value={searchVal}
                        onChange={(e) => onSearch(e.target.value)}
                      />
                    </div>
                    <button
            onClick={() => setIsPopupShow(true)}
            className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl flex text-sm  md:text-lg  items-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
            disabled={!hasPermissions(PERMISSIONS.createRole)}
          >
            <FaPlus className="w-4 h-4" />
            {t("create_role")}
          </button>
                  </div>
          
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                {["role", "permissions", "power", "can_manage_below", "actions"].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    {t(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {!isLoading ? (
                roleData && roleData.length > 0 ? (
                  roleData.map((role) => (
                    <tr
                      key={role.id}
                      className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              role.isSystemRole
                                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                : "bg-gradient-to-br from-cyan-400 to-teal-500"
                            }`}
                          >
                            {role.isSystemRole ? (
                              <MdAdminPanelSettings className="w-5 h-5 text-white" />
                            ) : (
                              <FaShieldHalved className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                              {role.name}
                              {role.isSystemRole && (
                                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                  {t("system_2")}
                                </span>
                              )}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <IoShieldCheckmarkOutline className="w-3.5 h-3.5" />
                              {role.code === SUPER_ADMIN_ROLE_CODE
                                ? "All permissions"
                                : `${role.permissions.length} permission${role.permissions.length !== 1 ? "s" : ""}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap whitespace-nowrap gap-2 max-w-xs">
                          {role.code === SUPER_ADMIN_ROLE_CODE ? (
                            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold">
                              <IoShieldCheckmarkOutline className="w-3.5 h-3.5" />
                              {t("full_access")}
                            </span>
                          ) : (
                            <>
                              {role.permissions.slice(0, 3).map((item, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium capitalize"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  {item.title}
                                </span>
                              ))}
                              {role.permissions.length > 3 && (
                                <span className="inline-flex items-center bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                                  +{role.permissions.length - 3} {t("more")}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5 min-w-[180px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-md ${getPowerConfig(role.power).color} text-white`}
                            >
                              {getPowerConfig(role.power).label}
                            </span>
                          </div>
                          <PowerBar power={role.power} />
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {role.canManageBelow ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            <IoCheckmarkCircle className="w-3.5 h-3.5" />
                            {t("yes")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            <IoCloseCircle className="w-3.5 h-3.5" />
                            {t("no")}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewRoleModal(role)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all hover:scale-105 active:scale-95"
                            title={t("view_role_details")}
                          >
                            <FaEye className="w-4 h-4" />
                          </button>

                          {hasPermissions(PERMISSIONS.updateRole) && !role.isSystemRole ? (
                            <Link
                              href={`/roles/update/${role.id}`}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all hover:scale-105 active:scale-95"
                              title={t("edit_role_2")}
                            >
                              <MdOutlineEdit className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-300 dark:text-amber-700 cursor-not-allowed opacity-50">
                              <MdOutlineEdit className="w-4 h-4" />
                            </span>
                          )}

                          {!role.isSystemRole ? (
                            <button
                              onClick={() => handleDelete(role.id)}
                              disabled={!hasPermissions(PERMISSIONS.deleteRole)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-100 dark:disabled:hover:bg-rose-900/30 transition-all hover:scale-105 active:scale-95"
                              title={t("delete_role")}
                            >
                              <MdDeleteOutline className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/10 text-rose-300 dark:text-rose-700 cursor-not-allowed opacity-50">
                              <MdDeleteOutline className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                          <HiOutlineUserGroup className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{t("no_roles_found")}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {t("create_your_first_role_to_get")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Skeleton width={40} height={40} borderRadius={10} />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton height={18} width={140} borderRadius={6} />
                          <Skeleton height={12} width={90} borderRadius={6} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Skeleton height={28} width={90} borderRadius={8} />
                        <Skeleton height={28} width={90} borderRadius={8} />
                        <Skeleton height={28} width={60} borderRadius={8} />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Skeleton height={32} width={160} borderRadius={8} />
                    </td>
                    <td className="px-6 py-5">
                      <Skeleton height={28} width={60} borderRadius={8} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Skeleton height={36} width={36} borderRadius={8} />
                        <Skeleton height={36} width={36} borderRadius={8} />
                        <Skeleton height={36} width={36} borderRadius={8} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
         <div className="px-6 pb-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
      </div>
    </>
  );
};

export default UserRolesTable;