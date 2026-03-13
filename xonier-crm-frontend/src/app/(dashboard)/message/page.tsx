"use client";

import React, { useEffect, useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiRefreshCw } from "react-icons/fi";
import { FaRegEye } from "react-icons/fa";
import { Message } from "@/src/types/communication/message.types";
import MessageService from "@/src/services/communication/message.servicie";

export default function Page() {

  const [logs, setLogs] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setIsLoading(true);

      const res = await MessageService.getAll();

      if (res?.data) {
        setLogs(res.data);
      }

    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredLogs = logs.filter((log) =>
    log.sent_to_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => {
    fetchMessages();
  };

  const getStatusStyle = (status: Message["status"]) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-600";
      case "delivered":
        return "bg-green-100 text-green-600";
      case "queued":
        return "bg-yellow-100 text-yellow-600";
      case "failed":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="ml-72 mt-14 p-6">

      {/* HEADER */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900">
            Message Logs
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Monitor inbound and outbound SMS activity
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
      <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="text-xl font-bold dark:text-white">
              Message Logs
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              SMS delivery status and history
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
            <IoIosSearch className="text-xl" />
            <input
              type="text"
              placeholder="Search phone number"
              className="outline-none bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full rounded-xl overflow-hidden">

            <thead>
              <tr className="border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  To
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  From
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Direction
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Channel
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Status
                </th>
                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Sent by
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Sent At
                </th>

                <th className="p-4 text-xs uppercase text-start whitespace-nowrap text-slate-500 dark:text-slate-100">
                  Action
                </th>

              </tr>
            </thead>

            <tbody>

              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    Loading messages...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log, i) => {

                  const rr = i % 2 === 0;

                  return (
                    <tr
                      key={log.id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      }`}
                    >

                      <td className="p-4 whitespace-nowrap">{log.sent_to_number}</td>

                      <td className="p-4 whitespace-nowrap">{log.sent_from_number}</td>

                      <td className="p-4 whitespace-nowrap capitalize">
                        {log.direction}
                      </td>

                      <td className="p-4 whitespace-nowrap uppercase">
                        {log.channel}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {log.sent_by?.ref || "-"}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {log.sent_at || "-"}
                      </td>

                      <td className="p-4 whitespace-nowrap">

                        <a
                          href={`/message/${log.id}`}
                          className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 text-green-600"
                        >
                          <FaRegEye className="text-xl" />
                        </a>

                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    No SMS logs found
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