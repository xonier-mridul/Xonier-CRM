"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BiHome, BiSupport, BiUserCheck } from "react-icons/bi";
import { AiOutlineTeam } from "react-icons/ai";
import { IoChevronDown, IoSettingsOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { HiOutlineAdjustments } from "react-icons/hi";
import { SlCalender } from "react-icons/sl";
import { TbNotes, TbMoneybag } from "react-icons/tb";
import { BsBarChart, BsBuildingGear } from "react-icons/bs";
import { MdEmail, MdKeyboardDoubleArrowRight, MdOutlineHelpOutline, MdOutlineLogout, MdOutlineNotificationsActive } from "react-icons/md";
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
import { FEATURES, PERMISSIONS } from "@/src/constants/enum";
import { FaRegUser ,FaTasks } from "react-icons/fa";
import { CiMail } from "react-icons/ci";
import { IoMailOutline } from "react-icons/io5";
import { useFeatures } from "@/src/hooks/useFeatures";
import { useTranslation } from "react-i18next";
import { GrUserSettings } from "react-icons/gr";
import { LuTicket } from "react-icons/lu";


const SideBar = () => {
  const pathname = usePathname();
  const {t} = useTranslation()

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeDashboard,setActiveDashboard] = useState<boolean >(false)

  const dispatch = useDispatch();

  const { hasPermission } = usePermissions();

  const { hasFeature} = useFeatures()

  const auth = useSelector((state: RootState) => state.auth);

  const router = useRouter();
  const USER_ID = auth.user?._id;


  const handleLogout = async (): Promise<void> => {
    try {

      const isConfirmed = await ConfirmPopup({ title: "Logout", text: "Are you want to logout", btnTxt: "Yes, Logout" });

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
    if (pathname.startsWith("/teams")) {
      setOpenMenu("team");
    }
    if (pathname.startsWith("/users") || pathname.startsWith("/deleteduser")) {
      setOpenMenu("user");
    }
    if (pathname.startsWith("/plans") || pathname.startsWith("/subscriptions")) {
      setOpenMenu("plans");
    }
    if (pathname.startsWith("/companies") || pathname.startsWith("/companies/create") || 
    pathname.startsWith("deletedCompanies"))  {
      setOpenMenu("company");
    }
    if (pathname.startsWith("/roles")) {
      setOpenMenu("user");
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
        return pathname.startsWith("/teams")
          
         
        case "plans":
          return pathname.startsWith("/plans") ||
          pathname.startsWith("/subscriptions")

        case "notifications":
          return pathname.startsWith("/notifications")

          case "company":
          return pathname.startsWith("/companies") ||
          pathname.startsWith("/companies/create") || 
    pathname.startsWith("deletedCompanies")

      case "sales":
        return pathname.startsWith("/enquiry") ||
          pathname.startsWith("/leads") ||
          pathname.startsWith("/deals") ||
          pathname.startsWith("/quotations") ||
          pathname.startsWith("/invoice");
      case "user": return pathname.startsWith("/users") || pathname.startsWith("/deleteduser") || pathname.startsWith("/roles");
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
  const handleClick =()=>{
    setActiveDashboard(!activeDashboard)
  }

console.log("new",auth.user);
console.log("second",auth.isAdmin);
const isCompanyAdmin = auth.user?.userRole?.some(
  (role) => role.code === "COMPANY_ADMIN"
);

  return (
    <div className={`fixed top-0 left-0 w-72 p-6 z-100  ${activeDashboard ?'translate-x-0':'-translate-x-70 lg:translate-x-0'}   transition-all duration-300 bg-slate-50 h-screen dark:bg-gray-800 flex flex-col gap-6 border border-slate-900/15 dark:border-gray-700 `}>
      <button className={`block lg:hidden absolute z-20 left-full top-50`} onClick={handleClick} >
        <span className={`w-10 rounded-tr-xl rounded-br-xl h-10 border dark:bg-gray-800 border-slate-900/15 dark:border-gray-700  bg-slate-50 text-slate-400 hover:text-slate-500  flex justify-center items-center`}><MdKeyboardDoubleArrowRight className={`text-2xl  ${activeDashboard ?'rotate-180':''} transition-all duration-300`} /></span></button>
      <div className="h-[89vh] overflow-y-scroll flex flex-col gap-6 custom-scrollbar">
        <Link href={"/"}>
          <Image
            src="/images/trakeroo.png"
            height={200}
            width={220}
            alt={t("xonier_logo")}
            className="w-46 dark:hidden"
          />
          <Image
            src="/images/trakeroo-light.png"
            height={200}
            width={220}
            alt={t("xonier_logo")}
            className="w-46 hidden dark:block "
          />
        </Link>

        <div className="flex flex-col gap-3 ">
          <h2 className="uppercase text-xs text-gray-500 dark:text-gray-400 pl-3">
            {t('home')}
          </h2>

          <ul className="flex flex-col gap-1 ">
            <li>
              <Link
                href="/dashboard"
                className={`${isActive("/dashboard")
                  ? " dark:text-cyan-300 text-cyan-700   border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
              <span  className={`${isActive("/dashboard")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <BiHome className="text-lg" />

              </span>
               {t("dashboard")}

              </Link>
            </li>
            {(hasPermission(PERMISSIONS.readSalesDashbord) && !auth.isAdmin )&& (
              <li>
                <Link
                  href="/sales-dashboard"
                  className={`${isActive("/sales-dashboard")
                    ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                    : "border-l-2 border-transparent"
                    } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
                >
                  <span  className={`${isActive("/sales-dashboard")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                  <MdOutlineLeaderboard className="text-lg" />

                  </span>
               {t("Sales Dashboard")}


                </Link>
              </li>
            )}
            {(hasPermission(PERMISSIONS.readEvent) && hasFeature(FEATURES.CALENDER)) &&
             <li>
              <Link
                href="/calender"
                className={`${isActive("/calender")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
              <span  className={`${isActive("/calender")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                
                <SlCalender className="text-lg" />
                </span>
               {t("calender")}

                
              </Link>
            </li>}

            {( hasPermission(PERMISSIONS.readProspects) && hasFeature(FEATURES.CRM) && !auth.isAdmin) &&
             <li>
              <button
                onClick={() => toggleMenu("prospects")}
                className={`${isMenuActive("prospects")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  }
               flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                   <span  className={`${isMenuActive("prospects")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                

                  <HiOutlineAdjustments className="text-lg" /></span>
                                 {t("prospects")}

                  
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
                    {(hasPermission(PERMISSIONS.readProspects)&& (hasFeature(FEATURES.CRM)) ) && <li>
                      <Link
                        href="/prospects/people"
                        className={`${isActive("/prospects/people")
                          ? "dark:text-cyan-300 text-cyan-700   border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                         {t("people")}

                        
                      </Link>
                    </li>
                    }
                    {
                      (hasPermission(PERMISSIONS.readProspects) && (hasFeature(FEATURES.CRM)) )&& <li>
                        <Link
                          href="/prospects/company"
                          className={`${isActive("/prospects/company")
                            ? "dark:text-cyan-300 text-cyan-700  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                        >
                         {t("company")}

                          
                        </Link>
                      </li>
                    }

                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            { (hasPermission(PERMISSIONS.readNote) && (hasFeature(FEATURES.NOTE))) && <li>
              <Link
                href="/notes"
                className={`${isActive("/notes")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                       <span  className={`${isActive("/notes")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <TbNotes className="text-lg" />
                </span>
                {t("notes")}
              </Link>
            </li>}
              {
             <li>
              <Link
                href="/notifications"
           
                className={`${isActive("/notifications")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
              <span  className={`${isActive("/notifications")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                
                <MdOutlineNotificationsActive className="text-lg" />
                </span>
                      {t("notifications")}
                
              </Link>
            </li>}
            
           

            {(auth.isAdmin) && <li>
              <button
                onClick={() => toggleMenu("plans")}
                className={`${isMenuActive("plans")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 px-3 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent px-4"
                  } flex w-full items-center justify-between  py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span  className={`${isMenuActive("plans")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                  
                  <FiUser className="text-lg" />
                  </span>
                  {t("plans_and_subscriptions")}
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
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("plans")}
                      </Link>
                    </li>}
                    { <li>
                        <Link
                          href="/subscriptions"
                          className={`${isActive("/subscriptions")
                            ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                        >
                          {t("subscriptions")}
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
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <span  className={`${isMenuActive("company")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>


                  <BsBuildingGear className="text-lg" /></span>
                  {t("company_management")}
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
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 px-3 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent px-4"
                          } block  py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("companies")}
                      </Link>
                    </li>}
                    { <li>
                      <Link
                        href="/companies/create"
                        className={`${isActive("/companies/create")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("create_companies")}
                      </Link>
                    </li>}
                    { <li>
                      <Link
                        href="/deletedCompanies"
                        className={`${isActive("/deletedCompanies")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("deleted_companies")}
                      </Link>
                    </li>}
                    
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

          
            {
              (((hasPermission(PERMISSIONS.readTask)) || hasPermission(PERMISSIONS.taskCategoryRead) || hasPermission(PERMISSIONS.taskStatusRead)) && (hasFeature(FEATURES.TASK)) && !auth.isAdmin) && <li>
                 <button
                onClick={() => toggleMenu("task")}
                className={`${isMenuActive("task")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <span  className={`${isMenuActive("task")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                    <GoTasklist  className="text-lg"/>
                  </span>
                  {t("task_management")}
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
                    {( hasPermission(PERMISSIONS.readTask) &&  (hasFeature(FEATURES.TASK)) ) && <li>
                      <Link
                        href="/task"
                        className={`${isActive("/task")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("tasks")}
                      </Link>
                    </li>}
                    
                    {(hasPermission(PERMISSIONS.taskCategoryRead)&&  (hasFeature(FEATURES.TASK))) && <li>
                      <Link
                        href="/category"
                        className={`${isActive("/category")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("task_category")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.taskStatusRead) && (hasFeature(FEATURES.TASK))) && <li>
                      <Link
                        href="/status"
                        className={`${isActive("/status")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("task_status")}
                      </Link>
                    </li>}
                    {
                      (hasPermission(PERMISSIONS.readTaskReport)&&  (hasFeature(FEATURES.TASK))) && <li>
                        <Link
                          href="/reports"
                          className={`${isActive("/reports")
                            ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                        >
                          {t("task_reports")}
                        </Link>
                      </li>
                    }
                    {
                      (hasPermission(PERMISSIONS.createTaskReport)&&  (hasFeature(FEATURES.TASK))) && <li>
                        <Link
                          href={`/report/create/${USER_ID||"new"}`}
                          className={`${isActive(`/report/create/${USER_ID||"new"}`)
                            ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                        >
                          {t("today's_task")}
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
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                  <span className={`${isMenuActive("user") ?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`} >
                  <FiUser className="text-lg" />

                  </span>
                  {t("user_management")}
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
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("users")}
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readRole) && <li>
                      <Link
                        href="/roles"
                        className={`${isActive("/roles")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("roles")}
                      </Link>
                    </li>}
                    {
                      hasPermission(PERMISSIONS.deletedUserView) && <li>
                        <Link
                          href="/deleteduser"
                          className={`${isActive("/deleteduser")
                            ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                            : "border-l-2 border-transparent"
                            } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                        >
                          {t("deleted_users")}
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
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                   <span className={`${isMenuActive("team") ?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`} >


                  <AiOutlineTeam className="text-lg" />
                  </span>
                  {t("team_management")}
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
                    
                    {(hasPermission(PERMISSIONS.readTeamCategory) && !auth.isAdmin ) && <li>
                      <Link
                        href="/teams/categories"
                        className={`${isActive("/teams/categories")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("teams_categories")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.readTeam)&& !auth.isAdmin) && <li>
                      <Link
                        href="/teams"
                        className={`${(isActive("/teams") && !isActive("/teams/categories"))
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("teams")}
                      </Link>
                    </li>}
                    
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

            {(( hasPermission(PERMISSIONS.readEnquiry) || hasPermission(PERMISSIONS.readLead) || hasPermission(PERMISSIONS.readDeal) || hasPermission(PERMISSIONS.readQuote) || hasPermission(PERMISSIONS.readInvoice))  &&  (hasFeature(FEATURES.SALES)) && !auth.isAdmin) && <li>
              <button
                onClick={() => toggleMenu("sales")}
                className={`${isMenuActive("sales")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300 "
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                   <span className={`${isMenuActive("sales") ?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`} >
                  <BsBarChart className="text-lg" />
                  </span>
                  {t("sales")}
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
                  {(hasPermission(PERMISSIONS.readEnquiry)&&  (hasFeature(FEATURES.CRM))) && <li>
                      <Link
                        href="/enquiry"
                        className={`${isActive("/enquiry")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("enquiry")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.readLead) &&  (hasFeature(FEATURES.CRM))) && <li>
                      <Link
                        href="/leads"
                        className={`${isActive("/leads")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("leads")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.readDeal) &&  (hasFeature(FEATURES.CRM))) && <li>
                      <Link
                        href="/deals"
                        className={`${isActive("/deals")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("deals")}
                      </Link>
                    </li>}

                    {(hasPermission(PERMISSIONS.readQuote) &&  (hasFeature(FEATURES.CRM))) && <li>
                      <Link
                        href="/quotations"
                        className={`${isActive("/quotations")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("quotations")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.readInvoice) &&  (hasFeature(FEATURES.CRM))) && <li>
                      <Link
                        href="/invoice"
                        className={`${isActive("/invoice")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("Invoice")}
                      </Link>
                    </li>}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {(hasPermission(PERMISSIONS.readClient)&&  (hasFeature(FEATURES.CRM)) && !auth.isAdmin) && <li>
              <Link
                href="/clients"
                className={`${isActive("/clients")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                       <span  className={`${isActive("/clients")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <FiUserCheck className="text-lg" />
                </span>
                {t("clients")}
              </Link>
            </li>}

            {(((hasPermission(PERMISSIONS.telephone))|| hasPermission(PERMISSIONS.smsReadLog)) &&  (hasFeature(FEATURES.TELECOM)) && !auth.isAdmin )&& <li>
              <button
                onClick={() => toggleMenu("communication")}
                className={`${isMenuActive("communication")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                   <span className={`${isMenuActive("communication") ?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`} >
                  <AiOutlineTeam className="text-lg" />
                  </span>
                  {t("communication")}
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
                    {(hasPermission(PERMISSIONS.telephone) &&  (hasFeature(FEATURES.TELECOM))) && <li>
                      <Link
                        href="/telephone"
                        className={`${isActive("/telephone")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("telephones_numbers")}
                      </Link>
                    </li>}
                    {(hasPermission(PERMISSIONS.smsReadLog) &&  (hasFeature(FEATURES.TELECOM)))&& <li>
                      <Link
                        href="/message"
                        className={`${isActive("/message")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("messages")}
                      </Link>
                    </li>}


                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}
            {((hasPermission(PERMISSIONS.readTemplate) || hasPermission(PERMISSIONS.createTemplate) || hasPermission(PERMISSIONS.readEmailLog)) &&  (hasFeature(FEATURES.CRM)) && !auth.isAdmin) && <li>
              <button
                onClick={() => toggleMenu("emailManagement")}
                className={`${isMenuActive("emailManagement")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                <span className="flex items-center gap-3">
                   <span className={`${isMenuActive("emailManagement") ?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`} >
                  <IoMailOutline className="text-lg" />
                  </span>
                  {t("emailManagement")}
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
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("templates")}
                      </Link>
                    </li>}
                    {hasPermission(PERMISSIONS.readEmailLog) && <li>
                      <Link
                        href="/emailManagement/outbox"
                        className={`${isActive("/emailManagement/outbox")
                          ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                          : "border-l-2 border-transparent"
                          } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                      >
                        {t("outbox")}
                      </Link>
                    </li>}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>}

              <li>
              <Link
                href="/support"
                className={`${isActive("/support")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                       <span  className={`${isActive("/support")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <BiSupport className="text-lg" />
                </span>
                {t("supports")}
              </Link>
            </li>
            {(auth.isAdmin)  && <li>
              <Link
                href="/query"
                className={`${isActive("/query")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
                       <span  className={`${isActive("/query")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <TbNotes className="text-lg" />
                </span>
                {t("query")}
              </Link>
            </li>}
           
            {
              hasPermission(PERMISSIONS.readOTP) && <li>
                
                <Link
                  href="/otp"
                  className={`${isActive("/otp")
                    ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                    : "border-l-2 border-transparent"
                    } block px-3 py-2 text-sm rounded-md hover:bg-cyan-600/5 transition-all`}
                >
                  <span className="flex items-center gap-3">

                         <span  className={`${isActive("/otp")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                  <IoKeyOutline className="text-lg" />

                    </span>

                  OTP
                  </span>
                </Link>
              </li>
            }
          </ul>
        </div>
    
        <div className="flex flex-col gap-3">
          <h2 className=" text-xs text-gray-500 dark:text-gray-400 pl-3">
            {t("setting")}
          </h2>
          {
            (isCompanyAdmin) &&(
                  <Link
                  href={`/companySetting/${
    typeof auth.user?.companyId === "string"
      ? auth.user.companyId
      : auth.user?.companyId?.id
  }`}
                className={`${isActive("/companySetting")
                  ? " dark:text-cyan-300 text-cyan-700   border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
              <span  className={`${isActive("/companySetting")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <GrUserSettings className="text-lg" />

              </span>
               {t("company_setting")}

              </Link>

            )
          }

        
              <Link
                href="/setting"
                className={`${isActive("/setting")
                  ? " dark:text-cyan-300 text-cyan-700   border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all`}
              >
              <span  className={`${isActive("/setting")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <IoSettingsOutline className="text-lg" />

              </span>
               {t("setting")}

              </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="uppercase text-xs text-gray-500 dark:text-gray-400 pl-3">
            {t("auth")}
          </h2>
          <ul className="flex flex-col gap-1 w-full">
            <li>
              <button
                onClick={() => handleLogout()}
                className={`w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all border-l-2 border-transparent`}
              >
                <MdOutlineLogout className="text-lg" />
                {t("logout")}
              </button>
            </li>
            <li>
             <div
                  onClick={() => router.push(`/users/${auth?.user?.id}`)}
                  className={`${
                    isActive("/profile")
                      ? "dark:text-cyan-300 text-cyan-700 border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                      : "border-l-2 border-transparent"
                  } w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all capitalize`}
                >
                  <span
                    className={`${
                      isActive("/profile")
                        ? "bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400 w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl"
                        : ""
                    }`}
                  >
                    <FaRegUser className="text-lg" />
                  </span>

                  {t("profile")}
                </div>
            </li>
            <li>
              <Link
                href={"/reset-password"}
                className={`${isActive("/reset-password")
                  ? "dark:text-cyan-300 text-cyan-700 dark:text-cyan-300  border-l-2 bg-linear-to-r from-cyan-50 dark:from-slate-600 to-cyan-200 dark:to-slate-800 border-cyan-600 dark:border-cyan-300"
                  : "border-l-2 border-transparent"
                  } w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-cyan-600/10 transition-all capitalize`}
              >
                       <span  className={`${isActive("/reset-password")?'bg-cyan-100 dark:bg-cyan-200 dark:text-cyan-400  w-8 border border-cyan-600 dark:border-none items-center h-8 flex justify-center rounded-xl':'' }`}>
                <RiLockPasswordLine className="text-lg" />
                </span>
                {t("reset_password")}
              </Link>
            </li>

          </ul>
        </div>
         
      </div>
    </div>
  );
};

export default SideBar;