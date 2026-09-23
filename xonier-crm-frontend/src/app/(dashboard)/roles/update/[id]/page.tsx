"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import { RoleService } from "@/src/services/role.service";
import { PermissionsService } from "@/src/services/permission.service";
import { UserRolePayload, Permissions } from "@/src/types/roles/roles.types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState, FormEvent } from "react";
import { toast } from "react-toastify";
import { FaShieldHalved, FaFloppyDisk } from "react-icons/fa6";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import { useTranslation } from "react-i18next";
import RoleForm from "@/src/components/role/RoleForm";

const MAX_POWER = 92;

const UpdateRolePage = (): JSX.Element => {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | string[]>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionData, setPermissionData] = useState<Permissions[]>([]);

  const [formData, setFormData] = useState<UserRolePayload>({
    name: "",
    permissions: [],
    power: 1,
    canManageBelow: false,
  });

  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const router = useRouter();

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
      router.back()
      setIsLoading(false);
    }
  };

  const handleRemoveAll = async () => {
    const {isConfirmed} = await ConfirmPopup({
      title: "Remove all permissions?",
      text: "Are you sure you want to remove all permissions from this role? This action cannot be reverted.",
      btnTxt: "Yes, remove all",
      cancelTxt: "No, keep them",
    });
    if (isConfirmed) setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  return (
    <div className="">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <FaShieldHalved className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t("update_role")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("modify_role_name_power_level_and")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-5">
              <RoleForm
                formData={formData}
                setFormData={setFormData}
                permissionData={permissionData}
                maxPower={MAX_POWER}
                loading={loading}
                onRemoveAll={handleRemoveAll}
              />

              {err && (
                <div className="rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {Array.isArray(err) ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {err.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  ) : (
                    err
                  )}
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
                disabled={
                  formData.name === "" ||
                  formData.permissions.length === 0 ||
                  !hasPermission(PERMISSIONS.updateRole)
                }
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