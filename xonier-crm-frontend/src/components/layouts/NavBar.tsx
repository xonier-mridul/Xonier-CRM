"use client";

import React, { useEffect, useRef, useState } from "react";
import ThemeToggle from "../common/ThemeToggle";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { logout } from "@/src/store/slices/authSlice";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiUser, FiSearch, FiBell, FiSettings, FiCheckCircle } from "react-icons/fi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaBuilding, FaRegBuilding } from "react-icons/fa";
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

const NavBar = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const isAdmin = useSelector((state: RootState) => state.auth.isAdmin);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [calOpen,setCalOpen]= useState<boolean>(false)
  const [searchDetail,setSearchDetail]= useState([])
  
  const USER_ID = auth.user?._id;
  const  searchRef = useRef(null)
  const  calRef = useRef(null)



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

console.log("UserDetails:",auth?.user)

useEffect(()=>{
  const handleOutSideCLick =(e:MouseEvent)=>{

    console.log("click Out SIde :",e.target)
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
      let isConfirmed = await ConfirmPopup({
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
  console.log("setQuery :",setSearchDetail)

  return (
    <div className="h-14 z-99 fixed top-0 left-0 lg:left-74 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl right-0 px-4 flex justify-between items-center my-2 border border-gray-200/50 dark:border-gray-700/50 rounded-xl mx-2 shadow-sm">
      
       {
        calOpen &&(
      <div className='absolute h-[100vh] w-full top-0 right-0 bg-white/60 dark:bg-black/60 '></div>


        )
      }
      {/* LEFT SIDE — Search Bar */}
      <div
      ref={searchRef}
       className="flex relative  items-center gap-3 flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative w-full group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="md:w-full pl-10 pr-16 py-2 text-sm bg-slate-100/60 dark:bg-gray-800/60 border border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-all placeholder:text-gray-400 text-slate-800 dark:text-white"
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




     

      {/* RIGHT SIDE — Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div
          className="relative"
          onMouseEnter={() => setNotifOpen(true)}
          onMouseLeave={() => setNotifOpen(false)}
        >
          <button className="relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100/60 dark:bg-gray-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all group cursor-pointer">
            <IoMdNotificationsOutline className="text-2xl group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && !calOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 8 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute -right-20 md:right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Notifications
                    </h3>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  </div>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <FiCheckCircle /> Mark all read
                  </button>
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                        n.unread ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center text-lg flex-shrink-0">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </h4>
                          {n.unread && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <Link
                  href="/notifications"
                  className="block text-center py-3 text-sm font-medium text-blue-600 hover:bg-slate-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 transition-colors"
                >
                  View all notifications →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        <div 
        ref={calRef} 
        className="relative">
          
        
          <button 
          onClick={()=>setCalOpen(!calOpen)}
          className="relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100/60 dark:bg-gray-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all group cursor-pointer">
            <LuCalculator  className="text-xl group-hover:scale-110 transition-transform" />  
          </button>

          <AnimatePresence >
            {
              calOpen && (
                <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 8 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-80 bg-white  dark:bg-gray-800 rounded-xl shadow-xl flex justify-center border-gray-100 dark:border-gray-700 "
              >
                <Calculator setCalOpen={setCalOpen}/>


            </motion.div>
              )
            }
            
          </AnimatePresence>
        </div>


        <span className="border-r border-gray-200 dark:border-gray-700 h-8" />

        {/* User Profile */}
        {auth.isAuthenticated && (
          <div
            className="relative"
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
          >
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all">
                <Image
                  src="/images/user-1.png"
                  height={200}
                  width={200}
                  alt="profile image"
                  className="group-hover:scale-110 duration-300"
                  quality={100}
                />
              </span>
              <span className="group-hover:text-blue-700 dark:group-hover:text-blue-500 capitalize text-sm font-medium hidden md:block">
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
                  className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden w-65 p-4 pt-4 flex flex-col gap-3"
                >
                  {/* <h2 className="font-bold text-xl text-slate-900 dark:text-blue-50">
                    User Profile
                  </h2> */}
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 border border-slate-200 hover:border-blue-400 rounded-full">
                      <Image
                        src={"/images/user-1.png"}
                        className="rounded-full"
                        height={250}
                        width={250}
                        alt="user profile image"
                      />
                    </div>
                    <div className="w-2/3 flex flex-col gap-1">
                      <h3 className="text-slate-900 dark:text-white text-sm capitalize">
                        {auth?.user?.firstName} {auth?.user?.lastName}
                      </h3>
                      <span>{auth?.user?.userRole?.map((i,ind)=>(
                        <div key={ind} className="text-xs text-slate-400">
                          {i.name}

                        </div>
                      ))}</span>
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
                          View Profile
                          </span>
                          
                      </Link>
                    </li>
                    {
                     !isAdmin &&
                    <li className="dark:hover:bg-slate-500 hover:bg-slate-100 group py-2 px-2 rounded-lg">
                      <Link href={`/companies/${auth?.user?.companyId?.id}`}
                        className="flex items-center gap-4 group"
                      >
                      <span className="h-8 w-8 rounded-md text-slate-500 dark:text-white/80  dark:bg-slate-500 flex items-center justify-center overflow-hidden">
                        <FaBuilding className="text-xl group-hover:scale-110 transition-all duration-300" />
                      </span>
                      <span className="text-slate-400  text-sm dark:text-white/80  ">
                        Company
                      </span>
                      </Link>

                    </li>
                    }

                  </ul>
                  <button
                    onClick={handleLogout}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-md py-2.5 capitalize font-medium cursor-pointer"
                  >
                    Log out
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