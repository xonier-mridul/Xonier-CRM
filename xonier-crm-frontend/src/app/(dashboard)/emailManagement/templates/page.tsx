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
import { useTranslation } from "react-i18next";
import { Trash2, X } from "lucide-react";

type Template = {
  id: string;
  name: string;
  subject: string;
  status: string;
  html_body: string;
  tags: string[];
};

const Page = (): JSX.Element => {
  const { t } = useTranslation();
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

  console.log("data:", templates);

  return (
    <div>
      {/* HEADER */}
      <div className="bg-white mb-4 dark:bg-gray-900 flex gap-5 p-6 rounded-xl border border-slate-900/10 w-full items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900">
            {t("email_templates")}
          </h2>

          <p className="text-gray-500 dark:text-gray-400">
            {t("create_and_manage_ai_email_templates")}
          </p>
        </div>

        <Link
          href={canCreate ? "/emailManagement/templates/add" : "#"}
          className={`bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group ${
            !canCreate && "opacity-50 cursor-not-allowed pointer-events-none"
          }`}
        >
          <FaPlus className="group-hover:rotate-90 transition-all duration-300" />
          {t("create_template")}
        </Link>
      </div>

      {/* TABLE */}
      {canRead && (
        <div className="bg-white dark:bg-gray-900 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">
          {/* TABLE HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                {t("all_email_templates")}
              </h2>

              <p className="text-gray-500 dark:text-gray-400">
                {t("create_edit_or_remove_templates")}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <select
                className="bg-slate-50 outline-none dark:bg-gray-500 px-3 py-2.5 rounded-lg border border-slate-900/10"
                value={pageLimit}
                onChange={(e) => setPageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>

              <div className="bg-slate-50 dark:bg-gray-500 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl text-slate-500 dark:text-slate-400" />

                <input
                  type="text"
                  placeholder={t("search_3")}
                  className="outline-none bg-transparent dark:text-white"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full ">
            <table className="min-w-[900px] w-full rounded-xl">
              <thead>
                <tr className="border-b-2 dark:text-slate-200 text-slate-600 border-zinc-300 bg-slate-300 dark:bg-gray-800">
                  <th className="p-4 text-xs text-start rounded-tl-2xl ">
                    {t("name_2")}
                  </th>
                  <th className="p-4 text-xs text-start ">{t("subject")}</th>
                  <th className="p-4 text-xs text-start ">{t("status")}</th>
 
                  <th className="p-4 text-xs text-start ">{t("tags")}</th>
                  <th className="p-4 text-xs text-start rounded-tr-2xl ">
                    {t("actions")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {!isLoading ? (
                  templates.length > 0 ? (
                    templates.map((item, i) => {
                      const rr = i % 2 === 0;

                      return (
                        <TemplateRow
                          key={item.id}
                          item={item}
                          isEven={rr}
                          canRead={canRead}
                          canUpdate={canUpdate}
                          canDelete={canDelete}
                          onDelete={() => {
                            setSelectedId(item.id);
                            setShowDeleteModal(true);
                          }}
                        />
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center p-4 text-slate-500"
                      >
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-4">
                        <Skeleton width={120} height={28} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={160} height={28} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={28} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={200} height={28} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={120} height={28} />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Skeleton width={32} height={32} />
                          <Skeleton width={32} height={32} />
                          <Skeleton width={32} height={32} />
                        </div>
                      </td>
                    </tr>
                  ))
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
        <div
          onClick={() => !isDeleting && setShowDeleteModal(false)}
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 dark:bg-slate-950/55 backdrop-blur-[2px] p-4"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/[0.06]"
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25">
                  <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15.5px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-slate-50">
                      {t("delete_template")}
                    </h2>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteModal(false)}
                      aria-label={t("cancel")}
                      className="-mr-1.5 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-[1.55] text-slate-500 dark:text-slate-400">
                    {t("are_you_sure_you_want_to_delete_this_template")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-[0_1px_2px_rgba(225,29,72,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

// ============================================
// Separate Component for Template Row
// ============================================
type TemplateRowProps = {
  item: Template;
  isEven: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
};

const TemplateRow = ({
  item,
  isEven,
  canRead,
  canUpdate,
  canDelete,
  onDelete,
}: TemplateRowProps) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const el = tagsRef.current;
      if (el) {
        setIsOverflowing(el.scrollWidth > el.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [item.tags]);

  return (
    <tr
      className={
        isEven
          ? "bg-white dark:bg-gray-800/30"
          : "bg-slate-100/50 dark:bg-slate-700/30"
      }
    >
      <td className="p-4 whitespace-nowrap">{item.name}</td>

      <td className="p-4 whitespace-nowrap">{item.subject}</td>

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


      <td className="p-4">
        <div className="relative max-w-[400px] group">
          <div
            ref={tagsRef}
            className="flex gap-1.5 overflow-hidden whitespace-nowrap"
          >
            {item.tags?.map((tag, index) => (
              <span
                key={index}
                className="shrink-0 px-3 py-[3px] text-[11px] font-semibold rounded-full border border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Fade overlay */}
          {isOverflowing && (
            <>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-700 via-white/95 dark:via-gray-700/95 to-transparent pointer-events-none flex items-center justify-end pr-1">
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">
                  ...
                </span>
              </div>

              {/* Hover to show all tags tooltip */}
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-w-xs">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </td>

      <td className="p-4">
        <div className="flex items-center gap-2">
          <Link
            href={
              canRead ? `/emailManagement/templates/view/${item.id}` : "#"
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
            className={
              "h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200 hover:bg-yellow-300 text-yellow-500 " +
              (canUpdate ? "" : "opacity-50 cursor-not-allowed")
            }
          >
            <MdOutlineEdit className="text-xl" />
          </Link>

          <button
            disabled={!canDelete}
            onClick={onDelete}
            className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 hover:bg-red-200 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdDeleteOutline className="text-xl" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Page;