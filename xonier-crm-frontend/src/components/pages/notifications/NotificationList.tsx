"use client";

import React, { useState } from "react";
import { useNotifications } from "@/src/hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import { NotificationFilter, NotificationStatus } from "@/src/types/notification/notification.types";
import { FiCheckCircle, FiTrash2, FiFilter } from "react-icons/fi";
import DateFilterButton from "../../common/dateFilter";
import { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { IoSearchOutline } from "react-icons/io5";
import { TbRefresh } from "react-icons/tb";
import { useTranslation } from "react-i18next";



const NotificationList = () => {
  const { t } = useTranslation();
  const {
    notifications,
    loading,
    page,
    totalPages,
    setPage,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilter>({});
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });
  

  const handleFilterChange = (key: keyof NotificationFilter, value: any) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    fetchNotifications(newFilter);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead([id]);
  };

  const handleArchive = async (id: string) => {
    await deleteNotification(id);
  };

  console.log("page notification data:",notifications)

  return (
    <div className="w-full px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("notifications")}
        </h1>
         <p className="text-gray-600 dark:text-gray-400">{t("stay_updated_with_all_your_alert")}</p>
        </div>
               <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <FiCheckCircle /> {t("mark_all_as_read")}
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiTrash2 /> {t("clear_all")}
          </button>
        </div>
      </div>


      <div className="flex items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 justify-between">
        {/* <FiFilter className="text-gray-400" /> */}
        <div className="flex gap-10">
        <label className="flex flex-col gap-2 text-[14px] text-slate-500 dark:text-white/70">
          {t("status")}
        <select
          value={filter.status || ""}
          onChange={(e) =>
            handleFilterChange("status", e.target.value || undefined)
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none"
        >
          <option value="">{t("all_status")}</option>
          <option value={NotificationStatus.UNREAD}>{t("unread")}</option>
          <option value={NotificationStatus.READ}>{t("read")}</option>
        </select>
        </label>

       <label className="flex flex-col gap-2 text-[14px] text-slate-500 dark:text-white/70">
          {t("type")}
        <select
          value={filter.isRead !== undefined ? String(filter.isRead) : ""}
          onChange={(e) =>
            handleFilterChange(
              "isRead",
              e.target.value === "" ? undefined : e.target.value === "true"
            )
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none"
        >
          <option value="">{t("all")}</option>
          <option value="false">{t("unread_only")}</option>
          <option value="true">{t("read_only_2")}</option>
        </select>
        </label>
        <label className="flex flex-col gap-2 text-[14px] text-slate-500 dark:text-white/70">
          {t("date_range")}
          <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter}  />
          </label>

          <label className="flex flex-col gap-2 text-[14px] text-slate-500 dark:text-white/70  " >
            {t("search")}
            <div className='flex border border-slate-200 rounded-lg text-slate-500 px-4 py-2.5 items-center dark:text-white/70 gap-2 dark:border-gray-600' >
              <IoSearchOutline className='text-xl '/>
            <input type='text' placeholder={t("search_3")}  className='outline-none text-sm'/>
            </div>

          </label>
          </div>
          <button className=" group flex gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-[14px] dark:text-white/70 items-center text-slate-500 dark:border-gray-600">
            <TbRefresh  className="group-hover:rotate-180 transition-all duration-200" />
            {t("clear_filter")} 
          </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {t("no_notifications_found")}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={deleteNotification}
                onArchive={handleArchive}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("previous")}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("page")} {page} {t("of")} {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("next_2")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationList;