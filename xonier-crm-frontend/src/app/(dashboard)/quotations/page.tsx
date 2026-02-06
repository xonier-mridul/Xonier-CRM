"use client";
import TabsButton from "@/src/components/ui/TabsButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { Quotation } from "@/src/types/quotations/quote.types";
import axios from "axios";
import Link from "next/link";
import React, { JSX, useState, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { MdOutlineEdit, MdOutlineLeaderboard } from "react-icons/md";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { FaRegEye, FaChevronDown, FaCheck } from "react-icons/fa";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS, QuotationStatus } from "@/src/constants/enum";
import { QuoteService } from "@/src/services/quote.service";
import { formatDate } from "../../utils/date.utils";
import { handleCopy } from "../../utils/clipboard.utils";


const STATUS_CONFIG = {
  [QuotationStatus.DRAFT]: { label: "Draft", color: "bg-gray-600" },
  [QuotationStatus.SENT]: { label: "Sent", color: "bg-blue-600" },
  [QuotationStatus.UPDATED]: { label: "Updated", color: "bg-amber-500" },
  [QuotationStatus.RESEND]: { label: "Resend", color: "bg-indigo-600" },
  [QuotationStatus.VIEWED]: { label: "Viewed", color: "bg-purple-600" },
  [QuotationStatus.ACCEPTED]: { label: "Accepted", color: "bg-green-600" },
  [QuotationStatus.REJECTED]: { label: "Rejected", color: "bg-red-600" },
  [QuotationStatus.EXPIRED]: { label: "Expired", color: "bg-orange-600" },
  [QuotationStatus.DELETE]: { label: "Delete", color: "bg-red-800" },
};

// Available statuses for dropdown (excluding DELETE)
const AVAILABLE_STATUSES = [
  QuotationStatus.DRAFT,
  QuotationStatus.SENT,
  QuotationStatus.UPDATED,
  QuotationStatus.RESEND,
  QuotationStatus.VIEWED,
  QuotationStatus.ACCEPTED,
  QuotationStatus.REJECTED,
  QuotationStatus.EXPIRED,
];

