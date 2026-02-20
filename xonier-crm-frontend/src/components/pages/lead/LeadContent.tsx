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
import { FaRegHandshake, FaHandshake } from "react-icons/fa";
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
import { TbArrowsExchange } from "react-icons/tb";
import { RiUserSharedLine } from "react-icons/ri";


const TAB = { ALL: 1, WON: 2, LOST: 3, ASSIGNED: 4 } as const;


const AssignedToPill = ({
  user,
}: {
  user: { firstName?: string; lastName?: string } | null | undefined;
}) => {
  if (!user)
    return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;
  const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300
        border border-amber-200 dark:border-amber-700/40 capitalize"
    >
      <span className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 ">
        {initials || "?"}
      </span>
      {name || "Unknown"}
    </span>
  );
};

const LeadContent = (): JSX.Element => {
 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead[]>([]);
  const [wonLeadData, setWonLeadData] = useState<Lead[]>([]);
  const [lostLeadData, setLostLeadData] = useState<Lead[]>([]);
  const [assignedLeadData, setAssignedLeadData] = useState<Lead[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentTab, setCurrentTab] = useState<number>(TAB.ALL);
  const [userData, setUserData] = useState<User[]>([]);


  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentWonPage, setWonCurrentPage] = useState<number>(1);
  const [currentLostPage, setLostCurrentPage] = useState<number>(1);
  const [currentAssignedPage, setAssignedCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [assignedPageLimit, setAssignedPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [wonTotalPages, setWonTotalPages] = useState<number>(1);
  const [lostTotalPages, setLostTotalPages] = useState<number>(1);
  const [assignedTotalPages, setAssignedTotalPages] = useState<number>(1);


  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);


  const [selectedReassignIds, setSelectedReassignIds] = useState<Set<string>>(new Set());
  const [selectedReassignUserId, setSelectedReassignUserId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  const { hasPermission } = usePermissions();
  const searchParams = useSearchParams();
  const userid = searchParams.get("userid");
  const query = userid ? { userid } : {};

  const currentLeadData =
    currentTab === TAB.ALL ? leadData
    : currentTab === TAB.WON ? wonLeadData
    : currentTab === TAB.LOST ? lostLeadData
    : assignedLeadData;


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
    } finally { setIsLoading(false); }
  };

  const getWonLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentWonPage, wonPageLimit, { status: SALES_STATUS.WON, ...query });
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
    } finally { setIsLoading(false); }
  };

  const getLostLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentLostPage, lostPageLimit, { status: SALES_STATUS.LOST, ...query });
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
    } finally { setIsLoading(false); }
  };

  const getAssignedLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      
      const result = await LeadService.getAll(currentAssignedPage, assignedPageLimit, {
        isAssigned: true,
        ...query,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setAssignedLeadData(data.data);
        setAssignedCurrentPage(Number(data.page));
        setAssignedPageLimit(Number(data.limit));
        setAssignedTotalPages(Number(data.totalPages));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally { setIsLoading(false); }
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
  useEffect(() => { getAssignedLeadData(); }, [currentAssignedPage, assignedPageLimit]);
  useEffect(() => { getUserData(); }, []);


  const assignableLeads = currentLeadData.filter(
    (l) => l.leadSource === LEAD_SOURCE_TYPE.ADMIN_CREATED && !l.assignedTo?.length
  );
  const isAllSelected = assignableLeads.length > 0 && assignableLeads.every((l) => selectedLeadIds.has(l.id));
  const isIndeterminate = selectedLeadIds.size > 0 && !isAllSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate; }, [isIndeterminate]);

  const handleSelectAll = () => {
    const s = new Set(selectedLeadIds);
    if (isAllSelected) assignableLeads.forEach((l) => s.delete(l.id));
    else assignableLeads.forEach((l) => s.add(l.id));
    setSelectedLeadIds(s);
  };
  const handleSelectOne = (id: string) => {
    const s = new Set(selectedLeadIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeadIds(s);
  };
  const clearAssignSelection = () => { setSelectedLeadIds(new Set()); setSelectedUserId(""); };

  const handleAssignLeads = async (): Promise<void> => {
    if (!selectedUserId) { toast.warning("Please select a user to assign leads to"); return; }
    if (selectedLeadIds.size === 0) { toast.warning("Please select at least one lead"); return; }
    setIsAssigning(true);
    try {
      const result = await LeadService.assignBulkLead(selectedUserId, Array.from(selectedLeadIds));
      if (result.status === 200) {
        const { assigned, skipped, skippedRecords } = result.data.data;
        toast.success(`${assigned} lead(s) assigned successfully`);
        if (skipped > 0) { toast.info(`${skipped} lead(s) were skipped`); console.info("Skipped:", skippedRecords); }
        clearAssignSelection();
        await Promise.all([getLeadData(), getAssignedLeadData()]);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    } finally { setIsAssigning(false); }
  };


  const allAssignedSelected = assignedLeadData.length > 0 && assignedLeadData.every((l) => selectedReassignIds.has(l.id));
  const isReassignIndeterminate = selectedReassignIds.size > 0 && !allAssignedSelected;
  const reassignSelectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (reassignSelectAllRef.current) reassignSelectAllRef.current.indeterminate = isReassignIndeterminate; }, [isReassignIndeterminate]);

  const handleReassignSelectAll = () => {
    const s = new Set(selectedReassignIds);
    if (allAssignedSelected) assignedLeadData.forEach((l) => s.delete(l.id));
    else assignedLeadData.forEach((l) => s.add(l.id));
    setSelectedReassignIds(s);
  };
  const handleReassignSelectOne = (id: string) => {
    const s = new Set(selectedReassignIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedReassignIds(s);
  };
  const clearReassignSelection = () => { setSelectedReassignIds(new Set()); setSelectedReassignUserId(""); };

  const handleReassignLeads = async (): Promise<void> => {
    if (!selectedReassignUserId) { toast.warning("Please select a user to reassign leads to"); return; }
    if (selectedReassignIds.size === 0) { toast.warning("Please select at least one lead to reassign"); return; }
    setIsReassigning(true);
    try {
      const result = await LeadService.reassignBulkLead({
        userId: selectedReassignUserId,
        leadsId: Array.from(selectedReassignIds),
      });
      if (result.status === 200) {
        const { reassigned, skipped, skippedRecords } = result.data.data;
        toast.success(`${reassigned} lead(s) reassigned successfully`);
        if (skipped > 0) { toast.info(`${skipped} lead(s) skipped`); console.info("Skipped:", skippedRecords); }
        clearReassignSelection();
        await getAssignedLeadData();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    } finally { setIsReassigning(false); }
  };


  const handleDelete = async (id: ParamValue, name: string): Promise<void> => {
    try {
      const confirm = await ConfirmPopup({ text: `Are you want to delete ${name} lead`, title: "Are you sure", btnTxt: "Yes, delete" });
      if (confirm) {
        const result = await LeadService.delete(String(id));
        if (result.status === 200) {
          toast.success(`${name} lead deleted successfully`);
          setCurrentTab(TAB.ALL);
          await getLeadData();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    }
  };

  const handleTabs = async (no: number): Promise<void> => {
    setCurrentTab(no);
    clearAssignSelection();
    clearReassignSelection();
    if (no === TAB.WON) await getWonLeadData();
    if (no === TAB.LOST) await getLostLeadData();
    if (no === TAB.ASSIGNED) await getAssignedLeadData();
  };

  const handlePageLimit = (val: number): void => {
    if (currentTab === TAB.ALL) { setCurrentPage(1); setPageLimit(val); }
    else if (currentTab === TAB.WON) { setWonCurrentPage(1); setWonPageLimit(val); }
    else if (currentTab === TAB.LOST) { setLostCurrentPage(1); setLostPageLimit(val); }
    else if (currentTab === TAB.ASSIGNED) { setAssignedCurrentPage(1); setAssignedPageLimit(val); }
  };

  const nonAdminUsers = userData.filter((u) => u.userRole[0]?.code !== SUPER_ADMIN_ROLE_CODE);

  // ── Spinner helper ────────────────────────────────────────
  const Spinner = ({ color }: { color: string }) => (
    <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );


  const SkeletonRows = ({ cols }: { cols: number }) =>
    Array.from({ length: 8 }).map((_, i) => (
      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50 dark:bg-slate-500/40"}>
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="p-4"><Skeleton height={28} borderRadius={8} /></td>
        ))}
      </tr>
    ));

  // ── Status badge ──────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
      ${status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : status === "contacted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
      : status === "qualified" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      : status === "proposal" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
      : status === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : status === "lost" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"}`}>
      {status}
    </span>
  );

  const RowActions = ({ item }: { item: Lead }) => (
    <div className="flex items-center gap-2 p-4">
      {hasPermission(PERMISSIONS.readLead) ? (
        <Link href={`/leads/view/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 text-green-500 hover:scale-105 transition-transform">
          <FaRegEye className="text-lg" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed"><FaRegEye className="text-lg" /></span>
      )}
      {hasPermission(PERMISSIONS.updateLead) && item.status !== SALES_STATUS.DELETE ? (
        <Link href={`/leads/update/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 text-yellow-500 hover:scale-105 transition-transform">
          <MdOutlineEdit className="text-lg" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-50 cursor-not-allowed"><MdOutlineEdit className="text-lg" /></span>
      )}
      {item.status !== SALES_STATUS.LOST && hasPermission(PERMISSIONS.createDeal) ? (
        item.status !== SALES_STATUS.DELETE ? (
          item.inDeal === false ? (
            <Link href={`/leads/make-deal/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 hover:bg-blue-200 hover:scale-105 transition-transform">
              <FaRegHandshake className="text-lg" />
            </Link>
          ) : (
            <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-900 text-white dark:bg-blue-600 cursor-default" title="Already on deal"><FaHandshake className="text-lg" /></span>
          )
        ) : (
          <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed"><FaHandshake className="text-lg" /></span>
        )
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed"><FaHandshake className="text-lg" /></span>
      )}
    </div>
  );

  // ── Render standard lead rows ─────────────────────────────
  const renderLeadRows = (data: Lead[]) => {
    if (!isLoading && data.length === 0) return (
      <tr><td className="p-8 text-center text-slate-400 text-sm" colSpan={9}>No leads found</td></tr>
    );
    if (isLoading) return <SkeletonRows cols={hasPermission(PERMISSIONS.assignLead) && currentTab === TAB.ALL ? 9 : 8} />;

    return data.map((item, i) => {
      const isChecked = selectedLeadIds.has(item.id);
      return (
        <tr key={item.lead_id}
          className={`${isChecked ? "bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-l-blue-500"
            : i % 2 === 0 ? "bg-white dark:bg-transparent"
            : "bg-blue-100/50 dark:bg-slate-500"} w-full transition-colors duration-150`}>

          {hasPermission(PERMISSIONS.assignLead) && currentTab === TAB.ALL && (
            <td className="p-4 text-center">
              {item.leadSource === LEAD_SOURCE_TYPE.ADMIN_CREATED && !item.assignedTo?.length ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleSelectOne(item.id)} />
                  <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                    ${isChecked ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"}`}>
                    {isChecked && <FaCheck className="text-white text-[9px]" />}
                  </div>
                </label>
              ) : item.assignedTo?.length ? (
                <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-green-100 dark:bg-green-900/30" title="Already assigned">
                  <FaCheck className="text-green-500 text-[8px]" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-[18px] h-[18px]" title="Self-created leads cannot be assigned">
                  <span className="block w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </span>
              )}
            </td>
          )}

          <td className="p-4">
            <Link href={`/leads/view/${item.id}`} className="text-sm font-medium hover:text-blue-500 transition-colors">{item.lead_id}</Link>
          </td>
          <td className="flex gap-1 flex-col p-4">
            <h4 className="capitalize font-medium text-sm">{item.fullName}</h4>
            <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />
          </td>
          <td className="p-4">
            <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskPhone(item.phone)} fontSize="sm" />
          </td>
          <td className="p-4">
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">{item.projectType}</span>
          </td>
          <td className="p-4">
            <span className="bg-yellow-400 text-slate-800 px-2.5 py-1 text-xs font-medium rounded-md">{item.source}</span>
          </td>
          <td className="p-4"><StatusBadge status={item.status} /></td>
          <td><RowActions item={item} /></td>
        </tr>
      );
    });
  };

  
  const renderAssignedRows = () => {
    if (!isLoading && assignedLeadData.length === 0) return (
      <tr>
        <td colSpan={8} className="py-20 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-800/30">
              <RiUserSharedLine className="text-amber-400 text-3xl" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">No assigned leads yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs">
              Assign leads from the All Leads tab first, then manage reassignments here.
            </p>
          </div>
        </td>
      </tr>
    );
    if (isLoading) return <SkeletonRows cols={8} />;

    return assignedLeadData.map((item, i) => {
      const isChecked = selectedReassignIds.has(item.id);
      const assignedUser = item.assignedTo?.[0] as unknown as { firstName?: string; lastName?: string } | null;

      return (
        <tr key={item.lead_id}
          className={`${isChecked
            ? "bg-amber-50 dark:bg-amber-900/10 border-l-[3px] border-l-amber-500"
            : i % 2 === 0 ? "bg-white dark:bg-transparent"
            : "bg-amber-50/40 dark:bg-slate-500/30"} w-full transition-colors duration-150`}>

          {/* Reassign checkbox — amber themed */}
          {hasPermission(PERMISSIONS.assignLead) && (
            <td className="p-4 text-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleReassignSelectOne(item.id)} />
                <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                  ${isChecked ? "bg-amber-500 border-amber-500" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-amber-400"}`}>
                  {isChecked && <FaCheck className="text-white text-[9px]" />}
                </div>
              </label>
            </td>
          )}

          <td className="p-4">
            <Link href={`/leads/view/${item.id}`} className="text-sm font-medium hover:text-blue-500 transition-colors">{item.lead_id}</Link>
          </td>
          <td className="flex gap-1 flex-col p-4">
            <h4 className="capitalize font-medium text-sm">{item.fullName}</h4>
            <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />
          </td>
          <td className="p-4">
            <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskPhone(item.phone)} fontSize="sm" />
          </td>
          <td className="p-4">
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">{item.projectType}</span>
          </td>
          <td className="p-4"><StatusBadge status={item.status} /></td>

          
          <td className="p-4">
            <AssignedToPill user={assignedUser} />
          </td>

          {/* Actions — view + edit only (no deal on reassign tab) */}
          <td className="p-4">
            <div className="flex items-center gap-2">
              {hasPermission(PERMISSIONS.readLead) ? (
                <Link href={`/leads/view/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 text-green-500 hover:scale-105 transition-transform">
                  <FaRegEye className="text-lg" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed"><FaRegEye className="text-lg" /></span>
              )}
              {hasPermission(PERMISSIONS.updateLead) && item.status !== SALES_STATUS.DELETE ? (
                <Link href={`/leads/update/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 text-yellow-500 hover:scale-105 transition-transform">
                  <MdOutlineEdit className="text-lg" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-50 cursor-not-allowed"><MdOutlineEdit className="text-lg" /></span>
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
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm gap-5 p-6 rounded-xl border border-slate-900/10 w-full flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900">Add Bulk Leads</h2>
            <p className="text-gray-500 dark:text-gray-400">Create bulk leads via CSV file upload</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            {hasPermission(PERMISSIONS.createLead) ? (
              <PrimaryButton text="Create Bulk Leads" link="/leads/bulk" icon={<LiaMailBulkSolid />} />
            ) : (
              <span className="bg-blue-400 cursor-not-allowed text-white px-5 py-2.5 rounded-md flex items-center gap-2">
                <LiaMailBulkSolid /> Create Bulk Leads
              </span>
            )}
          </div>
        </div>

        {/* ── Main Table Card ── */}
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-6">

          {/* Header */}
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold dark:text-white text-slate-900">All Sales Leads</h2>
              <p className="text-gray-500 dark:text-gray-400">Create, edit or remove leads.</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm"
                onChange={(e) => handlePageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input type="text" className="outline-none bg-transparent text-sm w-36" placeholder="Search..." />
              </div>
              {hasPermission(PERMISSIONS.createLead) ? (
                <Link href="/leads/add" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors group">
                  <FaPlus className="group-hover:rotate-90 transition-transform duration-300" /> Create Lead
                </Link>
              ) : (
                <span className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 opacity-70 cursor-not-allowed text-sm">
                  <FaPlus /> Create Lead
                </span>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-600 pb-0">
            <TabsButton btnTxt="All Leads" dataLen={leadData.length} no={TAB.ALL} currentVal={currentTab} onClickEvent={() => setCurrentTab(TAB.ALL)} />
            <TabsButton btnTxt="Won Leads" dataLen={wonLeadData.length} no={TAB.WON} currentVal={currentTab} onClickEvent={() => handleTabs(TAB.WON)} />
            <TabsButton btnTxt="Lost Leads" dataLen={lostLeadData.length} no={TAB.LOST} currentVal={currentTab} onClickEvent={() => handleTabs(TAB.LOST)} />

           
            {hasPermission(PERMISSIONS.assignLead) && (
              <button
                onClick={() => handleTabs(TAB.ASSIGNED)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer
                  ${currentTab === TAB.ASSIGNED
                    ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 "
                  }`}
              >
                <TbArrowsExchange className={`text-base transition-transform duration-300 ${currentTab === TAB.ASSIGNED ? "rotate-180" : ""}`} />
                Assigned Leads
                {assignedLeadData.length > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${currentTab === TAB.ASSIGNED
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    }`}>
                    {assignedLeadData.length}
                  </span>
                )}
              </button>
            )}
          </div>

          
          {selectedLeadIds.size > 0 && currentTab === TAB.ALL && (
            <div className="w-full bg-blue-600 dark:bg-blue-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <HiOutlineUserGroup className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <button onClick={clearAssignSelection} className="text-blue-200 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors">
                  <FaXmark className="text-xs group-hover:rotate-90" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedUserId && <span className="text-blue-200 text-[11px] ml-1">← Select a user first</span>}
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg border-0 outline-none text-sm min-w-52 cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>— Select user to assign —</option>
                    {nonAdminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName ?? ""}{u.userRole[0]?.name ? ` · ${u.userRole[0].name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignLeads}
                  disabled={!selectedUserId || isAssigning}
                  className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isAssigning ? <><Spinner color="text-blue-600" /> Assigning...</> : <><MdOutlinePersonAdd className="text-lg" /> Assign Leads</>}
                </button>
              </div>
            </div>
          )}

         
          {selectedReassignIds.size > 0 && currentTab === TAB.ASSIGNED && (
            <div className="w-full rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/30 animate-in slide-in-from-top-2 duration-200"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <TbArrowsExchange className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedReassignIds.size} lead{selectedReassignIds.size > 1 ? "s" : ""} ready to reassign
                  </span>
                </div>
                <button onClick={clearReassignSelection} className="text-amber-100 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors">
                  <FaXmark className="text-xs group-hover:rotate-90" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedReassignUserId && <span className="text-amber-100 text-[11px] ml-1">← Pick the new assignee</span>}
                  <select
                    value={selectedReassignUserId}
                    onChange={(e) => setSelectedReassignUserId(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg border-0 outline-none text-sm min-w-52 cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>— Select new assignee —</option>
                    {nonAdminUsers.map((u) => (
                      <option key={u.id} value={u.id} className="capitalize">
                        {u.firstName} {u.lastName ?? ""}{u.userRole[0]?.name ? ` · ${u.userRole[0].name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleReassignLeads}
                  disabled={!selectedReassignUserId || isReassigning}
                  className="bg-white text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isReassigning ? <><Spinner color="text-amber-500" /> Reassigning...</> : <><TbArrowsExchange className="text-lg" /> Reassign Leads</>}
                </button>
              </div>
            </div>
          )}

          
          {currentTab !== TAB.ASSIGNED ? (
            <table className="w-full rounded-xl overflow-hidden">
              <thead>
                <tr className="w-full border-b-2 border-zinc-200 dark:border-zinc-600 bg-blue-50 dark:bg-gray-800">
                  {hasPermission(PERMISSIONS.assignLead) && currentTab === TAB.ALL && (
                    <th className="p-4 w-12">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input ref={selectAllRef} type="checkbox" className="sr-only" checked={isAllSelected} onChange={handleSelectAll} />
                        <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                          ${isAllSelected || isIndeterminate ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-blue-400"}`}>
                          {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                          {isIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                        </div>
                      </label>
                    </th>
                  )}
                  {["Lead Id", "Client Info", "Phone", "Project Type", "Source", "Status", "Actions"].map((h) => (
                    <th key={h} className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 font-semibold tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderLeadRows(currentLeadData)}</tbody>
            </table>
          ) : (
           
            <table className="w-full rounded-xl overflow-hidden">
              <thead>
                <tr className="w-full border-b-2 border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20">
                  {hasPermission(PERMISSIONS.assignLead) && (
                    <th className="p-4 w-12">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input ref={reassignSelectAllRef} type="checkbox" className="sr-only" checked={allAssignedSelected} onChange={handleReassignSelectAll} />
                        <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-150
                          ${allAssignedSelected || isReassignIndeterminate ? "bg-amber-500 border-amber-500" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-amber-400"}`}>
                          {allAssignedSelected && <FaCheck className="text-white text-[9px]" />}
                          {isReassignIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                        </div>
                      </label>
                    </th>
                  )}
                  {["Lead Id", "Client Info", "Phone", "Project Type", "Status"].map((h) => (
                    <th key={h} className="p-4 uppercase text-xs text-start text-amber-600 dark:text-amber-400 font-semibold tracking-wide">{h}</th>
                  ))}
                  <th className="p-4 uppercase text-xs text-start text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
                    <span className="flex items-center gap-1.5"><RiUserSharedLine /> Assigned To</span>
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-amber-600 dark:text-amber-400 font-semibold tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>{renderAssignedRows()}</tbody>
            </table>
          )}

          
          {currentTab === TAB.ALL && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} className="w-full" />}
          {currentTab === TAB.WON && <Pagination currentPage={currentWonPage} totalPages={wonTotalPages} onPageChange={(p) => setWonCurrentPage(p)} className="w-full" />}
          {currentTab === TAB.LOST && <Pagination currentPage={currentLostPage} totalPages={lostTotalPages} onPageChange={(p) => setLostCurrentPage(p)} className="w-full" />}
          {currentTab === TAB.ASSIGNED && <Pagination currentPage={currentAssignedPage} totalPages={assignedTotalPages} onPageChange={(p) => setAssignedCurrentPage(p)} className="w-full" />}
        </div>
      </div>
    </>
  );
};

export default LeadContent;