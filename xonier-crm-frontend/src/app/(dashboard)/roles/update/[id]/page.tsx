"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import Input from "@/src/components/ui/Input";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { RoleService } from "@/src/services/role.service";
import { PermissionsService } from "@/src/services/permission.service";
import { UserRolePayload, Permissions } from "@/src/types/roles/roles.types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState, FormEvent } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { FaXmark } from "react-icons/fa6";

const UpdateRolePage = (): JSX.Element => {
  const [err, setErr] = useState<string | string[]>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [permissionData, setPermissionData] = useState<Permissions[]>([]);

  const [formData, setFormData] = useState<UserRolePayload>({
    name: "",
    permissions: [],
  });

  const { id } = useParams();
  const router = useRouter();

  /* ------------------ Fetch permissions ------------------ */
  const getAllPermissions = async () => {
    try {
      const result = await PermissionsService.getAll();
      if (result.status === 200) {
        setPermissionData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
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
        });
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
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
      if (result.status === 200) {
        toast.success("Role updated successfully");
        // setTimeout(() => router.push("/roles"), 2000);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
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


  const addPermission = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: [...prev.permissions, id],
    }));
  };

  const removePermission = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((p) => p !== id),
    }));
  };

const isSelected = (id: string) => {
  return formData.permissions.includes(id.toString());
};
  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">
        <h2 className="text-xl font-bold dark:text-white">Update Role</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
          {/* Role Name */}
          {loading ? (
            <div className="flex flex-col gap-1 animate-pulse">
              <Skeleton height={14} width={100} />
              <Skeleton height={36} borderRadius={12} />
            </div>
          ) : (
            <Input
              label="Role Name"
              placeholder="Enter role name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          )}

          {/* Selected Permissions */}
          {formData.permissions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500">
                Selected permissions ({formData.permissions.length})
              </span>

              <div className="flex flex-wrap gap-2">
                {formData.permissions.map((id) => {
                  const perm = permissionData.find((p) => p.id === id);
                  if (!perm) return null;

                  return (
                    <span
                      key={id}
                      className="bg-blue-100 dark:bg-blue-900/40
                        text-blue-700 dark:text-blue-300
                        px-3 py-1 rounded-full text-sm
                        flex items-center gap-2 capitalize"
                    >
                      {perm.title}
                      <button
                        type="button"
                        onClick={() => removePermission(id)}
                        className="hover:text-red-500"
                      >
                        <FaXmark />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}


          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500">Available permissions</span>

            {isLoading ? <div><Skeleton className="animate-pulse" height={80} width={1140} /></div> :<div className="max-h-64 overflow-y-auto border rounded-md p-2">
              {permissionData.map((permission) => {
                const selected = isSelected(permission.id);

                return (
                  <button
                    key={permission.id}
                    type="button"
                    disabled={selected}
                    onClick={() => addPermission(permission.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-md mb-1 transition
                      ${
                        selected
                          ? "bg-blue-200 dark:bg-blue-900/50 cursor-not-allowed"
                          : "hover:bg-blue-100 dark:hover:bg-gray-600"
                      }
                    `}
                  >
                    <div className="font-medium capitalize flex justify-between">
                      {permission.title}
                      {selected && (
                        <span className="text-xs text-blue-700 dark:text-blue-300">
                          selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {permission.module} · {permission.action}
                    </div>
                  </button>
                );
              })}
            </div>}
          </div>

          {/* Error */}
          {err && (
            <div className="rounded-md border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {Array.isArray(err) ? (
                <ul className="list-disc pl-4">
                  {err.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              ) : (
                err
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <FormButton
              type="submit"
              isLoading={isLoading}
              disabled={
                formData.name === "" || formData.permissions.length === 0
              }
            >
              Update Role
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateRolePage;
