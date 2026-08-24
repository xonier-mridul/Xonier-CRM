"use client";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, FormEvent ,useRef, useMemo} from "react";
import { IoIosSearch } from "react-icons/io";
import { FiCheck, FiChevronDown, FiSearch, FiUserPlus } from "react-icons/fi";
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
import { useTranslation } from "react-i18next";
import Pagination from "@/src/components/common/pagination";


const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [teamData, setTeamData] = useState<Team[]>([]);
  const [categoryData, setCategoryData] = useState<TeamCategory[]>([]);
  const [userData, setUserData] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [search, setSearch] = useState<string>("");
 const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
 const [isUserOpen, setIsUserOpen] = useState<boolean>(false);
 const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
const [searchCategory, setSearchCategory] = useState<string>("");
const [searchUser, setSearchUser] = useState<string>("");
const [searchManager, setSearchManager] = useState<string>("");

const categoryDropdownRef = useRef<HTMLDivElement>(null);
const userDropdownRef = useRef<HTMLDivElement>(null);
const managerDropdownRef = useRef<HTMLDivElement>(null);
const managerRef = useRef<HTMLTableCellElement | null >(null);
const [expandedManager, setExpandedManager] = useState<string | null>(null);
const [expandedMember, setExpandedMember] = useState<string | null>(null);

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
        search: search
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
      
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(messages);
        
      } else {
        setErr(["Something went wrong"]);
      }
    }
  };

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;

    if (
      categoryDropdownRef.current &&
      !categoryDropdownRef.current.contains(target)
    ) {
      setIsCategoryOpen(false);
    }

    if (
      userDropdownRef.current &&
      !userDropdownRef.current.contains(target)
    ) {
      setIsUserOpen(false);
    }

    if (
      managerDropdownRef.current &&
      !managerDropdownRef.current.contains(target)
    ) {
      setIsManagerOpen(false);
    }

    // Manager table cell
    const managerCell = (event.target as HTMLElement).closest(
      "[data-manager-cell]"
    );

    if (!managerCell) {
      setExpandedManager(null);
    }

    const memberCell = (event.target as HTMLElement).closest("[data-member-cell]");

    if (!memberCell) {
      setExpandedMember(null);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      getTeamData();
    }, 500);
    
  }, [search]);

  const filteredCategories = useMemo(() => {
  return categoryData.filter((item) =>
    item.name.toLowerCase().includes(searchCategory.toLowerCase())
  );
}, [categoryData, searchCategory]);

