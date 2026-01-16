"use client";

import React, { JSX } from "react";
import { UserDetailPageProps } from "@/src/types";
import { USER_STATUS } from "@/src/types";
import { GoDotFill } from "react-icons/go";
import { FaUserCircle } from "react-icons/fa";
import Image from "next/image";
import ComponentLoader from "../../common/ComponentLoader";
import Link from "next/link";
import { MdOutlineEdit } from "react-icons/md";
import PrimaryButton from "../../ui/PrimeryButton";

const UserDetail = ({
  userData,
  isLoading,
}: UserDetailPageProps): JSX.Element => {
  if (isLoading) {
    return (
      <ComponentLoader/>
    );
  }

  if (!userData) {
    return (
      <div className="bg-white dark:bg-gray-700 p-6 rounded-xl text-center text-gray-500">
        User not found
      </div>
    );
  }

  const formatDate = (date?: Date | null) =>
    date
      ? new Date(date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  const statusClass = {
    [USER_STATUS.ACTIVE]: "bg-green-100 text-green-600",
    [USER_STATUS.INACTIVE]: "bg-yellow-100 text-yellow-500",
    [USER_STATUS.SUSPENDED]: "bg-orange-100 text-orange-500",
    [USER_STATUS.DELETED]: "bg-red-100 text-red-500",
  }[userData.status];

  return (
    <div className="flex flex-col gap-6">

     
      <div className="bg-white dark:bg-gray-700 border border-slate-900/10 rounded-xl p-6 flex items-center gap-6 w-full">
        
       <div className="flex items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center">
          <Image src={"/images/dummy-user.png"} width={200} height={200} alt="User image"/>
        </div>

        
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {userData.firstName} {userData.lastName}
          </h2>

          <span
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full w-fit font-medium capitalize ${statusClass}`}
          >
            <GoDotFill />
            {userData.status}
          </span>

          <p className="text-gray-500 dark:text-gray-400">
            {userData.email}
          </p>
        </div>
        </div>
        <div className="flex justify-end gap-3 w-full">
            <PrimaryButton text={"Update User"} isLoading={isLoading} disabled={isLoading}  link={`/users/update/${userData.id}`} icon={<MdOutlineEdit className="text-lg"/>}/>

        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        
        <div className="bg-white dark:bg-gray-700 border border-slate-900/10 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 dark:text-white">
            Basic Information
          </h3>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Phone:</span>{" "}
              <span className="font-medium">{userData.phone}</span>
            </p>
            <p>
              <span className="text-gray-500">Company:</span>{" "}
              <span className="font-medium capitalize">{userData.company}</span>
            </p>
            <p>
              <span className="text-gray-500">Email Verified:</span>{" "}
              <span className="font-medium">
                {userData.isEmailVerified ? "Yes" : "No"}
              </span>
            </p>
          </div>
        </div>

       
        <div className="bg-white dark:bg-gray-700 border border-slate-900/10 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 dark:text-white">
            Account Information
          </h3>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Created At:</span>{" "}
              <span className="font-medium">{formatDate(userData.createdAt)}</span>
            </p>
            <p>
              <span className="text-gray-500">Last Login:</span>{" "}
              <span className="font-medium">{userData?.lastLogin ? formatDate(userData?.lastLogin) : "Not found"}</span>
            </p>
            <p>
              <span className="text-gray-500">Active:</span>{" "}
              <span className="font-medium">
                {userData.isActive ? "Yes" : "No"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
