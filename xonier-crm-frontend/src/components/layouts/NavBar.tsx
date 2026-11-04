"use client";

import React, { useEffect, useRef, useState } from "react";
import ThemeToggle from "../common/ThemeToggle";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { logout } from "@/src/store/slices/authSlice";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiUser, FiSearch, FiCheckCircle, FiSettings, FiSliders, FiLogOut, FiChevronRight } from "react-icons/fi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaBuilding, } from "react-icons/fa";
import ConfirmPopup from "../ui/ConfirmPopup";
import { AuthService } from "@/src/services/auth.service";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { LuCalculator } from "react-icons/lu";
import Calculator from "../common/Calculator";
import {FiHome,FiCalendar,
  FiUsers,FiBarChart2,
  FiTrash2,
  FiShield,
  FiLayers,
  FiUserPlus,
  FiBriefcase,
  FiDollarSign,
  FiFileText,
  FiKey,
  FiRefreshCw,
  FiHelpCircle,
  FiMail,
  FiMessageSquare,
  FiPhone,
  FiCheckSquare,
  FiClipboard,
  FiTag,
  FiFolder,
  FiCreditCard,
  FiBookOpen,
} from "react-icons/fi";
import { MdKeyboardArrowRight } from "react-icons/md";
import NotificationBell from "../common/NotificationBell";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
// import { useTranslation } from "react-i18next";
// import i18n from "../../i18n/index";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../common/LanguageSelector";
import { IoLanguage } from "react-icons/io5";


const mockNotifications = [
  {
    id: 1,
    title: "New user registered",
    message: "John Doe just signed up to your platform",
    time: "2 min ago",
    type: "user",
    unread: true,
  },
  {
    id: 2,
    title: "Payment received",
    message: "$299 subscription payment from Acme Inc.",
    time: "1 hour ago",
    type: "payment",
    unread: true,
  },
  {
    id: 3,
    title: "New company added",
    message: "TechCorp has been added to your CRM",
    time: "3 hours ago",
    type: "company",
    unread: false,
  },
  {
    id: 4,
    title: "Subscription expiring",
    message: "BetaCorp subscription expires in 3 days",
    time: "Yesterday",
    type: "alert",
    unread: false,
  },
];

interface SearchDetail {
  link: string;
  title: string;
  icon: React.ReactNode; 
  permission: string | null;
}

const getInitials = (firstName?: string, lastName?: string) => {
  const f = firstName?.trim()?.[0] || "";
  const l = lastName?.trim()?.[0] || "";
  return (f + l).toUpperCase() || "U";
};

