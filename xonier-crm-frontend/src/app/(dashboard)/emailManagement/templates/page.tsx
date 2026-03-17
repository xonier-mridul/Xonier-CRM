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
import { MailService } from "@/src/services/communication/mail.service";

type Template = {
  id: string;
  name: string;
  subject: string;
  status: string;
  html_body: string;
  tags: string[];
};

const Page = (): JSX.Element => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.createTemplate);
  const canRead = hasPermission(PERMISSIONS.readTemplate);
  const canUpdate = hasPermission(PERMISSIONS.updateTemplate);
  const canDelete = hasPermission(PERMISSIONS.deleteTemplate);

  const getTemplates = async () => {
    try {
      setIsLoading(true);

      const res = await MailService.getAllTemplates(
        currentPage,
        pageLimit,
        searchVal
      );

      if (res.status === 200) {
        const responseData = res?.data?.data;

        setTemplates(responseData?.data || []);
        setTotalPages(Number(responseData?.totalPages || 1));
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      setIsDeleting(true);

      await MailService.deleteTemplate(selectedId);

      setTemplates((prev) => prev.filter((t) => t.id !== selectedId));

      setShowDeleteModal(false);
      setSelectedId(null);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setSearchVal(val);
      setCurrentPage(1);
    }, 500);
  };

  useEffect(() => {
    getTemplates();
  }, [currentPage, pageLimit, searchVal]);

  return (
    <div className="ml-72 mt-14 p-6">

      {/* HEADER */}
      <div className="bg-white mb-10 dark:bg-gray-700 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900">
            Email Templates
          </h2>

          <p className="text-gray-500 dark:text-gray-400">
            Create and manage AI email templates
          </p>
        </div>

        <Link
          href={canCreate ? "/emailManagement/templates/add" : "#"}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group ${
            !canCreate && "opacity-50 cursor-not-allowed pointer-events-none"
          }`}
        >
          <FaPlus className="group-hover:rotate-90 transition-all duration-300" />
          Create Template
        </Link>

      </div>

      {/* TABLE */}
      {canRead && (
        <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

          {/* TABLE HEADER */}
          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-xl font-bold dark:text-white">
                All Email Templates
              </h2>

              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove templates
              </p>
            </div>

            <div className="flex items-center gap-6">

              <select
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10"
                value={pageLimit}
                onChange={(e) => setPageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>

              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />

                <input
                  type="text"
                  placeholder="Search..."
                  className="outline-none bg-transparent"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

            </div>

          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-[900px] w-full rounded-xl">

              <thead>
                <tr className="border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">

                  <th className="p-4 text-xs text-start uppercase">Name</th>
                  <th className="p-4 text-xs text-start uppercase">Subject</th>
                  <th className="p-4 text-xs text-start uppercase">Status</th>
                  <th className="p-4 text-xs text-start uppercase">Template</th>
                  <th className="p-4 text-xs text-start uppercase">Tags</th>
                  <th className="p-4 text-xs text-start uppercase">Actions</th>

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
                          className={
                            rr
                              ? "bg-white dark:bg-transparent"
                              : "bg-blue-100/50 dark:bg-slate-500"
                          }
                        >

                          <td className="p-4 whitespace-nowrap">
                            {item.name}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            {item.subject}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                item.status === "draft"
                                  ? "bg-yellow-100 text-yellow-600"
                                  : "bg-green-100 text-green-600"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="p-4 max-w-[260px] truncate whitespace-nowrap">
                            {item.html_body}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <div className="flex gap-1.5 overflow-hidden">
                              {item.tags?.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-[3px] text-[11px] font-semibold rounded-full border border-blue-200 bg-blue-50 text-blue-600"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">

                              <Link
                                href={
                                  canRead
                                    ? `/emailManagement/templates/view/${item.id}`
                                    : "#"
                                }
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 text-green-500"
                              >
                                <FaRegEye className="text-xl" />
                              </Link>

                              <Link
                                href={
                                  canUpdate
                                    ? `/emailManagement/templates/update/${item.id}`
                                    : "#"
                                }
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200 hover:bg-yellow-300 text-yellow-500"
                              >
                                <MdOutlineEdit className="text-xl" />
                              </Link>

                              <button
                                disabled={!canDelete}
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setShowDeleteModal(true);
                                }}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 hover:bg-red-200 text-red-500 disabled:opacity-50"
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
                      <td colSpan={6} className="text-center p-4">
                        Data not found
                      </td>
                    </tr>
                  )
                ) : (
                  <tr>
                    <td className="p-4"><Skeleton width={120} height={28} /></td>
                    <td className="p-4"><Skeleton width={160} height={28} /></td>
                    <td className="p-4"><Skeleton width={80} height={28} /></td>
                    <td className="p-4"><Skeleton width={200} height={28} /></td>
                    <td className="p-4"><Skeleton width={120} height={28} /></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Skeleton width={32} height={32} />
                        <Skeleton width={32} height={32} />
                        <Skeleton width={32} height={32} />
                      </div>
                    </td>
                  </tr>
                )}

              </tbody>

            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />

        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[400px]">

            <h2 className="text-lg font-semibold text-red-600">
              Delete Template
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this template?
            </p>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Page;