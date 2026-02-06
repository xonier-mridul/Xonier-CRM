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
import { BsBarChart } from "react-icons/bs";
import { MdOutlineHelpOutline, MdOutlineLogout } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import ConfirmPopup from "../ui/ConfirmPopup";
import { AuthService } from "@/src/services/auth.service";
import { logout } from "@/src/store/slices/authSlice";
import { toast } from "react-toastify";
import { RiLockPasswordLine } from "react-icons/ri";
import { TiGlobeOutline } from "react-icons/ti";
import { RootState } from "@/src/store";
import checkRole from "@/src/app/utils/roleCheck.utils";

import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";

const SideBar = () => {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const dispatch = useDispatch();

  const {hasPermission} = usePermissions();

  const auth = useSelector((state:RootState)=>state.auth);
 
  const router = useRouter();

  const handleLogout = async():Promise<void> => {
    try {
    
    let isConfirmed = await ConfirmPopup({title:"Logout", text:"Are you want to logout", btnTxt: "Yes, Logout"});

    if (isConfirmed){
        const isLogout = await AuthService.logout()
        if(isLogout){
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

    if (pathname.startsWith("/enquiry")){
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/leads")){
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/deals")){
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/quotations")){
      setOpenMenu("sales")
    }
    if (pathname.startsWith("/invoice")){
      setOpenMenu("sales")
    }
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const isActive = (path: string) => pathname.startsWith(path);

  // Check if any submenu item is active
  const isMenuActive = (menu: string) => {
    switch (menu) {
      case "team":
        return pathname.startsWith("/teams") || 
               pathname.startsWith("/users") || 
               pathname.startsWith("/roles");
      case "sales":
        return pathname.startsWith("/enquiry") || 
               pathname.startsWith("/leads") || 
               pathname.startsWith("/deals") || 
               pathname.startsWith("/quotations") ||
               pathname.startsWith("/invoice");
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
              className={`${
                isActive("/dashboard")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
              } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
            >
              <BiHome className="text-lg" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/calender"
              className={`${
                isActive("/calender")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
              } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
            >
              <SlCalender className="text-lg" />
              Calender
            </Link>
          </li>

          <li>
            <Link
              href="/notes"
              className={`${
                isActive("/notes")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
              } flex items-center gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
            >
              <TbNotes className="text-lg" />
              Notes
            </Link>
          </li>

          {(hasPermission(PERMISSIONS.readUser) || hasPermission(PERMISSIONS.readRole) || hasPermission(PERMISSIONS.createTeam)) && <li>
            <button
              onClick={() => toggleMenu("team")}
              className={`${
                isMenuActive("team")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
              } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
            >
              <span className="flex items-center gap-3">
                <AiOutlineTeam className="text-lg" />
                Team Management
              </span>

              <IoChevronDown
                className={`transition-transform ${
                  openMenu === "team" ? "rotate-180" : ""
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
                      className={`${
                        isActive("/roles")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Roles
                    </Link>
                  </li>}
                  {hasPermission(PERMISSIONS.readTeamCategory) &&<li>
                    <Link
                      href="/teams/categories"
                      className={`${
                        isActive("/teams/categories")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Teams Categories
                    </Link>
                  </li>}
                  {hasPermission(PERMISSIONS.readTeam) &&<li>
                    <Link
                      href="/teams"
                      className={`${
                        (isActive("/teams") && !isActive("/teams/categories"))
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Teams
                    </Link>
                  </li>}
                  {hasPermission(PERMISSIONS.readUser) && <li>
                    <Link
                      href="/users"
                      className={`${
                        isActive("/users")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Users
                    </Link>
                  </li>}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>}

          {(hasPermission(PERMISSIONS.createEnquiry) || hasPermission(PERMISSIONS.readEnquiry) || hasPermission(PERMISSIONS.createLead) || hasPermission(PERMISSIONS.readLead) || hasPermission(PERMISSIONS.createDeal) || hasPermission(PERMISSIONS.readDeal)) && <li>
            <button
              onClick={() => toggleMenu("sales")}
              className={`${
                isMenuActive("sales")
                  ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400"
                  : "border-l-2 border-transparent"
              } flex w-full items-center justify-between px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all`}
            >
              <span className="flex items-center gap-3">
                <BsBarChart className="text-lg" />
                Sales
              </span>

              <IoChevronDown
                className={`transition-transform ${
                  openMenu === "sales" ? "rotate-180" : ""
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
                  {hasPermission(PERMISSIONS.createEnquiry) && <li>
                    <Link
                      href="/enquiry"
                      className={`${
                        isActive("/enquiry")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Enquiry Management
                    </Link>
                  </li>}
                  {hasPermission(PERMISSIONS.readLead) && <li>
                    <Link
                      href="/leads"
                      className={`${
                        isActive("/leads")
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
                      className={`${
                        isActive("/deals")
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
                      className={`${
                        isActive("/quotations")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-600/5 border-l-2 border-blue-600 dark:border-blue-400"
                          : "border-l-2 border-transparent"
                      } block px-3 py-2 text-sm rounded-md hover:bg-blue-600/5 transition-all`}
                    >
                      Quotations
                    </Link>
                  </li>}
                  {hasPermission(PERMISSIONS.readQuote) && <li>
                    <Link
                      href="/invoice"
                      className={`${
                        isActive("/invoice")
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
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="uppercase text-xs text-gray-500 dark:text-gray-400 pl-3">
          Auth
        </h2>
        <ul className="flex flex-col gap-1 w-full">
          <li>
            <button
            onClick={()=>handleLogout()}
              className={`w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 rounded-md text-sm hover:bg-blue-600/10 transition-all border-l-2 border-transparent`}
            >
              <MdOutlineLogout className="text-lg" />
              Logout
            </button>
          </li>
          <li>
            <Link
              href={"/reset-password"}
              className={`${
                isActive("/reset-password")
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