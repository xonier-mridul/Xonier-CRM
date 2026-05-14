"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BiHome, BiUserCheck } from "react-icons/bi";
import { AiOutlineTeam } from "react-icons/ai";
import { IoChevronDown } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { HiOutlineAdjustments } from "react-icons/hi";
import { SlCalender } from "react-icons/sl";
import { TbNotes, TbMoneybag } from "react-icons/tb";
import { BsBarChart, BsBuildingGear } from "react-icons/bs";
import { MdEmail, MdOutlineHelpOutline, MdOutlineLogout } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import ConfirmPopup from "../ui/ConfirmPopup";
import { AuthService } from "@/src/services/auth.service";
import { logout } from "@/src/store/slices/authSlice";
import { toast } from "react-toastify";
import { RiLockPasswordLine } from "react-icons/ri";
import { TiGlobeOutline } from "react-icons/ti";
import { RootState } from "@/src/store";
import checkRole from "@/src/app/utils/roleCheck.utils";
import { FiUserCheck, FiUser } from "react-icons/fi";
import { GoTasklist } from "react-icons/go";
import { IoKeyOutline } from "react-icons/io5";
import { MdOutlineLeaderboard } from "react-icons/md";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import { FaRegUser ,FaTasks } from "react-icons/fa";
import { CiMail } from "react-icons/ci";
import { IoMailOutline } from "react-icons/io5";


