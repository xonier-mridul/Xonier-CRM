"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import { AuthService } from "@/src/services/auth.service";
import { User, UserRole, UserUpdatePayload } from "@/src/types";
import axios from "axios";
import React, { JSX, useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ParamValue } from "next/dist/server/request/params";
import UserUpdate from "@/src/components/pages/users/UserUpdate";
import { toast } from "react-toastify";
import { RoleService } from "@/src/services/role.service";

const page = (): JSX.Element => {
  const [err, setErr] = useState<string[] | string >("");
  const [userData, setUserData] = useState<User[]>([]);
  const [roleData, setRoleData] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserUpdatePayload>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    userRole: [],
    company: "",
  });

  const params: ParamValue = useParams().id;
  const router = useRouter()

  const getRoleData = async () => {
    try {
      const result = await RoleService.getRolesWithoutPagination();
      if (result.status === 200) {
        setRoleData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    }
  };

  const user = async (): Promise<void> => {
    setIsLoading(true);
    try {
      let result = await AuthService.getUserById(params);
      if (result.status === 200) {
        const resultData = result.data.data;
        setUserData(resultData);

        setFormData({
          firstName: resultData?.firstName ?? "",
          lastName: resultData?.lastName ?? "",
          email: resultData?.email ?? "",
          phone: resultData?.phone ?? "",
          userRole: resultData?.userRole?.map((item: any) => item.id) ?? [],
          company: resultData?.company ?? "",
        });
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    user();
    getRoleData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;

    if (formData.userRole.includes(roleId)) return;

    if (formData.userRole.length >= 1) {
      toast.info("Currently only one user role allowed");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      userRole: [...prev.userRole, roleId],
    }));

    e.target.value = "";
  };

  const handleRemoveRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      userRole: prev.userRole.filter((id) => id !== roleId),
    }));
  };

  const handleSubmit = async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault()
    setLoading(true)
    setErr("")
    try {
      const result = await AuthService.update(params, formData)
      if(result.status === 200){
        toast.success(`${formData.firstName} ${formData.lastName} updated successfully`)
        setTimeout(() => {
          router.push("/users")
        }, 2000);
        
      }
      
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setLoading(false)
    }

  }
  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
      <UserUpdate
        formData={formData}
        isLoading={isLoading}
        handleChange={handleChange}
        handleUserRoleChange={handleUserRoleChange}
        handleRemoveRole={handleRemoveRole}
        roleData={roleData}
        handleSubmit={handleSubmit}
        loading={loading}
        err={err}
        
      />
    </div>
  );
};

export default page;
