import { RoleTableProps } from "@/src/types/roles/roles.types";
import React from "react";
import { MdOutlineEdit, MdDeleteOutline, MdAdminPanelSettings } from "react-icons/md";
import { FaPlus, FaXmark, FaShieldHalved, FaEye } from "react-icons/fa6";
import { HiOutlineSearch, HiOutlineUserGroup } from "react-icons/hi";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import BlurryBackground from "../../common/BlurryBackground";
import FormButton from "../../ui/FormButton";
import Input from "../../ui/Input";
import { PERMISSIONS } from "@/src/constants/enum";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";
import { UserRole } from "@/src/types";

const UserRolesTable = ({
  roleData,
  handleDelete,
  isLoading,
  permissionData,
  isPopupShow,
  setIsPopupShow,
  formData,
  setFormData,
  handleSubmit,
  hasPermissions,
  isAdmin,
}: RoleTableProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [viewRoleModal, setViewRoleModal] = React.useState<UserRole | null>(null);

  const addPermission = (permissionId: string) => {
    if (formData.permissions.includes(permissionId)) return;
    setFormData((prev) => ({
      ...prev,
      permissions: [...prev.permissions, permissionId],
    }));
  };

  const removePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((id) => id !== permissionId),
    }));
  };

  const isSelected = (permissionId: string) =>
    formData.permissions.includes(permissionId);

  // Group permissions by module for better organization
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

  return (
    <>
      {/* ── View Role Modal ── */}
      {viewRoleModal && (
        <>
          <BlurryBackground onClick={() => setViewRoleModal(null)} />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl w-[650px] max-h-[90vh] z-[200] shadow-2xl flex flex-col">
            {/* Modal Header */}
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
                    {viewRoleModal.code === SUPER_ADMIN_ROLE_CODE && (
                      <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        SYSTEM
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewRoleModal.code === SUPER_ADMIN_ROLE_CODE ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <IoShieldCheckmarkOutline className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">
                    Full System Access
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    This role has unrestricted access to all features and permissions in the system.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Permissions ({viewRoleModal.permissions.length})
                    </h3>
                  </div>

                  {/* Group permissions by module */}
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

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Created {new Date(viewRoleModal.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewRoleModal(null)}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  Close
                </button>
                {hasPermissions(PERMISSIONS.updateRole) && viewRoleModal.code !== SUPER_ADMIN_ROLE_CODE && (
                  <Link
                    href={`/roles/update/${viewRoleModal.id}`}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <MdOutlineEdit className="w-4 h-4" />
                    Edit Role
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Create Role Modal ── */}
      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl w-[720px] max-h-[90vh] z-[200] shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FaShieldHalved className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Create Role
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define a new role with custom permissions
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Role Name Input */}
              <Input
                label="Role name"
                name="name"
                placeholder="e.g. Sales Manager, Team Lead, Developer"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              {/* Selected Permissions */}
              {formData.permissions.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                      Selected Permissions
                    </span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                      {formData.permissions.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.permissions.map((id) => {
                      const perm = permissionData?.find((p) => p.id === id);
                      if (!perm) return null;

                      return (
                        <span
                          key={id}
                          className="group bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 capitalize hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                          {perm.title}
                          <button
                            onClick={() => removePermission(id)}
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

              {/* Permissions Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Available Permissions
                  </span>
                  <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent w-56"
                    />
                  </div>
                </div>

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
                              disabled={selected}
                              onClick={() => addPermission(permission.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all ${
                                selected
                                  ? "bg-indigo-100 dark:bg-indigo-900/40 cursor-not-allowed"
                                  : "hover:bg-white dark:hover:bg-gray-600"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      selected
                                        ? "bg-indigo-500 border-indigo-500"
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
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsPopupShow(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <FormButton
                isLoading={isLoading}
                onClick={handleSubmit}
                disabled={formData.name === "" || formData.permissions.length <= 0}
              >
                <FaPlus className="w-4 h-4" />
                Create Role
              </FormButton>
            </div>
          </div>
        </>
      )}

      {/* ── Main Table Container ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <HiOutlineUserGroup className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                User Roles
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage roles and permissions
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPopupShow(true)}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
            disabled={!hasPermissions(PERMISSIONS.createRole)}
          >
            <FaPlus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Permissions
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
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
                      {/* Role Name */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              role.code === SUPER_ADMIN_ROLE_CODE
                                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                : "bg-gradient-to-br from-indigo-400 to-violet-500"
                            }`}
                          >
                            {role.code === SUPER_ADMIN_ROLE_CODE ? (
                              <MdAdminPanelSettings className="w-5 h-5 text-white" />
                            ) : (
                              <FaShieldHalved className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                              {role.name}
                              {role.code === SUPER_ADMIN_ROLE_CODE && (
                                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                  SYSTEM
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

                      {/* Permissions */}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2 max-w-2xl">
                          {role.code === SUPER_ADMIN_ROLE_CODE ? (
                            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold">
                              <IoShieldCheckmarkOutline className="w-3.5 h-3.5" />
                              Full Access
                            </span>
                          ) : (
                            role.permissions.slice(0, 4).map((item, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium capitalize"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                {item.title}
                              </span>
                            ))
                          )}
                          {role.permissions.length > 4 && (
                            <span className="inline-flex items-center bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                              +{role.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {/* View Button */}
                          <button
                            onClick={() => setViewRoleModal(role)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all hover:scale-105 active:scale-95"
                            title="View role details"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          {hasPermissions(PERMISSIONS.updateRole) &&
                          role.code !== SUPER_ADMIN_ROLE_CODE ? (
                            <Link
                              href={`/roles/update/${role.id}`}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all hover:scale-105 active:scale-95"
                              title="Edit role"
                            >
                              <MdOutlineEdit className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-300 dark:text-amber-700 cursor-not-allowed opacity-50">
                              <MdOutlineEdit className="w-4 h-4" />
                            </span>
                          )}

                          {/* Delete Button */}
                          {role.code !== SUPER_ADMIN_ROLE_CODE ? (
                            <button
                              onClick={() => handleDelete(role.id)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-100 dark:disabled:hover:bg-rose-900/30 transition-all hover:scale-105 active:scale-95"
                              disabled={!hasPermissions(PERMISSIONS.deleteRole)}
                              title="Delete role"
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
                    <td colSpan={3} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                          <HiOutlineUserGroup className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">
                          No roles found
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Create your first role to get started
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
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
                        <Skeleton height={28} width={110} borderRadius={8} />
                        <Skeleton height={28} width={110} borderRadius={8} />
                        <Skeleton height={28} width={110} borderRadius={8} />
                      </div>
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
      </div>
    </>
  );
};

export default UserRolesTable;