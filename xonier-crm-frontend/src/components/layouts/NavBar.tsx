"use client";

import React, { useEffect, useRef, useState } from "react";
import ThemeToggle from "../common/ThemeToggle";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { logout } from "@/src/store/slices/authSlice";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiUser, FiSearch,  FiCheckCircle } from "react-icons/fi";
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
      const isConfirmed = await ConfirmPopup({
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
    <div className="h-14 z-99 fixed top-0 right-0 left-[288px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-4 flex justify-between items-center my-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl mx-3 shadow-2xs">
      
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
            className="relative"
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
          >
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <span className="h-8.5 w-8.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold tracking-tight shadow-xs ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-slate-300 dark:group-hover:ring-slate-600 transition-all">
                {getInitials(auth.user?.firstName, auth.user?.lastName)}
              </span>
              <span className="text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white capitalize text-sm font-medium hidden md:block">
                {auth.user?.firstName} {auth.user?.lastName}
              </span>
            </div>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 8 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden w-68 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold shadow-xs flex-shrink-0">
                      {getInitials(auth?.user?.firstName, auth?.user?.lastName)}
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <h3 className="text-slate-900 dark:text-white text-sm font-semibold capitalize truncate">
                        {auth?.user?.firstName} {auth?.user?.lastName}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {auth?.user?.userRole?.map((i, ind) => (
                          <span key={ind} className="text-[10px] text-slate-500 dark:text-slate-400">
                            {i.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full border-b border-gray-200 dark:border-gray-700"></div>
                  <ul className="flex flex-col ">
                    <li className="dark:hover:bg-slate-500 hover:bg-slate-100 group py-2 px-2 rounded-lg">
                      <Link
                        href={`/users/${auth?.user?.id}`}
                        className="flex items-center gap-4 group"
                      >
                        <span className="h-8 w-8 rounded-md text-slate-500 dark:text-white/80  dark:bg-slate-500 flex items-center justify-center overflow-hidden">
                          <FiUser className="text-xl group-hover:scale-110 transition-all duration-300" />
                        </span>
                          <span className="text-slate-400  text-sm dark:text-white/80  ">
                          {t("view_profile")}
                          </span>
                          
                      </Link>
                    </li>
                    {
                     !isAdmin &&
                    <li className="dark:hover:bg-slate-500 hover:bg-slate-100 group py-2 px-2 rounded-lg">
                   

                    <Link href={`/companies/${companyId}` }  
                    className="flex items-center gap-4 group">
                      {/* <Link href={`/companies/${auth?.user?.companyId?.id}`}
                       
                      > */}
                      <span className="h-8 w-8 rounded-md text-slate-500 dark:text-white/80  dark:bg-slate-500 flex items-center justify-center overflow-hidden">
                        <FaBuilding className="text-xl group-hover:scale-110 transition-all duration-300" />
                      </span>
                      <span className="text-slate-400  text-sm dark:text-white/80  ">
                        {t("company")}
                      </span>
                      </Link>

                    </li>
                    }

                  </ul>
                  <button
                    onClick={handleLogout}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white w-full rounded-md py-2.5 capitalize font-medium cursor-pointer"
                  >
                    {t("log_out")}
                  </button>
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