const filteredUsers = useMemo(() => {
  return userData.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.userRole
      .map((role) => role.name)
      .join(" ")}`
      .toLowerCase()
      .includes(searchUser.toLowerCase())
  );
}, [userData, searchUser]);

const filteredManager = useMemo(() => {
  return userData.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.userRole
      .map((role) => role.name)
      .join(" ")}`
      .toLowerCase()
      .includes(searchUser.toLowerCase())
  );
}, [userData, searchManager]);

  useEffect(() => {
    
    getUserData();
    getTeamData();
  }, [currentPage, pageLimit]);

  useEffect(() => {
    if(hasPermission(PERMISSIONS.createTeam)){
getCategoryData();
    }

  }, [])




  

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
    console.log(" form data is :",formData)
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
              <h2 className="text-xl font-bold dark:text-white">{t("create_team")}</h2>
              <button onClick={() => setIsPopupShow(false)}>
                <FaXmark className="text-xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <Input
                label={t("team_name")}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("enter_team_name")}
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm  font-medium flex gap-2 text-gray-700 dark:text-gray-200">
                  {t("category")} <span className="text-red-500 text-xl">*</span>
                </label>


                <div className="relative w-full" ref={categoryDropdownRef}>

                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  
                    className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                  >
                    <span>
                      {formData.category
                        ? categoryData.find((c) => c.id === formData.category)?.name
                        : t("select_category")}
                    </span>

                    <FiChevronDown
                      className={`transition-transform ${
                        isCategoryOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute left-0 mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50">
                    
                      <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                        <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />

                        <input
                          type="text"
                          placeholder={t("search_category")}
                          value={searchCategory}
                          onChange={(e) => setSearchCategory(e.target.value)}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent py-2 pl-10 pr-3 text-sm outline-none"
                        />
                      </div>

                    
                      <div className="max-h-60 overflow-y-auto ">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  category: category.id,
                                }));

                                setIsCategoryOpen(false);
                                setSearchCategory("");
                              }}
                              className="flex w-full items-center my-2 justify-between capitalize px-4 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-gray-700"
                            >
                              <span>{category.name}</span>

                              {formData.category === category.id && (
                                <FiCheck className="text-cyan-600" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {t("no_category_found")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

               <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("add_manager")}
                </label>

                  <div className="relative w-full" ref={managerDropdownRef}>
                    
                      <button
                        type="button"
                        onClick={() => setIsManagerOpen(!isManagerOpen)}
                        className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                      >
                        <span>{t("select_manager")}</span>

                        <FiChevronDown
                          className={`transition-transform ${
                            isManagerOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isManagerOpen && (
                        <div className="absolute left-0 right-0 mt-2 rounded-lg border border-slate-200 bg-white dark:bg-gray-800 shadow-lg z-50">

                        
                          <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />

                            <input
                              value={searchManager}
                              onChange={(e) => setSearchManager(e.target.value)}
                              placeholder={t("search_user")}
                              className="w-full border border-slate-200 rounded-md py-2 pl-10 pr-3 text-sm bg-transparent outline-none"
                            />
                          </div>

                          {/* Users */}
                          <div className="max-h-60 overflow-y-auto mt-2">
                            {filteredManager.length ? (
                              filteredManager.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                  
                                    setSearchManager("");
                                    setIsManagerOpen(false);
                                    handleAddManager(user.id);
                                  }}
                                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-cyan-50 dark:hover:bg-gray-700"
                                >
                                  <div>
                                    <p className="font-medium capitalize">
                                      {user.firstName} {user.lastName}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      {user.userRole.map((role) => role.name).join(", ")}
                                    </p>
                                  </div>

                                  <FiCheck className="opacity-0 group-hover:opacity-100" />
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-slate-500 text-sm">
                                {t("no_user_found")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.manager.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.manager.map((managerId) => {
                          const user = userData.find((u) => u.id === managerId);
                          if (!user) return null;

                          return (
                            <span
                              key={managerId}
                              className="flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm"
                            >
                              {user.firstName} {user.lastName}

                              <button
                                type="button"
                                onClick={() => handleRemoveManager(managerId)}
                              >
                                <FaXmark />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                 {/* <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddManager(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-white dark:bg-gray-600 px-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-300/30 capitalize"
                >
                  <option value="">Select user</option>
                  {userData.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName} ${user.lastName} (${user.userRole.map((item) => item.name)})`}
                    </option>
                  ))}
                </select> 

            */}
              </div> 

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("add_members")}
                </label>

                {/* <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddMember(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-white dark:bg-gray-600 px-3 py-2.5 rounded-md border capitalize border-gray-300 dark:border-gray-300/30"
                >
                  <option value="">Select user</option>
                  {userData.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName} ${user.lastName} (${user.userRole.map((item) => item.name)})`}
                    </option>
                  ))}
                </select> */}
                <div className="relative w-full" ref={userDropdownRef}>
                    
                      <button
                        type="button"
                        onClick={() => setIsUserOpen(!isUserOpen)}
                        className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                      >
                        <span>{t("select_user_2")}</span>

                        <FiChevronDown
                          className={`transition-transform ${
                            isUserOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isUserOpen && (
                        <div className="absolute left-0 right-0 mt-2 rounded-lg border border-slate-200 bg-white dark:bg-gray-800 shadow-lg z-50">

                          {/* Search */}
                          <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />

                            <input
                              value={searchUser}
                              onChange={(e) => setSearchUser(e.target.value)}
                              placeholder={t("search_user")}
                              className="w-full border border-slate-200 rounded-md py-2 pl-10 pr-3 text-sm bg-transparent outline-none"
                            />
                          </div>

                          {/* Users */}
                          <div className="max-h-60 overflow-y-auto mt-2">
                            {filteredUsers.length ? (
                              filteredUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    handleAddMember(user.id);
                                    setSearchUser("");
                                    setIsUserOpen(false);
                                  }}
                                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-cyan-50 dark:hover:bg-gray-700"
                                >
                                  <div>
                                    <p className="font-medium capitalize">
                                      {user.firstName} {user.lastName}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      {user.userRole.map((role) => role.name).join(", ")}
                                    </p>
                                  </div>

                                  <FiCheck className="opacity-0 group-hover:opacity-100" />
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-sm text-gray-500">
                                {t("no_user_found")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.members.map((memberId) => {
                          const user = userData.find((u) => u.id === memberId);
                          if (!user) return null;

                          return (
                            <span
                              key={memberId}
                              className="flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm"
                            >
                              {user.firstName} {user.lastName}

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(memberId)}
                              >
                                <FaXmark />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
              
              </div> 

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("description_2")}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t("team_description")}
                  className="w-full rounded-md border px-3 py-2.5 border-gray-300 dark:border-gray-300/30 text-sm
                 bg-white dark:bg-gray-600 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPopupShow(false)}
                  className="px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-100"
                >
                  {t("cancel")}
                </button>

                <FormButton
                  isLoading={isLoading}
                  disabled={ 
                    formData.category==="" ||
                    formData.name === "" || formData.members.length <= 0
                  }
                >
                  {" "}
                  {t("submit")}{" "}
                </FormButton>
              </div>
            </form>
          </div>
        </>
      )}

      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
          <div className="flex items-center gap-12 justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
                {t("all_teams")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t("create_edit_or_remove_teams")}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 outline-none text-slate-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">50</option>
              </select>
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 gap-1.5 rounded-lg border-[1px] text-slate-500 border-slate-900/10 flex items-center">
                <IoIosSearch className="text-xl" />
                <input type="text" placeholder={t("search_by_name")}  onChange={(e)=>{setSearch(e.target.value)}} className="border-none bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white w-full"/>
              </div>
              {hasPermission(PERMISSIONS.createTeam) ? (
                <button
                  onClick={() => setIsPopupShow(true)}
                  className="bg-cyan-600 hover:bg-cyan-700
                                    text-white px-5 py-2 rounded-md
                                    flex items-center gap-2 cursor-pointer"
                >
                  <FiUserPlus /> {t("create_team")}
                </button>
              ) : (
                <span
                  className="bg-cyan-400 opacity-89 cursor-not-allowed
                                    text-white px-5 py-2 rounded-md
                                    flex items-center gap-2"
                >
                  <FiUserPlus /> {t("create_team")}
                </span>
              )}
            </div>
          </div>
          {err && <ErrorComponent error={err} />}
          {showSuccess && <SuccessComponent message={showSuccess} />}
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full  border-b-2 border-zinc-300 dark:border-zinc-400  bg-slate-200 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 font-semibold tracking-wide">
                  {t("manager")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300 font-semibold tracking-wide">
                  {" "}
                  {t("team")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 font-semibold tracking-wide">
                  {t("members")}
                </th>
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300 font-semibold tracking-wide">
                  Created By
                </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300 font-semibold tracking-wide">
                  {t("status")}
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300 font-semibold tracking-wide">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ? (
                teamData && teamData?.length > 0 ? (
                  teamData?.map((item, index) => {
                    const rr = index % 2 == 0;

                
                    return (
                      <tr key={index}
                        className={`${
                          rr
                            ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"
                        } w-full`}
                      >
                       <td
                            data-manager-cell
                          className={`p-4 flex gap-1 max-w-60 flex-wrap relative cursor-pointer`}
                          onClick={() =>
                            setExpandedManager((prev) =>
                              prev === item.id ? null : item.id
                            )
                          }
                        >
                          {(expandedManager === item.id
                            ? item?.manager
                            : item?.manager?.slice(0, 3)
                          )?.map((manager, index) => (
                            <Link
                              href={`/users/${manager.id}`}
                              key={manager.id ?? index}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-cyan-500 hover:bg-cyan-600 hover:scale-105
                                        dark:bg-cyan-500 text-white border border-cyan-200
                                        text-[13px] px-2 py-1.5 rounded-full text-nowrap
                                        capitalize z-30"
                            >
                              {manager.firstName} {manager.lastName}
                            </Link>
                          ))}

                          {item?.manager?.length > 3 && expandedManager !== item.id && (
                            <>
                            <span className="flex items-end">...</span>
                            <span className="  text-gray-700
                                            dark:text-gray-200 text-[13px] flex items-end  
                                            ">
                              +{item.manager.length - 3} more
                            </span>
                            </>
                          )}
                        </td>


                        <td className="p-4">
                          <div className="flex gap-2 flex-wrap text-slate-400">
                            {item.name}
                          </div>
                        </td>

                      <td
  data-member-cell
  onClick={() => {
    setExpandedMember((prev) =>
      prev === item.id ? null : item.id
    );
  }}
  className="p-4 flex gap-1 max-w-60 flex-wrap relative cursor-pointer"
>
  {(expandedMember === item.id
    ? item?.members
    : item?.members?.slice(0, 3)
  )?.map((member, index) => (
    <Link
      href={`/users/${member.id}`}
      key={member.id ?? index}
      onClick={(e) => e.stopPropagation()}
      className="bg-cyan-500 hover:bg-cyan-600
                 hover:scale-105 dark:bg-cyan-500
                 text-white border border-cyan-200
                 text-[13px] px-4 py-1.5 rounded-full
                 text-nowrap capitalize"
    >
      {member.firstName} {member.lastName}
    </Link>
  ))}

  {item?.members?.length > 3 &&
    expandedMember !== item.id && (
      <>
        <span>...</span>

        <span className="text-gray-700 dark:text-gray-200">
          +{item.members.length - 3} more
        </span>
      </>
    )}
</td>
                        {/* <td className="p-4">
                          {" "}
                          <span className="bg-cyan-500 text-white px-3 py-1 rounded-full text-[14px]">
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
                      {t("user_data_not_found")}
                    </td>
                  </tr>
                )
              ) : (
                Array.from({length: 8}).map((_, i)=>(
                  <tr key={i} className="animate-pulse">
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

                ))
              )}
            </tbody>
          </table>
          <div className="px-6 pb-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
        </div>
          
      </div>
    </>
  );
};

export default page;
