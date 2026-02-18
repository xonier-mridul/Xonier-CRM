"use client";

import React, { useState } from "react";
import ThemeToggle from "../common/ThemeToggle";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { logout } from "@/src/store/slices/authSlice";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiUser } from "react-icons/fi";
import ConfirmPopup from "../ui/ConfirmPopup";
import { AuthService } from "@/src/services/auth.service";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";

const NavBar = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const router = useRouter()
  const handleLogout = async():Promise<void> => {
    try {
    
    let isConfirmed = await ConfirmPopup({title:"Logout", text:"Are you want to logout", btnTxt:"Yes, Logout"});

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

  return (
    <div className="h-14 z-99 fixed top-0 left-74 backdrop-blur-sm right-0 px-4 flex justify-between items-center my-2">
      <div />

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.back()} className="h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"><FaArrowLeftLong className="group-hover:scale-105 transition-all"/></button>
          <button onClick={()=>router.forward()} className="h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"><FaArrowRightLong className="group-hover:scale-105 transition-all"/></button>
 
        </div>
        <ThemeToggle />

        <span className="border-r border-[#ecf0f2] dark:border-gray-700 h-10" />

        {auth.isAuthenticated && (
          <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="h-9 w-9 rounded-full overflow-hidden">
                <Image
                  src="/images/user-1.png"
                  height={200}
                  width={200}
                  alt="profile image"
                  className="group-hover:scale-110 duration-300"
                  quality={100}
                />
              </span>
              <span className="group-hover:text-blue-700 dark:group-hover:text-blue-500 capitalize">
                {auth.user?.firstName} {auth.user?.lastName}
              </span>
            </div>

            
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 8 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2  bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden w-92 px-6 py-4 flex flex-col gap-4"
                >
                  <h2 className="font-bold text-xl text-slate-900 dark:text-blue-50 ">User Profile</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-1/3"><Image src={"/images/user-1.png"} className="rounded-full" height={300} width={300} alt="user profile image"/></div>
                    <div className="w-2/3 flex flex-col gap-2">
                    <h3 className="text-slate-900 dark:text-white text-lg capitalize">{auth?.user?.firstName} {auth?.user?.lastName}</h3>
                    <span>{}</span>
                  </div>
                  </div>
                  <div className="w-full border-b-[1px] border-gray-200 dark:border-gray-700"></div>
                  <ul>
                    <li><Link href={`/users/${auth?.user?._id}`} className="flex items-center gap-4 group"> <span className="h-11 w-11 rounded-md bg-blue-800/10 dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center overflow-hidden"> <FiUser className="text-2xl group-hover:scale-110 transition-all duration-300"/> </span> <div className="flex flex-col">
                     <h4 className="text-slate-900 dark:text-white font-semibold group-hover:text-blue-600"> My Profile</h4>
                     <span className="text-gray-500 dark:text-gray-400 text-sm">Account Settings</span>
                      </div> </Link></li>
                  </ul>
                  <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-md py-2.5 capitalize font-medium cursor-pointer">Log out</button>
                  
                  
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
