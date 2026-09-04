"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { AuthService } from "@/src/services/auth.service";
import {
  passwordCheck,
  User,
  UserPasswordUpdatedByAdminPayload,
  UserRole,
  UserStatusPayload,
  UserUpdatePayload,
} from "@/src/types";
import axios from "axios";
import React, { JSX, useState, useEffect, ChangeEvent, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ParamValue } from "next/dist/server/request/params";
import UserUpdate from "@/src/components/pages/users/UserUpdate";
import { toast } from "react-toastify";
import { RoleService } from "@/src/services/role.service";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { Company } from "@/src/types/company/company.types";
import CompanyService from "@/src/services/company.service";

const COMPANY_PAGE_LIMIT = 10;

const page = (): JSX.Element => {
  const [err, setErr] = useState<string[] | string>("");
  const [statusErr, setStatusErr] = useState<string | string[]>("");
  const [passErr, setPassErr] = useState<string | string[]>("");
  const [userData, setUserData] = useState<User | null>(null);
  const [roleData, setRoleData] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPassLoading, setIsPassLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  const [companyData, setCompanyData] = useState<Company[]>([]);
  const [companyLoading, setCompanyLoading] = useState<boolean>(false);
  const [companyPage, setCompanyPage] = useState<number>(1);
  const [companyHasMore, setCompanyHasMore] = useState<boolean>(true);

  

  const [statusData, setStatusData] = useState<UserStatusPayload>({
    status: "",
  });

  const [passwordData, setPasswordData] =
    useState<UserPasswordUpdatedByAdminPayload>({
      password: "",
      confirmPassword: "",
    });
  const [formData, setFormData] = useState<UserUpdatePayload>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    userRole: [],
    companyId: "",
  });

  const params: ParamValue = useParams().id;
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  const getCompanyData = useCallback(
    async (page: number) => {
      if (companyLoading || !companyHasMore) return;
      setCompanyLoading(true);
      try {
        const result = await CompanyService.getAll({
          page,
          limit: COMPANY_PAGE_LIMIT,
        });
        if (result.status === 200) {
          const incoming: Company[] = result.data.data.data;
          const totalPages: number = result.data.data.totalPages;
          setCompanyData((prev) =>
            page === 1 ? incoming : [...prev, ...incoming]
          );
          setCompanyHasMore(page < totalPages);
        }
      } catch (error) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        if (axios.isAxiosError(error)) {
          setErr(extractErrorMessages(error));
        } else {
          setErr(["Something went wrong"]);
        }
      } finally {
        setCompanyLoading(false);
      }
    },
    [companyLoading, companyHasMore]
  );

  const handleCompanyScrollEnd = useCallback(() => {
    if (!companyHasMore || companyLoading) return;
    const next = companyPage + 1;
    setCompanyPage(next);
    if(auth.isAdmin){
      getCompanyData(next);
    }
    
  }, [companyHasMore, companyLoading, companyPage, getCompanyData]);

  const getRoleData = async () => {
    try {
      const result = await RoleService.getRolesWithoutPagination();
      if (result.status === 200) setRoleData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      // if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      // else setErr(["Something went wrong"]);
    }
  };

   const checks:passwordCheck[]=[
          {label:'At least 8 characters',
            valid: passwordData.password.length>=8,
          },
          {
            label:'At least One uppercase letter',
            valid: /[A-Z]/.test(passwordData.password),
    
          },
           {
            label:'At least One lowercase letter',
            valid:/[a-z]/.test(passwordData.password),
    
          },
           {
            label:'At least One number',
            valid:/[0-9]/.test(passwordData.password),
    
          },
           {
            label:'At least One special character',
            valid: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.password),
    
          },
        ]

  const user = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await AuthService.getUserById(params);
      if (result.status === 200) {
        const resultData = result.data.data;
        setUserData(resultData);
        setFormData({
          firstName: resultData?.firstName ?? "",
          lastName: resultData?.lastName ?? "",
          email: resultData?.email ?? "",
          phone: resultData?.phone ?? "",
          userRole: resultData?.userRole?.map((item: any) => item.id) ?? [],
          companyId: resultData?.companyId?._id ?? resultData?.companyId ?? "",
        });
        setStatusData({ status: resultData?.status ?? "" });
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    user();
    getRoleData();
    if(auth.isAdmin){

      getCompanyData(1);
    }
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStatusData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    if (formData.userRole.includes(roleId)) return;
    if (formData.userRole.length >= 1) {
      toast.info("Currently only one user role allowed");
      return;
    }
    setFormData((prev) => ({ ...prev, userRole: [...prev.userRole, roleId] }));
    e.target.value = "";
  };

  const handleRemoveRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      userRole: prev.userRole.filter((id) => id !== roleId),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const result = await AuthService.update(params, formData);
      if (result.status === 200) {
        toast.success(
          `${formData.firstName} ${formData.lastName} updated successfully`
        );
        setTimeout(() => router.push("/users"), 2000);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusLoading(true);
    setStatusErr("");
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure",
        text: `Are you sure to change ${formData.firstName} ${formData.lastName} status to ${statusData.status}?`,
        btnTxt: "Yes, Change",
      });
      if (confirm) {
        const result = await AuthService.updateStatus(params, statusData);
        if (result.status === 200) {
          toast.success(
            `${formData.firstName} ${formData.lastName} status updated to ${statusData.status.toUpperCase()} successfully`
          );
          setTimeout(() => router.push("/users"), 2000);
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setStatusErr(extractErrorMessages(error));
      else setStatusErr(["Something went wrong"]);
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPassErr("");
    setIsPassLoading(true);
    try {
      if (
        passwordData.password.trim() !== passwordData.confirmPassword.trim()
      ) {
        setPassErr(
          "Password and confirm password not matching, please check and try again"
        );
        return;
      }
      const confirm = await ConfirmPopup({
        title: "Are you sure",
        text: `Are you sure to update ${formData.firstName} ${formData.lastName} password`,
        btnTxt: "Yes, Update Password",
      });
      if (confirm) {
        const result = await AuthService.changePasswordByAdmin(
          params,
          passwordData
        );
        if (result.status === 200) {
          toast.success(
            `${formData.firstName} ${formData.lastName} password updated successfully`
          );
          setTimeout(() => router.push("/users"), 2000);
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setPassErr(extractErrorMessages(error));
      else setPassErr(["Something went wrong"]);
    } finally {
      setIsPassLoading(false);
    }
  };

  return (
    <div>
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
        handleStatus={handleStatus}
        handleStatusChange={handleStatusChange}
        statusData={statusData}
        statusErr={statusErr}
        statusLoading={statusLoading}
        passwordData={passwordData}
        handlePassChange={handlePassChange}
        handlePasswordSubmit={handlePasswordSubmit}
        passErr={passErr}
        isPassLoading={isPassLoading}
        isAdmin={auth.isAdmin}
        companyData={companyData}
        companyLoading={companyLoading}
        companyHasMore={companyHasMore}
        onCompanyScrollEnd={handleCompanyScrollEnd}
        checks={checks}
      />
    </div>
  );
};

export default page;