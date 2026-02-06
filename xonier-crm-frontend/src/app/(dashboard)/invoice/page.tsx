"use client";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import Link from "next/link";
import React, { JSX, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [err, setErr] = useState<string[] | string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);

  const { hasPermission } = usePermissions();
  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
            Invoices
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            You want to manage your invoices
          </p>
        </div>
      </div>

      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All Invoices
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              edit or remove invoices.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input type="text" className="outline-none" />
            </div>
            {hasPermission(PERMISSIONS.createLead) ? (
              <Link
                href={"/leads/add"}
                className="bg-blue-600 hover:bg-blue-700
                                            text-white px-5 py-2 rounded-md
                                            flex items-center gap-2 group"
              >
                <FaPlus className="group-hover:rotate-90 transition-all duration-300" />{" "}
                Create New Leads
              </Link>
            ) : (
              <span
                className="bg-blue-600 
                                            text-white px-5 py-2 rounded-md
                                            flex items-center gap-2  opacity-80 cursor-not-allowed"
              >
                <FaPlus className=" transition-all duration-300" />
                Create New Enquiry
              </span>
            )}
          </div>
        </div>
        <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Invoice Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Info
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Issue date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                 Due date
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  amount
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Status
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
        </table>
      </div>
    </div>
  );
};

export default page;