const SideBar = () => {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { hasPermission } = usePermissions();

  const auth = useSelector((state: RootState) => state.auth);

  const router = useRouter();
  const USER_ID = auth.user?._id;

  const handleLogout = async (): Promise<void> => {
    try {

      let isConfirmed = await ConfirmPopup({ title: "Logout", text: "Are you want to logout", btnTxt: "Yes, Logout" });

      if (isConfirmed) {
        const isLogout = await AuthService.logout()
        if (isLogout) {
          dispatch(logout())
          router.push("/login")
          toast.success("Logout successfully")
        }
      }
    }
    catch (error) {
      toast.error("Logout Failed")
    }

  };

  useEffect(() => {
    if (pathname.startsWith("/teams") || pathname.startsWith("/users")) {
      setOpenMenu("team");
    }
    if (pathname.startsWith("/roles")) {
      setOpenMenu("team");
    }
    if (pathname.startsWith("/deleteduser")) {
      setOpenMenu("team");
    }

    if (pathname.startsWith("/enquiry")) {
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/leads")) {
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/deals")) {
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/quotations")) {
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/invoice")) {
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/prospects")) {
      setOpenMenu("prospects")
    }
    if (pathname.startsWith("/people") || pathname.startsWith("/prospects")) {
      setOpenMenu("prospects")
    }
    if (pathname.startsWith("/emailManagement/template") || pathname.startsWith("/emailManagement/outbox")) {
      setOpenMenu("emailManagement")
    }
    if (pathname.startsWith("/message") || pathname.startsWith("/telephone")) {
      setOpenMenu("communication")
    }
    if (pathname.startsWith("/task")) {
      setOpenMenu("task")
    }
    if (pathname.startsWith("/category")) {
      setOpenMenu("task")
    }
    if (pathname.startsWith("/status")) {
      setOpenMenu("task")
    }
    if (pathname.startsWith("/reports") || pathname.startsWith("/report/create")) {
      setOpenMenu("task")
    }
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const isActive = (path: string) => pathname.startsWith(path);

  
  const isMenuActive = (menu: string) => {
    switch (menu) {
      case "team":
        return pathname.startsWith("/teams") ||
          pathname.startsWith("/users") ||
          pathname.startsWith("/roles")|| pathname.startsWith("/deleteduser");
      case "sales":
        return pathname.startsWith("/enquiry") ||
          pathname.startsWith("/leads") ||
          pathname.startsWith("/deals") ||
          pathname.startsWith("/quotations") ||
          pathname.startsWith("/invoice");
      case "prospects":
        return pathname.startsWith("/prospects");
      case "emailManagement":
        return pathname.startsWith("/templates") || pathname.startsWith("/emailManagement") || pathname.startsWith("/outbox");
      case "communication":
        return pathname.startsWith("/message") || pathname.startsWith("/telephone");
      case "task":
        return pathname.startsWith("/task")|| pathname.startsWith("/category") || pathname.startsWith("/status")|| pathname.startsWith("/reports") || pathname.startsWith("/report/create");
      default:
        return false;
    }
  };

  return (
    <div className={`fixed top-0 left-0 w-72 p-6 bg-slate-50 h-screen dark:bg-gray-800 flex flex-col gap-6 border-r border-slate-900/15 dark:border-gray-700 `}>
      <div className="h-[89vh] overflow-y-scroll flex flex-col gap-6">
        <Link href={"/"}>
          <Image
            src="/images/trakeroo.png"
            height={200}
            width={220}
            alt="xonier logo"
            className="w-46 dark:hidden"
          />
          <Image
            src="/images/trakeroo-light.png"
            height={200}
            width={220}
            alt="xonier logo"
            className="w-46 hidden dark:block "
          />
        </Link>

        <div className="flex flex-col gap-3 ">
          <h2 className="uppercase text-xs text-gray-500 dark:text-gray-400 pl-3">
            Home
          </h2>

          <ul className="flex flex-col gap-1 ">
            <li>
              <Link
                href="/dashboard"
                className={`${isActive("/dashboard")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <BiHome className="text-lg" />
                Dashboard
              </Link>
            </li>
            {hasPermission(PERMISSIONS.readSalesDashbord) && (
              <li>
                <Link
                  href="/sales-dashboard"
                  className={`${isActive("/sales-dashboard")
                    ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                    : "border-l-2 border-transparent"
                    } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
                >
                  <MdOutlineLeaderboard className="text-lg" />
                  Sales Dashboard
                </Link>
              </li>
            )}
            {hasPermission(PERMISSIONS.readEvent) && <li>
              <Link
                href="/calender"
                className={`${isActive("/calender")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <SlCalender className="text-lg" />
                Calender
              </Link>
            </li>}

            {hasPermission(PERMISSIONS.readProspects) && <li>
              <button
                onClick={() => toggleMenu("prospects")}
                className={`${isMenuActive("prospects")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  }
               flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <HiOutlineAdjustments className="text-lg" />
                  Prospects
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "prospects" ? "rotate-180" : ""
                    }`}
                />
              </button>
              <AnimatePresence>
                {openMenu === "prospects" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    {hasPermission(PERMISSIONS.readProspects) && <li>
                      <Link
                        href="/prospects/people"
                        className={`${isActive("/prospects/people")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        People
                      </Link>
                    </li>
                    }
                    {
                      hasPermission(PERMISSIONS.readProspects) && <li>
                        <Link
                          href="/prospects/company"
                          className={`${isActive("/prospects/company")
                            ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                        >
                          Company
                        </Link>
                      </li>
                    }

                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {hasPermission(PERMISSIONS.readNote) && <li>
              <Link
                href="/notes"
                className={`${isActive("/notes")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <TbNotes className="text-lg" />
                Notes
              </Link>
            </li>}

            {(auth.isAdmin) && <li>
              <button
                onClick={() => toggleMenu("plans")}
                className={`${isMenuActive("plans")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <FiUser className="text-lg" />
                  Plans and Subscriptions
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "plans" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === "plans" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    
                    { <li>
                      <Link
                        href="/plans"
                        className={`${isActive("/plans")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Plans
                      </Link>
                    </li>}
                    { <li>
                        <Link
                          href="/subscriptions"
                          className={`${isActive("/subscriptions")
                            ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                        >
                          Subscriptions
                          </Link>
                      </li>
                    }
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

            {(auth.isAdmin) && <li>
              <button
                onClick={() => toggleMenu("company")}
                className={`${isMenuActive("company")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <BsBuildingGear className="text-lg" />
                  Company Management
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "company" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === "company" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    
                    { <li>
                      <Link
                        href="/companies"
                        className={`${isActive("/companies")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Companies
                      </Link>
                    </li>}
                    { <li>
                      <Link
                        href="/companies/create"
                        className={`${isActive("/companies/create")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Create Companies
                      </Link>
                    </li>}
                    
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

          
            {
              ((hasPermission(PERMISSIONS.readTask)) || hasPermission(PERMISSIONS.taskCategoryRead) || hasPermission(PERMISSIONS.taskStatusRead)) && <li>
                 <button
                onClick={() => toggleMenu("task")}
                className={`${isMenuActive("task")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <GoTasklist  className="text-lg" />
                  Task Management
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "task" ? "rotate-180" : ""
                    }`}
                />
              </button>
              <AnimatePresence>
                {openMenu === "task" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    {hasPermission(PERMISSIONS.readTask) && <li>
                      <Link
                        href="/task"
                        className={`${isActive("/task")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Tasks
                      </Link>
                    </li>}
                    
                    {hasPermission(PERMISSIONS.taskCategoryRead) && <li>
                      <Link
                        href="/category"
                        className={`${isActive("/category")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Task Category
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.taskStatusRead) && <li>
                      <Link
                        href="/status"
                        className={`${isActive("/status")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Task Status
                      </Link>
                    </li>}
                    {
                      hasPermission(PERMISSIONS.readTaskReport) && <li>
                        <Link
                          href="/reports"
                          className={`${isActive("/reports")
                            ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                        >
                          Task Reports
                        </Link>
                      </li>
                    }
                    {
                      hasPermission(PERMISSIONS.createTaskReport) && <li>
                        <Link
                          href={`/report/create/${USER_ID||"new"}`}
                          className={`${isActive(`/report/create/${USER_ID||"new"}`)
                            ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                        >
                          Today's Task
                        </Link>
                      </li>
                    }
                  </motion.ul>
                )}
              </AnimatePresence>
              </li>
            }

            {(hasPermission(PERMISSIONS.readUser) || hasPermission(PERMISSIONS.deletedUserView)) && <li>
              <button
                onClick={() => toggleMenu("user")}
                className={`${isMenuActive("user")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <FiUser className="text-lg" />
                  User Management
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "user" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === "user" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    
                    {hasPermission(PERMISSIONS.readUser) && <li>
                      <Link
                        href="/users"
                        className={`${isActive("/users")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Users
                      </Link>
                    </li>}
                    {
                      hasPermission(PERMISSIONS.deletedUserView) && <li>
                        <Link
                          href="/deleteduser"
                          className={`${isActive("/deleteduser")
                            ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                        >
                          Deleted Users
                          </Link>
                      </li>
                    }
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {(hasPermission(PERMISSIONS.readRole) || hasPermission(PERMISSIONS.createTeam) || hasPermission(PERMISSIONS.readTeamCategory) || hasPermission(PERMISSIONS.readTeam)) && <li>
              <button
                onClick={() => toggleMenu("team")}
                className={`${isMenuActive("team")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <AiOutlineTeam className="text-lg" />
                  Team Management
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "team" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === "team" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    {hasPermission(PERMISSIONS.readRole) && <li>
                      <Link
                        href="/roles"
                        className={`${isActive("/roles")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Roles
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readTeamCategory) && <li>
                      <Link
                        href="/teams/categories"
                        className={`${isActive("/teams/categories")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Teams Categories
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readTeam) && <li>
                      <Link
                        href="/teams"
                        className={`${(isActive("/teams") && !isActive("/teams/categories"))
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Teams
                      </Link>
                    </li>}
                    
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

            {( hasPermission(PERMISSIONS.readEnquiry) || hasPermission(PERMISSIONS.readLead) || hasPermission(PERMISSIONS.readDeal) || hasPermission(PERMISSIONS.readQuote) || hasPermission(PERMISSIONS.readInvoice)) && <li>
              <button
                onClick={() => toggleMenu("sales")}
                className={`${isMenuActive("sales")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <BsBarChart className="text-lg" />
                  Sales
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "sales" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === "sales" && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                  {hasPermission(PERMISSIONS.readEnquiry) && <li>
                      <Link
                        href="/enquiry"
                        className={`${isActive("/enquiry")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Enquiry
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readLead) && <li>
                      <Link
                        href="/leads"
                        className={`${isActive("/leads")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Leads
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readDeal) && <li>
                      <Link
                        href="/deals"
                        className={`${isActive("/deals")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Deals
                      </Link>
                    </li>}

                    {hasPermission(PERMISSIONS.readQuote) && <li>
                      <Link
                        href="/quotations"
                        className={`${isActive("/quotations")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Quotations
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readInvoice) && <li>
                      <Link
                        href="/invoice"
                        className={`${isActive("/invoice")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Invoice
                      </Link>
                    </li>}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {hasPermission(PERMISSIONS.readClient) && <li>
              <Link
                href="/clients"
                className={`${isActive("/clients")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <FiUserCheck className="text-lg" />
                Clients
              </Link>
            </li>}

            {((hasPermission(PERMISSIONS.telephone))|| hasPermission(PERMISSIONS.smsReadLog) )&& <li>
              <button
                onClick={() => toggleMenu("communication")}
                className={`${isMenuActive("communication")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <AiOutlineTeam className="text-lg" />
                  Communication
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "communication" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {(openMenu === "communication") && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    {hasPermission(PERMISSIONS.telephone)  && <li>
                      <Link
                        href="/telephone"
                        className={`${isActive("/telephone")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Telephones Numbers
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.smsReadLog) && <li>
                      <Link
                        href="/message"
                        className={`${isActive("/message")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Messages
                      </Link>
                    </li>}


                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {(hasPermission(PERMISSIONS.readTemplate) || hasPermission(PERMISSIONS.createTemplate) || hasPermission(PERMISSIONS.readEmailLog)) && <li>
              <button
                onClick={() => toggleMenu("emailManagement")}
                className={`${isMenuActive("emailManagement")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <IoMailOutline className="text-lg" />
                  Email Management
                </span>

                <IoChevronDown
                  className={`transition-transform ${openMenu === "emailManagement" ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {(openMenu === "emailManagement" && (hasPermission(PERMISSIONS.readTemplate) || hasPermission(PERMISSIONS.createTemplate))) && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-8 mt-1 flex flex-col gap-1 overflow-hidden"
                  >
                    {(hasPermission(PERMISSIONS.readTemplate)|| hasPermission(PERMISSIONS.createTemplate)) && <li>
                      <Link
                        href="/emailManagement/templates"
                        className={`${isActive("/emailManagement/templates")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Templates
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readEmailLog) && <li>
                      <Link
                        href="/emailManagement/outbox"
                        className={`${isActive("/emailManagement/outbox")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                      >
                        Outbox
                      </Link>
                    </li>}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {
              hasPermission(PERMISSIONS.readOTP) && <li>
                
                <Link
                  href="/otp"
                  className={`${isActive("/otp")
                    ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                    : "border-l-2 border-transparent"
                    } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                >
                  <span className="flex items-center gap-3">

                  <IoKeyOutline className="text-lg" />
                  OTP
                  </span>
                </Link>
              </li>
            }
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="uppercase text-xs text-gray-500 dark:text-gray-400 pl-3">
            Auth
          </h2>
          <ul className="flex flex-col gap-1 w-full">
            <li>
              <button
                onClick={() => handleLogout()}
                className={`w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all border-l-2 border-transparent`}
              >
                <MdOutlineLogout className="text-lg" />
                Logout
              </button>
            </li>
            <li>
              <Link
                href={`/users/${auth.user?._id}`}
                className={`${isActive("/reset-password")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all capitalize`}
              >
                <FaRegUser className="text-lg" />
                Profile
              </Link>
            </li>
            <li>
              <Link
                href={"/reset-password"}
                className={`${isActive("/reset-password")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
                  } w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all capitalize`}
              >
                <RiLockPasswordLine className="text-lg" />
                Reset password
              </Link>
            </li>

          </ul>
        </div>
      </div>
    </div>
  );
};

export default SideBar;