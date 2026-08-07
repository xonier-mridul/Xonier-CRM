"use client";
import { MARGIN_TOP, SIDEBAR_WIDTH, SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";

import React, { JSX, useState, useEffect, useRef, useCallback } from "react";
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
  const [totalPages, setTotalPages] = useState<number>(1);
  
  const [err, setErr] = useState<string | string[] | null>(null);
 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [roleData, setRoleData] = useState<UserRole[]>([]);
   const [searchVal, setSearchVal] = useState<string>("");
     const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [permissionData, setPermissionData] =
    useState<Array<Permissions> | null>(null);
  const [formData, setFormData] = useState<UserRolePayload>({
    name: "",
    permissions: [],
    power: 10,
    canManageBelow: false

  });

  const auth = useSelector((state: RootState)=>state.auth)



 

  const {hasPermission} = usePermissions()

  // const getAllRoles = async (search?:string) => {
  //   setErr(null);
  //   setIsLoading(true);
  //   try {
  //       const filters: Record<string, string> = {};
  //       if (search && search.trim()) filters.search = search.trim();
  //     const result = await RoleService.getRoles({
  //       currentPage: currentPage,
  //       pageLimit: pageLimit,
  //       filter:filters
  //     });
  //     if (result.status === 200) {
  //       const data = result.data.data;
  //       console.log("role:",data)
  //       setRoleData(data.data);
    
  //       setTotalPages(Number(data.totalPages))
  //     }
  //   } catch (error) {
  //     process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
  //     if (axios.isAxiosError(error)) {
  //       const messages = extractErrorMessages(error);
  //       setErr(messages);
  //       toast.error(`${messages}`);
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const getAllRoles = async (search = "") => {
  setErr(null);
  setIsLoading(true);

  try {
    const result = await RoleService.getRoles({
      currentPage,
      pageLimit,
      filter: {
        search: search.trim(),
      },
    });

    if (result.status === 200) {
      const data = result.data.data;

      setRoleData(data.data);
      setTotalPages(Number(data.totalPages));
    }
  } catch (error) {
    if (process.env.NEXT_PUBLIC_ENV === "development") {
      console.error(error);
    }

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
          power: 10,
          canManageBelow: false
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

  

const handleSearch = (val: string) => {
  setSearchVal(val);

  if (searchTimer.current) {
    clearTimeout(searchTimer.current);
  }

  searchTimer.current = setTimeout(() => {
    setCurrentPage(1);
  }, 400);
};


useEffect(() => {
  getAllRoles(searchVal);
}, [currentPage, pageLimit, searchVal]);

  useEffect(() => {
    getAllPermissions();
    
  }, []);

  const isAdmin =
  auth.user?.userRole?.some(
    (role) => role.code === SUPER_ADMIN_ROLE_CODE
  ) ?? false;
  

  return (
    <div className={`lg:ml-72 mt-14 p-6`}>
      <UserRolesTable
        roleData={roleData}
        permissionData={permissionData}
        currentPage={currentPage}
        pageLimit={pageLimit}
        setPageLimit={setPageLimit}
        handleDelete={handleDelete}
        isLoading={isLoading}
        isPopupShow={isPopupShow}
        setIsPopupShow={setIsPopShow}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        hasPermissions={hasPermission}
        isAdmin={isAdmin}
        searchVal={searchVal}
        onSearch={handleSearch}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />
    </div>
  );
};

export default page;
