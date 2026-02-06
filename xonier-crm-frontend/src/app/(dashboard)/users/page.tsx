"use client";
import UserMonitor from "@/src/components/pages/users/UserMonitor";
import UsersTable from "@/src/components/pages/users/UsersTable";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import { RegisterPayload, User, UserRole } from "@/src/types";
import axios from "axios";
import React, { JSX, useState, useEffect, ChangeEvent, FormEvent } from "react";
import extractErrorMessages from "../../utils/error.utils";
import { AuthService } from "@/src/services/auth.service";
import { toast } from "react-toastify";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { RoleService } from "@/src/services/role.service";

const page = (): JSX.Element => {
  const [err, setErr] = useState<string[] | string>("");
  const [userData, setUserData] = useState<User[]>([]);
  const [roleData, setRoleData] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPages] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPage, setTotalPage] = useState<number>(1)
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
  const [formData, setFormData] = useState<RegisterPayload>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    userRole: [],
    company: "Xonier Technologies",
  });

  const user = async (): Promise<void> => {
    setIsLoading(true);
    try {
      let result = await AuthService.getAll({
        page: currentPage,
        limit: pageLimit,
      });
      if (result.status === 200) {
        const resultData = result.data.data;
        setUserData(resultData.data);
       
        setCurrentPages(resultData.page);
        setPageLimit(resultData.limit);
        setTotalPage(resultData.totalPages)
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

  const handleDelete = async (id: string): Promise<void> => {
    setErr("");
    try {
      const confirm = await ConfirmPopup({
        title: "Are your sure",
        text: "Are you sure to delete this user",
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        const result = await AuthService.softDelete(id);
        if (result.status === 200) {
          toast.success("User deleted successfully");
          await user();
        }
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
    }
  };

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

  useEffect(() => {
    getRoleData();
    user();
  }, [currentPage, pageLimit]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    if (formData.password !== formData.confirmPassword) {
      setErr("Password not matching please, try again later");
      setLoading(false);
      return;
    }
    try {
      const result = await AuthService.create(formData);

      if (result.status === 201) {
        toast.success(
          `${formData.firstName} ${formData.lastName} user create successfully`
        );
        setIsPopupShow(false);
        await user();
        
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          userRole: [],
          company: "xonier technologies",
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

  return (
    <div className={`ml-72 mt-16 p-6`}>
      <UserMonitor />
      <UsersTable
        currentPage={Number(currentPage)}
        pageLimit={Number(pageLimit)}
        userData={userData}
        handleDelete={handleDelete}
        isLoading={isLoading}
        isPopupShow={isPopupShow}
        setIsPopupShow={setIsPopupShow}
        formData={formData}
        roleData={roleData}
        handleChange={handleChange}
        handleUserRoleChange={handleUserRoleChange}
        handleRemoveRole={handleRemoveRole}
        handleSubmit={handleSubmit}
        err={err}
        loading={loading}
        setPageLimit={setPageLimit}
        totalPage={totalPage}
        setCurrentPages={setCurrentPages}
      />
    </div>
  );
};

export default page;
