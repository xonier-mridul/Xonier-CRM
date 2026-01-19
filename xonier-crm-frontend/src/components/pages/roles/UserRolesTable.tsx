import { RoleTableProps } from "@/src/types/roles/roles.types";
import React from "react";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { FaPlus, FaXmark } from "react-icons/fa6";
import BlurryBackground from "../../common/BlurryBackground";
import FormButton from "../../ui/FormButton";
import Input from "../../ui/Input";
import { PERMISSIONS } from "@/src/constants/enum";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";



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
  isAdmin
}: RoleTableProps) => {
  console.log("isAd: ", isAdmin)
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

  return (
    <>
      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />

          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
            bg-white dark:bg-gray-700 p-6 rounded-xl w-[650px] z-[200]
            flex flex-col gap-5 shadow-xl"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Create Role</h2>
              <button onClick={() => setIsPopupShow(false)}>
                <FaXmark className="text-xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300" />
              </button>
            </div>

            <Input
              label="Role name"
              name="name"
              placeholder="e.g. Sales Manager"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />

            {formData.permissions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500">
                  Selected permissions ({formData.permissions.length})
                </span>

                <div className="flex flex-wrap gap-2">
                  {formData.permissions.map((id) => {
                    const perm = permissionData?.find((p) => p.id === id);
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
              <span className="text-sm text-gray-500">
                Available permissions
              </span>

              <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                {permissionData?.map((permission) => {
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
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPopupShow(false)}
                className="px-4 py-2 rounded-md border hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Cancel
              </button>

              <FormButton isLoading={isLoading} onClick={handleSubmit} disabled={formData.name === "" || formData.permissions.length <= 0}>
                Create Role
              </FormButton>
            </div>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-700 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">User Roles</h2>

          <button
            onClick={() => setIsPopupShow(true)}
            className="bg-blue-600 hover:bg-blue-700
              text-white px-5 py-2 rounded-md
              flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-blue-300" 
              disabled={!hasPermissions(PERMISSIONS.createRole)}
          >
            <FaPlus /> Create Role
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Permissions</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading ? (
              roleData && roleData.length > 0 ? (
                roleData?.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-4 ">
                      <div className="flex flex-col gap-1 font-medium ">
                        <h3>{role.name}</h3>
                        <span className="text-xs text-gray-500 capitalize">
                          {role.code === SUPER_ADMIN_ROLE_CODE ? "All" : role.permissions.length} permissions
                        </span>
                      </div>{" "}
                    </td>
                    <td className="p-4 flex items-center flex-wrap gap-3">
                      {role.permissions && ( (role.code === SUPER_ADMIN_ROLE_CODE) ? <span className="bg-green-50 px-3 py-1 text-green-600 rounded-md text-sm capitalize">
                            All permissions
                          </span> :
                        role.permissions.map((item, i) => (
                          <span key={i} className="bg-green-50 px-3 py-1 text-green-600 rounded-md text-sm capitalize">
                            {item.title}
                          </span>
                        )))}
                    </td>
                    <td className="">
                      <div className="flex items-center gap-3">
                        {(hasPermissions(PERMISSIONS.updateRole) && !isAdmin ) ? <Link href={`/roles/update/${role.id}`} className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 disabled:cursor-not-allowed disabled:bg-yellow-50  text-yellow-500 hover:scale-104" >
                          <MdOutlineEdit className="text-xl" />
                        </Link> : <span className="h-9 w-9 flex items-center justify-center rounded-md  bg-yellow-100/80 dark:bg-yellow-100  dark:hover:bg-yellow-100 cursor-not-allowed   text-yellow-400">
                           <MdOutlineEdit className="text-xl" />
                          </span>}
                        {
                          <button
                            onClick={() => handleDelete(role.id)}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 disabled:cursor-not-allowed hover:scale-104" disabled={!hasPermissions(PERMISSIONS.deleteRole)}
                          >
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center">
                    Not found
                  </td>
                </tr>
              )
            ) : (
              <tr className="animate-pulse">
                <td  className="p-4">
                  <Skeleton height={30} width={130} borderRadius={14} />
                </td>
                <td  className="p-4 ">
                  <div className="flex items-center gap-2">
                  <Skeleton height={30} width={120} borderRadius={14} />
                  <Skeleton height={30} width={120} borderRadius={14} />
                  <Skeleton height={30} width={120} borderRadius={14} />
                  <Skeleton height={30} width={120} borderRadius={14} />
                  </div>
                </td>
                <td  className="p-4 ">
                  <div className="flex items-center gap-2">
                  <Skeleton height={35} width={35} borderRadius={14} />
                  <Skeleton height={35} width={35} borderRadius={14} />
                  </div>
                  
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default UserRolesTable;
