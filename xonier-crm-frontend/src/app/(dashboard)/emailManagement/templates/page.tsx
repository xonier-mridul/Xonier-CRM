"use client";

import React, { JSX, useEffect, useState, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { FaPlus } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import Pagination from "@/src/components/common/pagination";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";

type Template = {
  id: string;
  name: string;
  subject: string;
  privacy: "public" | "private";
  template: string;
};

const Page = (): JSX.Element => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.createTemplate);
  const canRead = hasPermission(PERMISSIONS.readTemplate);
  const canUpdate = hasPermission(PERMISSIONS.updateTemplate);
  const canDelete = hasPermission(PERMISSIONS.deleteTemplate);
  const getTemplates = async () => {
    setIsLoading(true);

    setTimeout(() => {
      setTemplates([
        {
          id: "1",
          name: "Welcome Email",
          subject: "Welcome to our platform",
          privacy: "public",
          template: "Welcome Template",
        },
        {
          id: "2",
          name: "Demo Meeting",
          subject: "Schedule Demo Meeting",
          privacy: "private",
          template: "Meeting Template",
        },
      ]);

      setTotalPages(1);
      setIsLoading(false);
    }, 800);
  };
  const handleSearch = (val: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchVal(val);
    }, 500);
  };

  useEffect(() => {
    getTemplates();
  }, [currentPage, pageLimit, searchVal]);

  return (
    <div className="ml-72 mt-14 p-6">

      {/* HEADER CARD */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
            Email Templates
          </h2>

          <p className="text-gray-500 dark:text-gray-400">
            Create and manage AI email templates
          </p>
        </div>
        
        <Link
          href={(canCreate) ? "/emailManagement/templates/add" : ""}
          className={"bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group " + ((canCreate) ? "" : "opacity-50 cursor-not-allowed")}
          
        >
          <FaPlus className="group-hover:rotate-90 transition-all duration-300" />
          Create Template
        </Link>
      </div>

      {/* TABLE CARD */}
      {canRead && (<div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

        <div className="flex items-center gap-12 justify-between">

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
              All Email Templates
            </h2>

            <p className="text-gray-500 dark:text-gray-400">
              Create, edit or remove templates.
            </p>
          </div>

          <div className="flex items-center gap-6">

            <select
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
            </select>

            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input type="text" className="outline-none bg-transparent" placeholder="Search..." onChange={(e)=>handleSearch(e)} />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full rounded-xl overflow-hidden">
          <thead>
            <tr className="border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">

              <th className="p-4 text-xs text-start text-slate-500 dark:text-slate-100 uppercase">
                Name
              </th>

              <th className="p-4 text-xs text-start text-slate-500 dark:text-slate-100 uppercase">
                Subject
              </th>

              <th className="p-4 text-xs text-start text-slate-500 dark:text-slate-100 uppercase">
                Privacy
              </th>

              <th className="p-4 text-xs text-start text-slate-500 dark:text-slate-100 uppercase">
                Template
              </th>

              <th className="p-4 text-xs text-start text-slate-500 dark:text-slate-100 uppercase">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {!isLoading ? (
              templates.length > 0 ? (
                templates.map((item, i) => {

                  const rr = i % 2 === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      }`}
                    >

                      <td className="p-4">{item.name}</td>

                      <td className="p-4">{item.subject}</td>

                      <td className="p-4">

                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            item.privacy === "public"
                              ? "bg-green-100 text-green-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {item.privacy}
                        </span>

                      </td>

                      <td className="p-4">{item.template}</td>

                      <td className="p-4">

                        <div className="flex items-center gap-2">

                          <Link
                            href={(canRead)?'#':`/emailManagement/templates/view/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 text-green-500"
                          >
                            <FaRegEye className="text-xl" />
                          </Link>

                          <Link
                            href={(canUpdate)?'#':`/emailManagement/templates/update/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200 hover:bg-yellow-300 text-yellow-500"
                          >
                            <MdOutlineEdit className="text-xl" />
                          </Link>

                          <button
                            disabled={(!canDelete)}
                            
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 hover:bg-red-200 text-red-500"
                          >
                            <MdDeleteOutline className="text-xl" />
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    Data not found
                  </td>
                </tr>
              )
            ) : (
              <tr>

                <td className="p-4">
                  <Skeleton width={120} height={28} borderRadius={10} />
                </td>

                <td className="p-4">
                  <Skeleton width={160} height={28} borderRadius={10} />
                </td>

                <td className="p-4">
                  <Skeleton width={80} height={28} borderRadius={10} />
                </td>

                <td className="p-4">
                  <Skeleton width={140} height={28} borderRadius={10} />
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <Skeleton width={32} height={32} borderRadius={10} />
                    <Skeleton width={32} height={32} borderRadius={10} />
                    <Skeleton width={32} height={32} borderRadius={10} />
                  </div>
                </td>

              </tr>
            )}

          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />

      </div>)}
    </div>
  );
};

export default Page;