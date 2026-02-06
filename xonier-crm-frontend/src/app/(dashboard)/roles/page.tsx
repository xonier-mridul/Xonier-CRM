"use client";
import { MARGIN_TOP, SIDEBAR_WIDTH, SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";

import React, { JSX, useState, useEffect } from "react";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import axios from "axios";
import { RoleService } from "@/src/services/role.service";
import UserRolesTable from "@/src/components/pages/roles/UserRolesTable";
import { PermissionsService } from "@/src/services/permission.service";
import { Permissions, UserRolePayload } from "@/src/types/roles/roles.types";
import { usePermissions } from "@/src/hooks/usePermissions";
import { UserRole } from "@/src/types";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useSelector, UseSelector } from "react-redux";
import { RootState } from "@/src/store";



const page = (): JSX.Element => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPopupShow, setIsPopShow] = useState<boolean>(false);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [err, setErr] = useState<string | string[] | null>(null);
 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [roleData, setRoleData] = useState<UserRole[]>([]);

  const [permissionData, setPermissionData] =
    useState<Array<Permissions> | null>(null);
  const [formData, setFormData] = useState<UserRolePayload>({
    name: "",
    permissions: [],
  });

  const auth = useSelector((state: RootState)=>state.auth)



 

  const {hasPermission} = usePermissions()

  const getAllRoles = async () => {
    setErr(null);
    setIsLoading(true);
    try {
      const result = await RoleService.getRoles({
        currentPage: currentPage,
        pageLimit: pageLimit,
      });
      if (result.status === 200) {
        const data = result.data.data;
        
        setRoleData(data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDelete = async (id: string): Promise<void> => {
    setErr("");
    setLoading(true)
    try {
      const confirm =await ConfirmPopup({title: "Are you sure for delete", text:"Are you sure to delete this User role", btnTxt: "Yes, Delete"})

      if(confirm){
         const result = await RoleService.delete(id)
         if(result.status === 200){
          toast.success("Role deleted successfully")
          await getAllRoles()
         }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    } finally {
      setLoading(false)
    }
  };

  const handleSubmit = async (): Promise<void> => {
    setIsLoading(true);
    setErr(null);
    try {
      const result = await RoleService.create(formData);
      if (result.status === 200) {
        await getAllRoles();
        setFormData({
          name: "",
          permissions: [],
        });
        toast.success("Roles created successfully");
        setIsPopShow(false);
       
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllRoles();
  }, []);

  useEffect(() => {
    getAllPermissions();
    
  }, []);

  const isAdmin =
  auth.user?.userRole?.some(
    (role) => role.code === SUPER_ADMIN_ROLE_CODE
  ) ?? false;
  

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <UserRolesTable
        roleData={roleData}
        permissionData={permissionData}
        currentPage={currentPage}
        pageLimit={pageLimit}
        handleDelete={handleDelete}
        isLoading={isLoading}
        isPopupShow={isPopupShow}
        setIsPopupShow={setIsPopShow}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        hasPermissions={hasPermission}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default page;