const StatusDropdown = ({
  currentStatus,
  quoteId,
  onStatusUpdate,
}: {
  currentStatus: QuotationStatus;
  quoteId: string;
  onStatusUpdate: (id: string, newStatus: QuotationStatus) => Promise<void>;
}) => {
  const [err, setErr] = useState<string | string[]>("")
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(quoteId, newStatus);
      setIsOpen(false);
    } catch (error) {
      // if (axios.isAxiosError(err)) {
      //   const messages = extractErrorMessages(err);
      //   setErr(messages);
      //   toast.error(`${messages}`);
      // } else {
      //   setErr("Something went wrong");
      //   toast.error("Something went wrong");
      // }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`${
          STATUS_CONFIG[currentStatus]?.color || "bg-gray-500"
        } text-white px-4 py-1.5 text-sm rounded-md capitalize flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-between`}
      >
        <span>{STATUS_CONFIG[currentStatus]?.label || currentStatus}</span>
        {isUpdating ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FaChevronDown
            className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[180px] py-1 max-h-[320px] overflow-y-auto">
          {AVAILABLE_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group ${
                status === currentStatus ? "bg-gray-50 dark:bg-gray-700/50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${STATUS_CONFIG[status].color}`}
                />
                <span className="text-sm dark:text-gray-200 capitalize">
                  {STATUS_CONFIG[status].label}
                </span>
              </div>
              {status === currentStatus && (
                <FaCheck className="text-green-600 text-xs" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quotation[]>([]);
  const [wonQuoteData, setWonQuoteData] = useState<Quotation[]>([]);
  const [lostQuoteData, setLostQuoteData] = useState<Quotation[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wonCurrentPage, setWonCurrentPage] = useState<number>(1);
  const [lostCurrentPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1);

  const { hasPermission } = usePermissions();

  const getQuotationData = async () => {
    setIsLoading(true);
    try {
      const result = await QuoteService.getAll(currentPage, pageLimit);
      if (result.status === 200) {
        const data = result.data.data;
        setQuoteData(data.data);
        setCurrentPage(data.page);
        setPageLimit(data.limit);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabs = async (no: number): Promise<void> => {
    setCurrentTab(no);
    if (no === 2) {
      await getQuotationData();
    }
    if (no === 3) {
      await getQuotationData();
    }
  };

  const updateQuoteStatus = async (
    id: string,
    newStatus: QuotationStatus
  ): Promise<void> => {
    try {
      const result = await QuoteService.updateStatus(id, {
        quotationStatus: newStatus,
      });

      if (result.status === 200) {
        toast.success(
          `Quotation status updated to ${STATUS_CONFIG[newStatus].label} successfully`
        );
        
        
        setQuoteData((prevData) =>
          prevData.map((quote) =>
            quote.id === id ? { ...quote, quotationStatus: newStatus } : quote
          )
        );
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`Failed to update status: ${messages}`);
      } else {
        setErr(["Something went wrong"]);
        toast.error("Failed to update status");
      }
      throw error; 
    }
  };

  useEffect(() => {
    getQuotationData();
  }, []);

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
              All Sales Quotations
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              View and edit quotations
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
              <input type="text" className="outline-none bg-transparent" />
            </div>
            <Link
              href={"/leads"}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group"
            >
              <MdOutlineLeaderboard className="group-hover:rotate-90 transition-all duration-300" />
              All Leads
            </Link>
          </div>
        </div>
        <ul className="w-full flex items-center gap-5">
          <li>
            <TabsButton
              btnTxt="All Quotations"
              dataLen={quoteData.length}
              no={1}
              currentVal={currentTab}
              onClickEvent={() => setCurrentTab(1)}
            />
          </li>
          <li>
            <TabsButton
              btnTxt="Won Deals"
              dataLen={wonQuoteData.length}
              no={2}
              currentVal={currentTab}
              onClickEvent={() => handleTabs(2)}
            />
          </li>
          <li>
            <TabsButton
              btnTxt="Lost Deals"
              dataLen={lostQuoteData.length}
              no={3}
              currentVal={currentTab}
              onClickEvent={() => handleTabs(3)}
            />
          </li>
        </ul>
        {currentTab === 1 && (
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Quote Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Quote Title
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Name
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Quotation Status
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Created Date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ? (
                quoteData &&
                Array.isArray(quoteData) &&
                quoteData.length > 0 ? (
                  quoteData.map((item, i) => {
                    let rr = i % 2 == 0;
                    const date = formatDate(item.createdAt);

                    return (
                      <tr
                        key={item.quoteId}
                        className={`${
                          rr
                            ? "bg-white dark:bg-transparent"
                            : "bg-blue-100/50 dark:bg-slate-500"
                        } w-full`}
                      >
                        <td className="p-4">
                          <Link
                            href={`/deals/view/${item.id}`}
                            className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                          >
                            {item.quoteId}
                          </Link>
                        </td>
                        <td className="flex gap-1 flex-col p-4">
                          <h4 className="capitalize">{item.title}</h4>
                        </td>
                        <td className="p-4">{item.customerName}</td>
                        <td className="p-4">
                          <StatusDropdown
                            currentStatus={item.quotationStatus}
                            quoteId={item.id}
                            onStatusUpdate={updateQuoteStatus}
                          />
                        </td>
                        <td className="p-4">
                          <span className="px-4 py-1.5 rounded-md bg-blue-200 text-sm text-blue-600 font-medium">
                            {date}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {hasPermission(PERMISSIONS.readLead) ? (
                              <Link
                                href={`/quotations/view/${item.id}`}
                                className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                              >
                                <FaRegEye className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 text-green-500 opacity-80 cursor-not-allowed">
                                <FaRegEye className="text-xl" />
                              </span>
                            )}
                            {hasPermission(PERMISSIONS.updateLead) ? (
                              <Link
                                href={`/quotations/update/${item.id}`}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                              >
                                <MdOutlineEdit className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                                <MdOutlineEdit className="text-xl" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-4 text-center" colSpan={6}>
                      Data not found
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 10 }).map((item, i) => {
                  let rr = i % 2 == 0;

                  return (
                    <tr
                      key={i}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="text-center p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Skeleton width={110} height={28} borderRadius={12} />
                          <Skeleton width={140} height={12} borderRadius={10} />
                        </div>
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Skeleton width={32} height={32} borderRadius={10} />
                          <Skeleton width={32} height={32} borderRadius={10} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default page;