const NavBar = () => {
  const { t } = useTranslation();
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const isAdmin = useSelector((state: RootState) => state.auth.isAdmin);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileCloseTimerRef = useRef<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleProfileMouseEnter = () => {
    if (profileCloseTimerRef.current) {
      window.clearTimeout(profileCloseTimerRef.current);
      profileCloseTimerRef.current = null;
    }
    setProfileOpen(true);
  };

  const handleProfileMouseLeave = () => {
    if (profileCloseTimerRef.current) {
      window.clearTimeout(profileCloseTimerRef.current);
    }
    profileCloseTimerRef.current = window.setTimeout(() => {
      setProfileOpen(false);
      profileCloseTimerRef.current = null;
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (profileCloseTimerRef.current) {
        window.clearTimeout(profileCloseTimerRef.current);
      }
    };
  }, []);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [calOpen,setCalOpen]= useState<boolean>(false)
  const [searchDetail,setSearchDetail]= useState< SearchDetail[]>([])
  
  const USER_ID = auth.user?._id;
  const searchRef = useRef<HTMLDivElement>(null);
  const  calRef = useRef<HTMLDivElement>(null)
   const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  



  const unreadCount = mockNotifications.filter((n) => n.unread).length;

const data = [
  { link: "/dashboard", title: "Dashboard", icon: <FiHome />, permission: "dashboard:read" },
  { link: "/calender", title: "Calendar", icon: <FiCalendar />, permission: "event:read" },

  { link: "/users", title: "Users", icon: <FiUsers />, permission: "user:read" },
  { link: "/deleteduser", title: "Deleted Users", icon: <FiTrash2 />, permission: "user:readDeleted" },

  { link: "/roles", title: "Roles", icon: <FiShield />, permission: "role:read" },

  { link: "/teams/categories", title: "Teams Categories", icon: <FiLayers />, permission: "team_cat:read" },
  { link: "/teams", title: "Teams", icon: <FiUsers />, permission: "team:read" },

  { link: "/enquiry", title: "Enquiry", icon: <FiHelpCircle />, permission: "enquiry:read" },

  { link: "/leads", title: "Leads", icon: <FiUserPlus />, permission: "lead:read" },

  { link: "/deals", title: "Deals", icon: <FiDollarSign />, permission: "deal:read" },

  { link: "/quotations", title: "Quotations", icon: <FiFileText />, permission: "quote:read" },

  { link: "/otp", title: "OTP", icon: <FiKey />, permission: "otp:read" },

  { link: "/profile", title: "Profile", icon: <FiUser />, permission: null },
  { link: "/reset-password", title: "Reset Password", icon: <FiRefreshCw />, permission: null },

  { link: "/query", title: "Query", icon: <FiHelpCircle />, permission: null },

  { link: "/emailManagement/outbox", title: "Outbox", icon: <FiMail />, permission: "email:read" },
  { link: "/emailManagement/templates", title: "Templates", icon: <FiFileText />, permission: "emailTemplate:read" },

  { link: "/message", title: "Messages", icon: <FiMessageSquare />, permission: "sms:read" },

  { link: "/telephone", title: "Telephone Numbers", icon: <FiPhone />, permission: "telephone:read" },

  { link: `/report/create/${USER_ID || "new"}`, title: "Today's Task", icon: <FiCheckSquare />, permission: "task:create" },

  { link: "/reports", title: "Task Reports", icon: <FiClipboard />, permission: "taskReport:read" },

  { link: "/status", title: "Task Status", icon: <FiCheckCircle />, permission: "taskStatus:read" },

  { link: "/category", title: "Task Category", icon: <FiTag />, permission: "taskCategory:read" },

  { link: "/task", title: "Tasks", icon: <FiFolder />, permission: "task:read" },

  { link: "/companies/create", title: "Create Companies", icon: <FaBuilding />, permission: "company:create" },

  { link: "/companies", title: "Companies", icon: <FaBuilding />, permission: "company:read" },

  { link: "/subscriptions", title: "Subscriptions", icon: <FiCreditCard />, permission: "subscription:read" },

  { link: "/plans", title: "Plans", icon: <FiBookOpen />, permission: "plan:read" },

  { link: "/notes", title: "Notes", icon: <FiFileText />, permission: "note:read" },

  { link: "/prospects/company", title: "Prospect Company", icon: <FiBriefcase />, permission: "prospect:read" },

  { link: "/sales-dashboard", title: "Sales Dashboard", icon: <FiBarChart2 />, permission: "dashboard:read" },
];



useEffect(()=>{
  const handleOutSideCLick =(e:MouseEvent)=>{

    
    if(searchRef.current && 
      !searchRef.current.contains(e.target as Node)){
      setSearchQuery('')

    }
    if(calRef.current && 
      !calRef.current.contains(e.target as Node)){
       setCalOpen(false)
    }
    if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
      setProfileOpen(false);
    }

  }

  document.addEventListener("mousedown",handleOutSideCLick)

  return ()=>{
    document.removeEventListener("mousedown",handleOutSideCLick)
  }



},[])


