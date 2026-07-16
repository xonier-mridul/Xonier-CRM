"use client";

import React, { useEffect, useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiRefreshCw } from "react-icons/fi";
import { FaRegEye } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import EmailService from "@/src/services/communication/mail.service";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import Skeleton from "react-loading-skeleton";
import { useTranslation } from "react-i18next";

type Email = {
  id: string;
  to: string;
  bcc_emails: string[];
  cc_emails: string[];
  from_email: string;
  from_name: string;
  provider: string;
  sent_at: string;
  send_by: string;
  status: string;
  subject: string;
  template: {
    id: string;
    name: string;
    subject: string;
  };
  to_emails: string[];
  updated_at: string;
};


export default function Page() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [isloading, setIsloading] = useState<boolean>(true);

  const getStatusStyle = (status: Email["status"]) => {
    switch (status) {
      case "SENT":
        return "bg-green-100 text-green-600";
      case "PENDING":
        return "bg-yellow-100 text-yellow-600";
      case "FAILED":
        return "bg-red-100 text-red-600";
      default:
        return "";
    }
  };

  const handleRefresh = () => {
    setIsloading(true)
    featchEmails();
  };
  useEffect(() => {
    featchEmails();
  }, []);
  const featchEmails = async () => {
    try {
      const result = await EmailService.getAll();
      if (result.status === 200) {
        const data = result.data.data?.data;
        setEmails(data);
      }
    } catch (error) {
      toast.error("Failed to load emails");
    }
    finally {
      setIsloading(false)
    }
  };
  return (
    <div className="ml-72 mt-14 p-6">

      {/* HEADER CARD */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
            {t("email_outbox")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t("view_all_sent_emails_from_the")}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <FiRefreshCw />
          {t("refresh")}
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

        <div className="flex items-center gap-12 justify-between">

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
              {t("all_sent_emails")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t("view_email_history_and_delivery_status")}
            </p>
          </div>

          <div className="flex items-center gap-6">

            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input
                type="text"
                placeholder={t("search_email")}
                className="outline-none bg-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-scroll">
          <table className="w-full rounded-xl  text-nowrap">

            <thead>
              <tr className="border-b-2 border-zinc-300 bg-slate-300 dark:bg-gray-800">

                <th className="p-4 rounded-tl-3xl text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("to_2")}
                </th>
                <th className="p-4  text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("from")}
                </th>

                <th className="p-4  text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("subject")}
                </th>

                <th className="p-4  text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("template")}
                </th>

                <th className="p-4  text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("status")}
                </th>

                <th className="p-4  text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("sent_at")}
                </th>

                <th className="p-4 rounded-tr-3xl   text-xs text-start text-slate-500 dark:text-slate-100">
                  {t("actions")}
                </th>

              </tr>
            </thead>

            
              <tbody>
                {isloading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>

                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={180} height={30} borderRadius={14} />
                      </td>

                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={140} height={30} borderRadius={14} />
                      </td>

                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={100} height={30} borderRadius={14} />
                      </td>

                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="text-center p-6 text-gray-500">
                        <Skeleton width={32} height={32} borderRadius={14} />
                      </td>

                      <td className="p-6 text-gray-500">
                        <Skeleton width={32} height={32} borderRadius={10} />
                      </td>
                    </tr>
                  ))
                ) : emails?.length > 0 ? (
                  emails.map((email, i) => {
                    const rr = i % 2 === 0;

                    return (
                      <tr
                        key={email.id}
                        className={`${rr
                            ? "bg-white dark:bg-transparent"
                            : "bg-slate-100/50 dark:bg-slate-500"
                          }`}
                      >
                        <td className="p-4">{email.to_emails.join(", ")}</td>
                        <td className="p-4">{email.from_email}</td>

                        <td className="p-4">{email.subject}</td>

                        <td className="p-4">{email.template?.name}</td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                              email.status
                            )}`}
                          >
                            <StatusBadge status={email.status} />
                          </span>
                        </td>

                        <td className="p-4">
                          <CreatedAt timestamp={email.sent_at} />
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(`/emailManagement/view/${email.id}`)
                              }
                              className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 text-green-600"
                            >
                              <FaRegEye className="text-xl" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-6 text-gray-500">
                      {t("no_emails_found")}
                    </td>
                  </tr>
                )}
              </tbody>


          </table>
        </div>

      </div>
    </div>
  );
}