"use client";

import React, { useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiRefreshCw } from "react-icons/fi";
import { FaRegEye } from "react-icons/fa";
import { useRouter } from "next/navigation";

type Email = {
  id: number;
  to: string;
  subject: string;
  template: string;
  status: "SENT" | "PENDING" | "FAILED";
  sentAt: string;
};

const mockEmails: Email[] = [
  {
    id: 1,
    to: "john@example.com",
    subject: "Welcome to our platform",
    template: "Welcome Template",
    status: "SENT",
    sentAt: "2026-03-12 10:30",
  },
  {
    id: 2,
    to: "emma@company.com",
    subject: "Meeting Demo Invitation",
    template: "Demo Meeting Template",
    status: "PENDING",
    sentAt: "-",
  },
  {
    id: 3,
    to: "david@startup.com",
    subject: "Follow up regarding our demo",
    template: "Follow Up Template",
    status: "FAILED",
    sentAt: "2026-03-11 17:10",
  },
];

export default function Page() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState(mockEmails);

  const filteredEmails = emails.filter(
    (email) =>
      email.to.toLowerCase().includes(search.toLowerCase()) ||
      email.subject.toLowerCase().includes(search.toLowerCase()) ||
      email.template.toLowerCase().includes(search.toLowerCase())
  );

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
    setEmails([...mockEmails]);
  };

  return (
    <div className="ml-72 mt-14 p-6">

      {/* HEADER CARD */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
            Email Outbox
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            View all sent emails from the system
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

        <div className="flex items-center gap-12 justify-between">

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
              All Sent Emails
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              View email history and delivery status.
            </p>
          </div>

          <div className="flex items-center gap-6">

            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input
                type="text"
                placeholder="Search email..."
                className="outline-none bg-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

        </div>

        {/* TABLE */}
        <table className="w-full rounded-xl overflow-hidden">

          <thead>
            <tr className="border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                To
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Subject
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Template
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Status
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Sent At
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {filteredEmails.length > 0 ? (
              filteredEmails.map((email, i) => {

                const rr = i % 2 === 0;

                return (
                  <tr
                    key={email.id}
                    className={`${
                      rr
                        ? "bg-white dark:bg-transparent"
                        : "bg-blue-100/50 dark:bg-slate-500"
                    }`}
                  >

                    <td className="p-4">{email.to}</td>

                    <td className="p-4">{email.subject}</td>

                    <td className="p-4">{email.template}</td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                          email.status
                        )}`}
                      >
                        {email.status}
                      </span>
                    </td>

                    <td className="p-4">{email.sentAt}</td>

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
                  No emails found
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
}