useEffect(() => {
  if (!searchQuery.trim()) {
    setSearchDetail([]);
    return;
  }
const permissions =

  auth?.user?.userRole?.[0]?.permissions?.map((p) => p.code) || [];

const searchableData = data.filter(
  (item) =>{
    if(auth?.user?.userRole?.[0]?.code === 'SUPER_ADMIN'){
        return  true
    }
    return !item.permission || permissions.includes(item.permission)

  }
);
const results = searchableData.filter((item) =>

  item.title.toLowerCase().includes(searchQuery.toLowerCase())
);


  setSearchDetail(results);
}, [searchQuery]);

  const handleLogout = async (): Promise<void> => {
    try {
      const {isConfirmed} = await ConfirmPopup({
        title: "Logout",
        text: "Are you want to logout",
        btnTxt: "Yes, Logout",
      });

      if (isConfirmed) {
        const isLogout = await AuthService.logout();
        if (isLogout) {
          dispatch(logout());
          router.push("/login");
          toast.success("Logout successfully");
        }
      }
    } catch (error) {
      toast.error("Logout Failed");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
 
  const handleSearchClick=()=>{
    setSearchQuery('')
  }
  const getNotifIcon = (type: string) => {
    switch (type) {
      case "user":
        return "👤";
      case "payment":
        return "💰";
      case "company":
        return "🏢";
      case "alert":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  
   const companyId = typeof auth?.user?.companyId === 'object' 
  ? auth?.user?.companyId?.id 
  : auth?.user?.companyId;

  return (
    <div className="h-14 z-99 fixed top-0 right-0 left-0 lg:left-[288px] bg-white/85 dark:bg-slate-900/50 backdrop-blur-md px-4 flex justify-between items-center my-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl mx-3 shadow-2xs">
      
       {
        calOpen &&(
      <div className='absolute h-[100vh] w-full top-0 right-0 bg-black/30 backdrop-blur-xs'></div>


        )
      }
      {/* LEFT SIDE — Search Bar */}
      <div
      ref={searchRef}
       className="flex relative items-center gap-3 flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative w-full group">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 dark:group-focus-within:text-slate-200 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search_menu")}
            className="w-full pl-10 pr-12 py-1.5 text-xs bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 focus:border-slate-300 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-800 dark:text-white shadow-2xs"
          />
          
        </form>

        {searchDetail.length > 0 && (
    <div className="absolute max-h-76 overflow-y-scroll o top-full mt-4 left-0 w-full p-2 dark:bg-slate-800 dark:border-slate-700 bg-white border border-slate-100 rounded-lg shadow-lg z-50">
      {searchDetail.map((item, index) => (
        <>
        <Link 
        href={item.link}>
          <div className="flex justify-between group px-4 py-3 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-600  gap-4 cursor-pointer items-center"
          onClick={handleSearchClick}>
              <div
          key={index}

          className=" flex gap-4 cursor-pointer items-center  capitalize"
        >
          <span>
           {item.icon}
          </span>
          {item.title}
        </div>
        <span>
        <MdKeyboardArrowRight  className="group-hover:rotate-90"/>

        </span>
        

          </div>
        
        </Link>
        </>

      ))}
    </div>
  )}
      </div>


{/* <div className="flex gap-2">
<button className="border text-sm border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer" 
onClick={() => i18n.changeLanguage("hi")}>
    {t("hindi")}
</button>

<button className="border text-sm border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer"  
onClick={() => i18n.changeLanguage("en")}>
    {t("english")}
</button>
<button className="border text-sm border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer"  
onClick={() => i18n.changeLanguage("po")}>
    {t("portuguese")}
</button>
</div> */}


{/* <div className="w-5 h-5 rounded-full relative">
<IoLanguage 
  onClick={() => setIsOpen(!isOpen)} />
  {isOpen && 
<LanguageSelector isOpen={isOpen} setIsOpen={setIsOpen} dropdownRef={dropdownRef}/>


  }

</div> */}




      {/* RIGHT SIDE — Actions */}
      <div className="flex items-center gap-2 md:gap-2.5">
        <div className="flex items-center gap-1">
          <button 
            onClick={()=>router.back()} 
            aria-label="Back"
            className="h-8.5 w-8.5 flex items-center justify-center text-slate-500 dark:text-slate-400 border rounded-xl dark:bg-slate-800/80 bg-white hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-2xs transition-all"
          >
            <FaArrowLeftLong className="text-xs"/>
          </button>
          <button 
            onClick={()=>router.forward()} 
            aria-label="Forward"
            className="h-8.5 w-8.5 flex items-center justify-center text-slate-500 dark:text-slate-400 border rounded-xl dark:bg-slate-800/80 bg-white hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-2xs transition-all"
          >
            <FaArrowRightLong className="text-xs"/>
          </button>
        </div>
        
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <NotificationBell calOpen={calOpen} />

        <div 
        ref={calRef} 
        className="relative">
          <button 
            onClick={()=>setCalOpen(!calOpen)}
            aria-label="Calculator"
            className="relative h-8.5 w-8.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 shadow-2xs transition-all cursor-pointer">
            <LuCalculator className="text-base" />  
          </button>

          <AnimatePresence >
            {
              calOpen && (
                <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 8 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl flex justify-center border border-slate-200/80 dark:border-slate-800"
              >
                <Calculator setCalOpen={setCalOpen}/>
            </motion.div>
              )
            }
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="relative h-8.5 w-8.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
            aria-label="Select Language"
          >
            <IoLanguage className="w-4 h-4" />
          </button>

          <LanguageSelector
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            dropdownRef={dropdownRef}
          />
        </div>

        <span className="border-r border-slate-200 dark:border-slate-800 h-6 mx-1" />

        {/* User Profile */}
        {auth.isAuthenticated && (
          <div
            ref={profileRef}
            className="relative"
            onMouseEnter={handleProfileMouseEnter}
            onMouseLeave={handleProfileMouseLeave}
          >
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2.5 cursor-pointer group rounded-xl px-1.5 py-1 focus:outline-none"
              aria-expanded={profileOpen}
              aria-label="Open account menu"
            >
              <span className="h-8 w-8 rounded-lg bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-xs font-semibold tracking-tight">
                {getInitials(auth.user?.firstName, auth.user?.lastName)}
              </span>
              <span className="text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white capitalize text-sm font-medium hidden md:block">
                {auth.user?.firstName} {auth.user?.lastName}
              </span>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.12),0_4px_16px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.5)] z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
                >
                  {/* User Badge & Email Header */}
                  {(auth?.user?.userRole?.length || auth?.user?.email) && (
                    <div className="rounded-xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-800/50 border border-slate-100/80 dark:border-slate-800/60 mb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 ring-1 ring-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          {auth?.user?.userRole?.[0]?.name || "User"}
                        </span>
                      </div>
                      {auth?.user?.email && (
                        <p className="mt-1.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                          {auth.user.email}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Navigation Links */}
                  <nav className="space-y-0.5 py-0.5">
                    <Link
                      href={`/users/${auth?.user?._id || auth?.user?.id}`}
                      onClick={() => setProfileOpen(false)}
                      className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover:bg-cyan-50 group-hover:text-cyan-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-cyan-950/50 dark:group-hover:text-cyan-400">
                        <FiUser className="text-sm" />
                      </span>
                      <span className="flex-1">My Profile</span>
                      <FiChevronRight className="text-xs text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
                    </Link>

                    {!isAdmin && companyId && (
                      <Link
                        href={`/companies/${companyId}`}
                        onClick={() => setProfileOpen(false)}
                        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-950/50 dark:group-hover:text-indigo-400">
                          <FaBuilding className="text-xs" />
                        </span>
                        <span className="flex-1">Organization Overview</span>
                        <FiChevronRight className="text-xs text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
                      </Link>
                    )}

                    {!isAdmin && (
                      <Link
                        href="/companySetting"
                        onClick={() => setProfileOpen(false)}
                        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover:bg-sky-50 group-hover:text-sky-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-sky-950/50 dark:group-hover:text-sky-400">
                          <FiSettings className="text-sm" />
                        </span>
                        <span className="flex-1">Organization Settings</span>
                        <FiChevronRight className="text-xs text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
                      </Link>
                    )}

                    <Link
                      href="/setting"
                      onClick={() => setProfileOpen(false)}
                      className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover:bg-amber-50 group-hover:text-amber-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-amber-950/50 dark:group-hover:text-amber-400">
                        <FiSliders className="text-sm" />
                      </span>
                      <span className="flex-1">Preferences</span>
                      <FiChevronRight className="text-xs text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
                    </Link>
                  </nav>

                  {/* Log Out */}
                  <div className="mt-1 border-t border-slate-100/80 pt-1 dark:border-slate-800/60">
                    <button
                      onClick={handleLogout}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50/80 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-all duration-150 group-hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:group-hover:bg-rose-900/50">
                        <FiLogOut className="text-sm" />
                      </span>
                      <span className="flex-1 text-left font-semibold">Log Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
