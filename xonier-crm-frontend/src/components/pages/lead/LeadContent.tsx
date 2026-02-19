"use client";
import React, { JSX, useState, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import Link from "next/link";
import { MdOutlineEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaXmark, FaCheck } from "react-icons/fa6";
import { usePermissions } from "@/src/hooks/usePermissions";
import { LEAD_SOURCE_TYPE, PERMISSIONS, SALES_STATUS } from "@/src/constants/enum";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import LeadService from "@/src/services/lead.service";
import { Lead } from "@/src/types/leads/leads.types";
import Skeleton from "react-loading-skeleton";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { LiaMailBulkSolid } from "react-icons/lia";
import { ParamValue } from "next/dist/server/request/params";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import SensitiveField from "@/src/components/common/SensitiveField";
import TabsButton from "@/src/components/ui/TabsButton";
import { FaRegHandshake } from "react-icons/fa";
import { FaHandshake } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import Pagination from "@/src/components/common/pagination";
import { useSearchParams } from "next/navigation";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";
import { AuthService } from "@/src/services/auth.service";
import { User } from "@/src/types";
import { MdDeleteOutline, MdOutlinePersonAdd } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";

const LeadContent = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead[]>([]);
  const [wonLeadData, setWonLeadData] = useState<Lead[]>([]);
  const [lostLeadData, setLostLeadData] = useState<Lead[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentWonPage, setWonCurrentPage] = useState<number>(1);
  const [currentLostPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [wonTotalPages, setWonTotalPages] = useState<number>(1);
  const [lostTotalPages, setLostTotalPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1);
  const [userData, setUserData] = useState<User[]>([]);

  // ── Bulk assign state ──────────────────────────────────────────
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [showAssignBar, setShowAssignBar] = useState<boolean>(false);
  // ──────────────────────────────────────────────────────────────

  const { hasPermission } = usePermissions();
  const auth = useSelector((state: RootState) => state.auth);
  const searchParams = useSearchParams();
  const userid = searchParams.get("userid");
  const query = userid ? { userid } : {};

  // ── Current tab data helper ────────────────────────────────────
  const currentLeadData =
    currentTab === 1 ? leadData : currentTab === 2 ? wonLeadData : lostLeadData;
  // ──────────────────────────────────────────────────────────────

  const getLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentPage, pageLimit, query);
      if (result.status === 200) {
        const data = result.data.data;
        setLeadData(data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        setTotalPages(Number(data.totalPages));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  };

  const getWonLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentWonPage, wonPageLimit, {
        status: SALES_STATUS.WON,
        ...query,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setWonLeadData(data.data);
        setWonCurrentPage(Number(data.page));
        setWonPageLimit(Number(data.limit));
        setWonTotalPages(Number(data.totalPages));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLostLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentLostPage, lostPageLimit, {
        status: SALES_STATUS.LOST,
        ...query,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setLostLeadData(data.data);
        setLostCurrentPage(Number(data.page));
        setLostPageLimit(Number(data.limit));
        setLostTotalPages(Number(data.totalPages));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserData = async (): Promise<void> => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) setUserData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  useEffect(() => { getLeadData(); }, [currentPage, pageLimit]);
  useEffect(() => { getWonLeadData(); }, [currentWonPage, wonPageLimit]);
  useEffect(() => { getLostLeadData(); }, [currentLostPage, lostPageLimit]);
  useEffect(() => { getUserData(); }, []);


  const assignableLeads = currentLeadData.filter(
    (lead) =>
      lead.leadSource === LEAD_SOURCE_TYPE.ADMIN_CREATED &&
      !lead.assignedTo?.length
  );

  const isAllSelected =
    assignableLeads.length > 0 &&
    assignableLeads.every((lead) => selectedLeadIds.has(lead.id));

  const isIndeterminate =
    selectedLeadIds.size > 0 && !isAllSelected;

  const handleSelectAll = (): void => {
    if (isAllSelected) {
      // Deselect all assignable leads on current page
      const newSet = new Set(selectedLeadIds);
      assignableLeads.forEach((lead) => newSet.delete(lead.id));
      setSelectedLeadIds(newSet);
    } else {
      // Select all assignable leads on current page
      const newSet = new Set(selectedLeadIds);
      assignableLeads.forEach((lead) => newSet.add(lead.id));
      setSelectedLeadIds(newSet);
    }
  };

  const handleSelectOne = (id: string): void => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
    if (newSet.size > 0) setShowAssignBar(true);
    else setShowAssignBar(false);
  };

  const clearSelection = (): void => {
    setSelectedLeadIds(new Set());
    setSelectedUserId("");
    setShowAssignBar(false);
  };
  // ──────────────────────────────────────────────────────────────

  // ── Bulk assign handler ────────────────────────────────────────
  const handleAssignLeads = async (): Promise<void> => {
    if (!selectedUserId) {
      toast.warning("Please select a user to assign leads to");
      return;
    }
    if (selectedLeadIds.size === 0) {
      toast.warning("Please select at least one lead");
      return;
    }

    setIsAssigning(true);
    try {
      const result = await LeadService.assignBulkLead(
        selectedUserId,
        Array.from(selectedLeadIds)
      );
      if (result.status === 200) {
        const { assigned, skipped, skippedRecords } = result.data.data;
        toast.success(`${assigned} lead(s) assigned successfully`);
        if (skipped > 0) {
          toast.info(`${skipped} lead(s) were skipped`);
          console.info("Skipped records:", skippedRecords);
        }
        clearSelection();
        await getLeadData();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsAssigning(false);
    }
  };
  // ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: ParamValue, name: string): Promise<void> => {
    try {
      const confirm = await ConfirmPopup({
        text: `Are you want to delete ${name} lead`,
        title: "Are you sure",
        btnTxt: "Yes, delete",
      });
      if (confirm) {
        const result = await LeadService.delete(String(id));
        if (result.status === 200) {
          toast.success(`${name} lead deleted successfully`);
          setLeadData((prev) => prev.filter((item) => item.id !== id));
          setCurrentTab(1);
          await getLeadData();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    }
  };

  const handleTabs = async (no: number): Promise<void> => {
    setCurrentTab(no);
    clearSelection(); // clear selection when switching tabs
    if (no === 2) await getWonLeadData();
    if (no === 3) await getLostLeadData();
  };

  const handlePageLimit = (val: number): void => {
    if (currentTab === 1) { setCurrentPage(1); setPageLimit(val); }
    else if (currentTab === 2) { setWonCurrentPage(1); setWonPageLimit(val); }
    else if (currentTab === 3) { setLostCurrentPage(1); setLostPageLimit(val); }
  };

  // ── Indeterminate checkbox ref ─────────────────────────────────
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);
  // ──────────────────────────────────────────────────────────────

  const renderTableRows = (data: Lead[]) => {
    if (!isLoading && data.length === 0) {
      return (
        <tr>
          <td className="p-4 text-center" colSpan={8}>
            Data not found
          </td>
        </tr>
      );
    }

    if (isLoading) {
      return Array.from({ length: 10 }).map((_, i) => {
        const rr = i % 2 === 0;
        return (
          <tr
            key={i}
            className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}
          >
            {hasPermission(PERMISSIONS.assignLead) && currentTab === 1 && (
              <td className="p-4 text-center">
                <Skeleton width={18} height={18} borderRadius={4} />
              </td>
            )}
            <td className="text-center p-4">
              <Skeleton width={120} height={30} borderRadius={14} />
            </td>
            <td className="p-4">
              <div className="flex flex-col gap-1">
                <Skeleton width={110} height={28} borderRadius={12} />
                <Skeleton width={140} height={12} borderRadius={10} />
              </div>
            </td>
            <td className="p-4"><Skeleton width={110} height={30} borderRadius={14} /></td>
            <td className="p-4"><Skeleton width={80} height={30} borderRadius={14} /></td>
            <td className="p-4"><Skeleton width={120} height={30} borderRadius={14} /></td>
            <td className="p-4"><Skeleton width={110} height={30} borderRadius={14} /></td>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <Skeleton width={32} height={32} borderRadius={10} />
                <Skeleton width={32} height={32} borderRadius={10} />
                <Skeleton width={32} height={32} borderRadius={10} />
              </div>
            </td>
          </tr>
        );
      });
    }

    return data.map((item, i) => {
      const rr = i % 2 === 0;
      const isChecked = selectedLeadIds.has(item.id);
      const maskMail = maskEmail(item.email);
      const maskNumber = maskPhone(item.phone);

      return (
        <tr
          key={item.lead_id}
          className={`${
            isChecked
              ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500"
              : rr
              ? "bg-white dark:bg-transparent"
              : "bg-blue-100/50 dark:bg-slate-500"
          } w-full transition-colors duration-150`}
        >
          {/* ── Checkbox — only on All Leads tab, with assignLead permission ── */}
          {hasPermission(PERMISSIONS.assignLead) && currentTab === 1 && (
            <td className="p-4 text-center">
              {item.leadSource === LEAD_SOURCE_TYPE.ADMIN_CREATED && !item.assignedTo?.length ? (
                // Admin-created + not yet assigned → show checkbox
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isChecked}
                    onChange={() => handleSelectOne(item.id)}
                  />
                  <div
                    className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                      ${isChecked
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"
                      }`}
                  >
                    {isChecked && <FaCheck className="text-white text-[9px]" />}
                  </div>
                </label>
              ) : item.assignedTo?.length ? (
                // Already assigned → green check badge
                <span
                  className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-green-100 dark:bg-green-900/30"
                  title="Already assigned"
                >
                  <FaCheck className="text-green-500 text-[8px]" />
                </span>
              ) : (
                // Self-created → dash, not assignable
                <span
                  className="inline-flex items-center justify-center w-[18px] h-[18px]"
                  title="Self-created leads cannot be assigned"
                >
                  <span className="block w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </span>
              )}
            </td>
          )}

          <td className="p-4">
            <Link
              href={`/leads/view/${item.id}`}
              className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
            >
              {item.lead_id}
            </Link>
          </td>
          <td className="flex gap-1 flex-col p-4">
            <h4 className="capitalize">{item.fullName}</h4>
            <SensitiveField
              value={item.email}
              link={`mailto:${item.email}`}
              maskedValue={maskMail}
              fontSize="sm"
            />
          </td>
          <td className="p-4">
            <SensitiveField
              value={item.phone}
              link={`tel:${item.phone}`}
              maskedValue={maskNumber}
              fontSize="sm"
            />
          </td>
          <td className="p-4">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-500 text-sm">
              {item.projectType}
            </span>
          </td>
          <td className="p-4">
            <span className="bg-yellow-400 text-slate-800 px-3 py-1.5 text-sm rounded-sm">
              {item.source}
            </span>
          </td>
          <td className="p-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize
                ${item.status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : item.status === "contacted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : item.status === "qualified" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : item.status === "proposal" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : item.status === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : item.status === "lost" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : item.status === "delete" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                }`}
            >
              {item.status}
            </span>
          </td>
          <td>
            <div className="flex items-center gap-2">
              {hasPermission(PERMISSIONS.readLead) ? (
                <Link
                  href={`/leads/view/${item.id}`}
                  className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                >
                  <FaRegEye className="text-xl" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 text-green-500 opacity-80 cursor-not-allowed">
                  <FaRegEye className="text-xl" />
                </span>
              )}
              {hasPermission(PERMISSIONS.updateLead) && (item.status !== SALES_STATUS.DELETE) ? (
                <Link
                  href={`/leads/update/${item.id}`}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                >
                  <MdOutlineEdit className="text-xl" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                  <MdOutlineEdit className="text-xl" />
                </span>
              )}
              {(item.status !== SALES_STATUS.LOST && hasPermission(PERMISSIONS.createDeal)) ? (
                (item.status !== SALES_STATUS.DELETE) ? (
                  item.inDeal === false ? (
                    <Link
                      href={`/leads/make-deal/${item.id}`}
                      className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-blue-100 text-blue-500 hover:bg-blue-200 hover:scale-104"
                    >
                      <FaRegHandshake className="text-xl" />
                    </Link>
                  ) : (
                    <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-900 text-white hover:bg-blue-950 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-default" title="Already on deal">
                      <FaHandshake className="text-xl" />
                    </span>
                  )
                ) : (
                  <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed" title="Already on deal">
                    <FaHandshake className="text-xl" />
                  </span>
                )
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed">
                  <FaHandshake className="text-xl" />
                </span>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="ml-72 mt-14 p-6">
        {/* ── Bulk Create Card ── */}
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
              Add bulk Leads
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              You want to create bulk Leads via CSV file
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            {hasPermission(PERMISSIONS.createLead) ? (
              <PrimaryButton text="Create Bulk Leads" link="/leads/bulk" icon={<LiaMailBulkSolid />} />
            ) : (
              <span className="bg-blue-400 cursor-not-allowed text-white px-5 py-2.5 rounded-md flex items-center w-fit gap-2">
                <LiaMailBulkSolid /> Create Bulk Leads
              </span>
            )}
          </div>
        </div>

        {/* ── Main Table Card ── */}
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
          
          {/* ── Header row ── */}
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
                All Sales Leads
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove Leads.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
                onChange={(e) => handlePageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input type="text" className="outline-none bg-transparent" />
              </div>
              {hasPermission(PERMISSIONS.createLead) ? (
                <Link
                  href="/leads/add"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group"
                >
                  <FaPlus className="group-hover:rotate-90 transition-all duration-300" />
                  Create New Leads
                </Link>
              ) : (
                <span className="bg-blue-600 text-white px-5 py-2 rounded-md flex items-center gap-2 opacity-80 cursor-not-allowed">
                  <FaPlus /> Create New Enquiry
                </span>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <ul className="w-full flex items-center gap-5">
            <li>
              <TabsButton btnTxt="All Leads" dataLen={leadData.length} no={1} currentVal={currentTab} onClickEvent={() => setCurrentTab(1)} />
            </li>
            <li>
              <TabsButton btnTxt="Won Leads" dataLen={wonLeadData.length} no={2} currentVal={currentTab} onClickEvent={() => handleTabs(2)} />
            </li>
            <li>
              <TabsButton btnTxt="Lost Leads" dataLen={lostLeadData.length} no={3} currentVal={currentTab} onClickEvent={() => handleTabs(3)} />
            </li>
          </ul>

          
          {selectedLeadIds.size > 0 && (
            <div className="w-full animate-in slide-in-from-bottom-2 duration-200">
              <div className="w-full bg-blue-600 dark:bg-blue-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                
                {/* Left: selection info */}
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <HiOutlineUserGroup className="text-white text-lg" />
                    <span className="text-white text-sm font-semibold">
                      {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-blue-200 hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors"
                  >
                    <FaXmark className="text-xs" /> Clear selection
                  </button>
                </div>

                {/* Right: user select + assign button */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    {!selectedUserId && (
                      <span className="text-blue-200 text-[11px] ml-1">
                        ← Select a user first
                      </span>
                    )}
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg border-0 outline-none text-sm min-w-55 cursor-pointer shadow-sm"
                    >
                      <option value="" disabled>
                        — Select user to assign —
                      </option>
                      {userData.map((user) => {

                       const userRole = user.userRole[0].name
                       if(user.userRole[0].code === SUPER_ADMIN_ROLE_CODE){
                        return null
                       }
                       return  <option key={user.id} value={user.id} className="capitalize">
                          {user.firstName} {user.lastName ?? ""} 
                          {userRole? ` · ${userRole}` : ""}
                        </option>
})}
                    </select>
                  </div>

                  <button
                    onClick={handleAssignLeads}
                    disabled={!selectedUserId || isAssigning}
                    className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed
                               px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-150 shadow-sm"
                  >
                    {isAssigning ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Assigning...
                      </>
                    ) : (
                      <>
                        <MdOutlinePersonAdd className="text-lg" />
                        Assign Leads
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Table ── */}
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                {/* ── Select All checkbox — only visible with assignLead permission ── */}
                {hasPermission(PERMISSIONS.assignLead) && currentTab === 1 && (
                  <th className="p-4 w-12">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="sr-only peer"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      />
                      <div
                        className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                          ${isAllSelected
                            ? "bg-blue-600 border-blue-600"
                            : isIndeterminate
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"
                          }`}
                      >
                        {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                        {isIndeterminate && (
                          <span className="block w-2.5 h-0.5 bg-white rounded-full" />
                        )}
                      </div>
                    </label>
                  </th>
                )}
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Lead Id</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Client Info</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Phone</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Project Type</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Source</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Status</th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows(currentLeadData)}
            </tbody>
          </table>

          {/* ── Pagination ── */}
          {currentTab === 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              className="w-full"
            />
          )}
          {currentTab === 2 && (
            <Pagination
              currentPage={currentWonPage}
              totalPages={wonTotalPages}
              onPageChange={(page) => setWonCurrentPage(page)}
              className="w-full"
            />
          )}
          {currentTab === 3 && (
            <Pagination
              currentPage={currentLostPage}
              totalPages={lostTotalPages}
              onPageChange={(page) => setLostCurrentPage(page)}
              className="w-full"
            />
          )}
        </div>
      </div>
    </>
  );
};

export default LeadContent;