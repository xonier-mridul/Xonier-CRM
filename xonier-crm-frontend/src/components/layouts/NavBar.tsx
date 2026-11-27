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
import {
  ArrowUpRight,
  Building2,
  Calculator as CalculatorIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
  LogOut,
  Search,
  Settings,
  SlidersHorizontal,
  User as UserIcon,
  X,
} from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../common/LanguageSelector";


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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const  calRef = useRef<HTMLDivElement>(null)
   const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <header className="h-14 z-99 fixed top-0 right-0 left-0 lg:left-[288px] bg-white/90 dark:bg-slate-900/85 backdrop-blur-md px-3.5 flex justify-between items-center gap-4 my-2 border border-slate-200/75 dark:border-slate-800/90 rounded-xl mx-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      
      {calOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-40" onClick={() => setCalOpen(false)} />
      )}

      {/* LEFT SIDE — History Navigation & Command Search */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-lg">
        {/* Segmented History Controls */}
        <div
          className="hidden sm:inline-flex items-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-0.5 shrink-0"
          role="group"
          aria-label="Page navigation"
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            title="Go back"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={1.85} />
          </button>
          <span className="h-3.5 w-px bg-slate-200/90 dark:bg-slate-700/80" aria-hidden="true" />
          <button
            type="button"
            onClick={() => router.forward()}
            aria-label="Forward"
            title="Go forward"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={1.85} />
          </button>
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="relative flex-1 min-w-0 max-w-sm">
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search
              size={15}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 dark:text-slate-500 dark:group-focus-within:text-slate-300 transition-colors"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_menu")}
              className="w-full h-9 pl-9 pr-14 text-[13px] bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 focus:border-slate-300 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-900/[0.04] dark:focus:ring-white/[0.06] rounded-lg outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={handleSearchClick}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X size={13} strokeWidth={2} />
              </button>
            ) : (
              <kbd className="pointer-events-none hidden sm:inline-flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 dark:text-slate-400">
                ⌘K
              </kbd>
            )}
          </form>

          {searchDetail.length > 0 && (
            <div className="absolute max-h-80 overflow-y-auto top-full mt-2 left-0 w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick navigation
              </div>
              <div className="space-y-0.5">
                {searchDetail.map((item, index) => (
                  <Link key={`${item.link}-${index}`} href={item.link} onClick={handleSearchClick}>
                    <div className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white inline-flex items-center justify-center text-sm shrink-0 transition-colors">
                          {item.icon}
                        </span>
                        <span className="truncate capitalize">{item.title}</span>
                      </div>
                      <ArrowUpRight
                        size={14}
                        strokeWidth={1.75}
                        className="text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 shrink-0 transition-colors"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE — Unified Utility Toolbar & Account */}
      <div className="flex items-center gap-1 shrink-0 z-50">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <NotificationBell calOpen={calOpen} />

        {/* Calculator */}
        <div ref={calRef} className="relative">
          <button
            type="button"
            onClick={() => setCalOpen(!calOpen)}
            aria-label="Calculator"
            title="Calculator"
            className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              calOpen
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80"
            }`}
          >
            <CalculatorIcon size={17} strokeWidth={1.75} />
          </button>

          <AnimatePresence>
            {calOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 6 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg flex justify-center border border-slate-200/80 dark:border-slate-800 z-50"
              >
                <Calculator setCalOpen={setCalOpen} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Select Language"
            title="Language"
            className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isOpen
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80"
            }`}
          >
            <Languages size={17} strokeWidth={1.75} />
          </button>

          <LanguageSelector
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            dropdownRef={dropdownRef}
          />
        </div>

        <span className="h-5 w-px bg-slate-200/80 dark:bg-slate-800 mx-1.5" aria-hidden="true" />

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
              className={`flex items-center gap-2 cursor-pointer rounded-lg pl-1 pr-2 py-1 transition-colors focus:outline-none ${
                profileOpen
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
              }`}
              aria-expanded={profileOpen}
              aria-label="Open account menu"
            >
              <span className="h-7 w-7 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-semibold tracking-tight">
                {getInitials(auth.user?.firstName, auth.user?.lastName)}
              </span>
              <span className="hidden md:flex flex-col items-start leading-tight text-left">
                <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 capitalize max-w-[140px] truncate">
                  {auth.user?.firstName} {auth.user?.lastName}
                </span>
              </span>
              <ChevronDown
                size={14}
                strokeWidth={1.8}
                className={`hidden md:block text-slate-400 transition-transform duration-150 ${
                  profileOpen ? "rotate-180 text-slate-600 dark:text-slate-300" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
                >
                  {/* User Badge & Email Header */}
                  {(auth?.user?.userRole?.length || auth?.user?.email) && (
                    <div className="rounded-lg bg-slate-50/90 px-3 py-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          {auth?.user?.userRole?.[0]?.name || "User"}
                        </span>
                      </div>
                      {auth?.user?.email && (
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
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
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white transition-colors"
                    >
                      <UserIcon size={15} strokeWidth={1.75} className="text-slate-400" />
                      <span className="flex-1">My Profile</span>
                    </Link>

                    {!isAdmin && companyId && (
                      <Link
                        href={`/companies/${companyId}`}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white transition-colors"
                      >
                        <Building2 size={15} strokeWidth={1.75} className="text-slate-400" />
                        <span className="flex-1">Organization Overview</span>
                      </Link>
                    )}

                    {!isAdmin && (
                      <Link
                        href="/companySetting"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white transition-colors"
                      >
                        <Settings size={15} strokeWidth={1.75} className="text-slate-400" />
                        <span className="flex-1">Organization Settings</span>
                      </Link>
                    )}

                    <Link
                      href="/setting"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white transition-colors"
                    >
                      <SlidersHorizontal size={15} strokeWidth={1.75} className="text-slate-400" />
                      <span className="flex-1">Preferences</span>
                    </Link>
                  </nav>

                  {/* Log Out */}
                  <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50/80 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} strokeWidth={1.75} />
                      <span className="flex-1 text-left">Log Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;
