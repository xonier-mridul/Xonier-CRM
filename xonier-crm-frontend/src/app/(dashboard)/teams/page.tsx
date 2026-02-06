"use client";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, FormEvent } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiUserPlus } from "react-icons/fi";
import { usePermissions } from "@/src/hooks/usePermissions";
import {
  Team,
  TeamCategory,
  TeamCreatePayload,
} from "@/src/types/team/team.types";
import { LuCrown } from "react-icons/lu";
import { PERMISSIONS } from "@/src/constants/enum";
import axios from "axios";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import { TeamService } from "@/src/services/team.service";
import Link from "next/link";
import { GoDotFill } from "react-icons/go";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import SuccessComponent from "@/src/components/ui/SuccessComponent";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { FaPlus, FaXmark } from "react-icons/fa6";
import Input from "@/src/components/ui/Input";
import { User } from "@/src/types";
import { AuthService } from "@/src/services/auth.service";
import FormButton from "@/src/components/ui/FormButton";
import { TeamCategoryService } from "@/src/services/teamCategory.service";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import Skeleton from "react-loading-skeleton";
import { tr } from "framer-motion/client";

const page = (): JSX.Element => {
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [teamData, setTeamData] = useState<Team[]>([]);
  const [categoryData, setCategoryData] = useState<TeamCategory[]>([]);
  const [userData, setUserData] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [formData, setFormData] = useState<TeamCreatePayload>({
    name: "",
    description: "",
    category: "",
    manager: [],
    members: [],
  });
  const [showSuccess, setShowSuccess] = useState<string>("");

  const { hasPermission } = usePermissions();

  const getTeamData = async () => {
    setIsLoading(true);
    try {
      const result = await TeamService.getAll({
        page: currentPage,
        limit: pageLimit,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setTeamData(data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        setTotalPages(Number(data.totalPages));
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

  const getUserData = async () => {
    try {
      const response = await AuthService.getAllActiveWithoutPagination();
      if (response.status === 200) {
        setUserData(response.data.data);
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

  const getCategoryData = async () => {
    try {
      const response = await TeamCategoryService.getAllWithoutPagination();
      if (response.status === 200) {
        setCategoryData(response.data.data);
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

  useEffect(() => {
    getCategoryData();
    getUserData();
    getTeamData();
  }, [currentPage, pageLimit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMember = (userId: string) => {
    setFormData((prev) => {
      if (prev.members.includes(userId)) return prev;
      return { ...prev, members: [...prev.members, userId] };
    });
  };

  const handleAddManager = (userId: string) => {
    setFormData((prev) => {
      if (prev.members.includes(userId)) return prev;
      return { ...prev, manager: [...prev.manager, userId] };
    });
  };

  const handleRemoveMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((id) => id !== userId),
    }));
  };

   const handleRemoveManager = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      manager: prev.manager.filter((id) => id !== userId),
    }));
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      if (!id) {
        return setErr("Team ID not found ");
      }

      const confirm = await ConfirmPopup({
        title: "Are you sure",
        text: `Are you want to delete "${name}" team`,
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        const result = await TeamService.delete(id);

        if (result.status === 200) {
          const ee = teamData.filter((item) => item.id !== id);

          setTeamData(ee);

          toast.success("Team deleted successfully");
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await TeamService.create(formData);

      if (result.status === 201) {
        toast.success(`${formData.name} team created successfully`);
        setShowSuccess("Team created successfully");
        setTimeout(() => {
          setShowSuccess("");
        }, 3000);
        setFormData({
          name: "",
          category: "",
          description: "",
          manager: [],
          members: [],
        });
        await getTeamData();
        setErr("");
        setIsPopupShow(false);
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
  return (
    <>
      {isPopupShow && (
        <>
          {" "}
          <BlurryBackground onClick={() => setIsPopupShow(false)} />{" "}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                bg-white dark:bg-gray-700 p-6 rounded-xl w-[650px] z-[200]
                flex flex-col gap-5 shadow-xl"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Create Team</h2>
              <button onClick={() => setIsPopupShow(false)}>
                <FaXmark className="text-xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <Input
                label="Team Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter team name"
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Category
                </label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  required
                  className="bg-white dark:bg-gray-600 px-3 py-2 rounded-md border
               text-sm"
                >
                  <option value="">Select category</option>

                  {categoryData.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

               <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Add Manager
                </label>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddManager(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-white dark:bg-gray-600 px-3 py-2 rounded-md border capitalize"
                >
                  <option value="">Select user</option>
                  {userData.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName} ${user.lastName} (${user.userRole.map((item) => item.name)})`}
                    </option>
                  ))}
                </select>

                {formData.manager.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.manager.map((memberId) => {
                      const user = userData.find((u) => u.id === memberId);
                      if (!user) return null;

                      return (
                        <span
                          key={memberId}
                          className="flex items-center gap-1 bg-blue-100 text-blue-600 
                         px-3 py-1 rounded-full text-sm"
                        >
                          {user.firstName} {user.lastName} (
                          {user.userRole.map((item) => item.name)})
                          <button
                            type="button"
                            onClick={() => handleRemoveManager(memberId)}
                            className="hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                          >
                            <FaXmark size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Add Members
                </label>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddMember(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-white dark:bg-gray-600 px-3 py-2 rounded-md border capitalize"
                >
                  <option value="">Select user</option>
                  {userData.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName} ${user.lastName} (${user.userRole.map((item) => item.name)})`}
                    </option>
                  ))}
                </select>

                {formData.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.members.map((memberId) => {
                      const user = userData.find((u) => u.id === memberId);
                      if (!user) return null;

                      return (
                        <span
                          key={memberId}
                          className="flex items-center gap-1 bg-blue-100 text-blue-600 
                         px-3 py-1 rounded-full text-sm"
                        >
                          {user.firstName} {user.lastName} (
                          {user.userRole.map((item) => item.name)})
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(memberId)}
                            className="hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                          >
                            <FaXmark size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Team description..."
                  className="w-full rounded-md border px-3 py-2 text-sm
                 bg-white dark:bg-gray-600 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPopupShow(false)}
                  className="px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <FormButton
                  isLoading={isLoading}
                  disabled={
                    formData.name === "" || formData.members.length <= 0
                  }
                >
                  {" "}
                  Submit{" "}
                </FormButton>
              </div>
            </form>
          </div>{" "}
        </>
      )}

      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
          <div className="flex items-center gap-12 justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
                All Teams
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove teams.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">50</option>
              </select>
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 gap-1.5 rounded-lg border-[1px] border-slate-900/10 flex items-center">
                <IoIosSearch className="text-xl" />
                <input type="text" placeholder="search by name..." />
              </div>
              {hasPermission(PERMISSIONS.createTeam) ? (
                <button
                  onClick={() => setIsPopupShow(true)}
                  className="bg-blue-600 hover:bg-blue-700
                                    text-white px-5 py-2 rounded-md
                                    flex items-center gap-2 cursor-pointer"
                >
                  <FiUserPlus /> Create Team
                </button>
              ) : (
                <span
                  className="bg-blue-400 opacity-89 cursor-not-allowed
                                    text-white px-5 py-2 rounded-md
                                    flex items-center gap-2"
                >
                  <FiUserPlus /> Create Team
                </span>
              )}
            </div>
          </div>
          {err && <ErrorComponent error={err} />}
          {showSuccess && <SuccessComponent message={showSuccess} />}
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Manager
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                  Team
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Members
                </th>
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Created By
                </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Status
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ? (
                teamData && teamData?.length > 0 ? (
                  teamData?.map((item, index) => {
                    let rr = index % 2 == 0;

                    let date = new Date(item.createdAt).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      },
                    );

                    return (
                      <tr
                        className={`${
                          rr
                            ? "bg-white dark:bg-transparent"
                            : "bg-blue-100/50 dark:bg-slate-500"
                        } w-full`}
                      >
                        <td className="p-4">{item?.manager?.map((item, index) => (
                              <Link
                                href={`/users/${item.id}`}
                                key={index}
                                className="bg-blue-500 hover:bg-blue-600 hover:scale-105 dark:bg-blue-500   text-white border border-blue-200 text-[13px] px-4 py-1.5 rounded-full text-nowrap capitalize"
                              >
                          
                               {item.firstName} {item.lastName}{" "}
                              </Link>
                            ))}</td>
                        <td className="p-4">
                          <Link
                            href={`/teams/categories/${item.id}`}
                            className="cursor-pointer hover:text-blue-500 capitalize"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="first-letter:uppercase p-4">
                          <div className="flex gap-2 flex-wrap">
                            {item?.members?.map((item, index) => (
                              <Link
                                href={`/users/${item.id}`}
                                key={index}
                                className="bg-blue-100 hover:bg-blue-200 hover:scale-105 dark:bg-blue-200   text-blue-700 border border-blue-200 text-[13px] px-3 py-1 rounded-full transition-all capitalize duration"
                              >
                                {" "}
                                {item.firstName} {item.lastName}{" "}
                              </Link>
                            ))}
                          </div>
                        </td>
                        {/* <td className="p-4">
                          {" "}
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[14px]">
                            {" "}
                            {item.createdBy.firstName}{" "}
                            {item.createdBy.lastName}{" "}
                          </span>
                        </td> */}
                        <td className="p-4">
                          <span
                            className={`${
                              item.isActive === true
                                ? "bg-green-100  text-green-600"
                                : "bg-orange-100 text-orange-500"
                            }  rounded-full text-sm font-medium py-1 px-3 flex items-center gap-1 w-fit  capitalize`}
                          >
                            {" "}
                            <GoDotFill />{" "}
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/teams/view/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                            >
                              <FaRegEye className="text-xl" />
                            </Link>
                            <Link
                              href={`/teams/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                            >
                              <MdOutlineEdit className="text-xl" />
                            </Link>
                            {
                              <button
                                onClick={() => handleDelete(item.id, item.name)}
                                disabled={
                                  !hasPermission(PERMISSIONS.deleteTeam)
                                }
                                className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:text-red-400"
                              >
                                {" "}
                                <MdDeleteOutline className="text-xl" />{" "}
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className=" text-center ">
                    <td colSpan={7} className="p-4">
                      User data not found
                    </td>
                  </tr>
                )
              ) : (
                <tr className="animate-pulse">
                  <td className="p-4">
                    <Skeleton height={30} width={50} className="w-full " />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} width={150} className="w-full " />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Skeleton
                        height={30}
                        width={100}
                        borderRadius={999}
                        className="w-full "
                      />
                      <Skeleton
                        height={30}
                        width={100}
                        borderRadius={999}
                        className="w-full "
                      />
                    </div>
                  </td>
                  {/* <td className="p-4">
                    <Skeleton
                      height={30}
                      width={120}
                      borderRadius={999}
                      className="w-full "
                    />
                  </td> */}
                  <td className="p-4">
                    <Skeleton
                      height={30}
                      width={100}
                      borderRadius={999}
                      className="w-full "
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Skeleton height={32} width={32} className="w-full " />
                      <Skeleton height={32} width={32} className="w-full " />
                      <Skeleton height={32} width={32} className="w-full " />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default page;
