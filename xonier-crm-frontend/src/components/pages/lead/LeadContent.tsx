"use client";
import React, { JSX, useState, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import Link from "next/link";
import { MdOutlineEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaXmark, FaCheck } from "react-icons/fa6";
import { FiFilter } from "react-icons/fi";
import { usePermissions } from "@/src/hooks/usePermissions";
import { LEAD_SOURCE_TYPE, PERMISSIONS, SALES_STATUS } from "@/src/constants/enum";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import LeadService from "@/src/services/lead.service";
import { TeamService } from "@/src/services/team.service";
// import { DesignationService } from "@/src/services/designation.service"; // ✅ uncommented
import { useAdvancedFilters } from "@/src/hooks/useAdvanceFilter";
import AdvancedFilters from "@/src/components/common/AdvanceFilter";
import { Lead } from "@/src/types/leads/leads.types";
import { Team } from "@/src/types/team/team.types";
import Skeleton from "react-loading-skeleton";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { LiaMailBulkSolid } from "react-icons/lia";
import { ParamValue } from "next/dist/server/request/params";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import SensitiveField from "@/src/components/common/SensitiveField";
import TabsButton from "@/src/components/ui/TabsButton";
import { FaRegHandshake, FaHandshake } from "react-icons/fa";
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
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import TagBadge from "@/src/components/common/tagBadge";
import StatusDropdown from "@/src/components/pages/lead/StatusDropdown";
import { LeadEngagementStatus } from "@/src/constants/enum";
import UserSelect from "@/src/components/common/userselect";
import { useTranslation } from "react-i18next";

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
        border border-amber-200 dark:border-amber-700/40 capitalize hover:scale-105"
    >
      <span className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 ">
        {initials || "?"}
      </span>
      {name || "Unknown"}
    </span>
  );
};

const LeadContent = (): JSX.Element => {
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead[]>([]);
  const [wonLeadData, setWonLeadData] = useState<Lead[]>([]);
  const [lostLeadData, setLostLeadData] = useState<Lead[]>([]);
  const [assignedLeadData, setAssignedLeadData] = useState<Lead[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentTab, setCurrentTab] = useState<number>(TAB.ALL);
  const [userData, setUserData] = useState<User[]>([]);

  // Advanced filter data sources
  const [teamData, setTeamData] = useState<Team[]>([]);
  const [designationData, setDesignationData] = useState<any[]>([]);

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
  const [searchVal, setSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });
  const [assignFilter, setAssignFilter] = useState<string>("");

  // ✅ SINGLE SOURCE OF TRUTH for all advanced filters (Team, Designation, Sales Person, Source)
  const {
    teamFilter,
    setTeamFilter,
    designationFilter,
    setDesignationFilter,
    salesPersonFilter,
    setSalesPersonFilter,
    sourceFilter,
    setSourceFilter,
    reset: resetAdvancedFilters,
    activeCount: activeAdvancedFilterCount,
  } = useAdvancedFilters();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const [filters, setFilters] = useState<Record<string, string>>({
    type: "",
    search: "",
    status: "",
    source: "",
    tag: "",
    engagementStatus: "",
    team: "",
    designation: "",
    createdBy: "",
  });

  const pageLimitMap: Record<number, number> = {
    [TAB.ALL]: pageLimit,
    [TAB.WON]: wonPageLimit,
    [TAB.LOST]: lostPageLimit,
    [TAB.ASSIGNED]: assignedPageLimit,
  };

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

  // ✅ Build common API filter object
  const getLeadFilters = () => ({
    ...filters,
    ...query,
    ...dateFilter,
    team: teamFilter || undefined,
    designation: designationFilter || undefined,
    source: sourceFilter || undefined,
    createdBy: salesPersonFilter || undefined,
  });

  // Base data for the active tab
  const baseLeadData =
    currentTab === TAB.ALL ? leadData
      : currentTab === TAB.WON ? wonLeadData
        : currentTab === TAB.LOST ? lostLeadData
          : assignedLeadData;

  // Client-side filter: Sales Person filter compares against lead's createdBy user
  const currentLeadData = !salesPersonFilter
    ? baseLeadData
    : baseLeadData.filter((item) => item.createdBy?.id === salesPersonFilter);

  const getLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentPage, pageLimit, getLeadFilters());
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
        ...getLeadFilters(),
        status: SALES_STATUS.WON,
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
        ...getLeadFilters(),
        status: SALES_STATUS.LOST,
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

  const getAssignedLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await LeadService.getAll(currentAssignedPage, assignedPageLimit, {
        ...getLeadFilters(),
        isAssigned: true,
        assignee: assignFilter || undefined,
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

  const getTeamData = async (): Promise<void> => {
    try {
      // const result = await TeamService.getAllWithoutPagination();
      // if (result.status === 200) setTeamData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  const getDesignationData = async (): Promise<void> => {
    try {
      // const result = await DesignationService.getAllWithoutPagination();
      // if (result.status === 200) setDesignationData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  useEffect(() => {
    getLeadData();
  }, [currentPage, pageLimit]);
  useEffect(() => {
    getWonLeadData();
  }, [currentWonPage, wonPageLimit]);
  useEffect(() => {
    getLostLeadData();
  }, [currentLostPage, lostPageLimit]);
  useEffect(() => {
    getAssignedLeadData();
  }, [currentAssignedPage, assignedPageLimit, assignFilter]);
  useEffect(() => {
    getUserData();
    getTeamData();
    getDesignationData();
  }, []);

  // const assignableLeads = currentLeadData.filter(
  //   (l) => l.leadSource === LEAD_SOURCE_TYPE.ADMIN_CREATED && !l.assignedTo?.length
  // );
  // const assignableLeads = currentLeadData;
  const assignableLeads = currentLeadData.filter(
  (lead) => !lead.assignedTo?.length
);
// const isAllSelected =
//   assignableLeads.length > 0 &&
//   assignableLeads.every((lead) => selectedLeadIds.has(lead.id));

// const isIndeterminate =
//   selectedLeadIds.size > 0 &&
//   selectedLeadIds.size < assignableLeads.length;

  const selectedAssignableCount = assignableLeads.filter((lead) =>
  selectedLeadIds.has(lead.id)
).length;

const isAllSelected =
  assignableLeads.length > 0 &&
  selectedAssignableCount === assignableLeads.length;

const isIndeterminate =
  selectedAssignableCount > 0 &&
  selectedAssignableCount < assignableLeads.length;
  // const isAllSelected = assignableLeads.length > 0 && assignableLeads.every((l) => selectedLeadIds.has(l.id));
  // const isIndeterminate = selectedLeadIds.size > 0 && !isAllSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);
  const handleSelectAll = () => {
  const s = new Set(selectedLeadIds);

  if (isAllSelected) {
    // All unassigned are selected → deselect them
    assignableLeads.forEach((lead) => {
      s.delete(lead.id);
    });
  } else {
    // Select all unassigned leads
    assignableLeads.forEach((lead) => {
      s.add(lead.id);
    });
  }

  setSelectedLeadIds(s);
};

  // const handleSelectAll = () => {
  //   const s = new Set(selectedLeadIds);
  //   if (isAllSelected) assignableLeads.forEach((l) => s.delete(l.id));
  //   else assignableLeads.forEach((l) => s.add(l.id));
  //   setSelectedLeadIds(s);
  // };
  const handleSelectOne = (id: string) => {
    const s = new Set(selectedLeadIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeadIds(s);
  };
  const clearAssignSelection = () => {
    setSelectedLeadIds(new Set());
    setSelectedUserId("");
  };

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
      const result = await LeadService.assignBulkLead(selectedUserId, Array.from(selectedLeadIds));
      if (result.status === 200) {
        const { assigned, skipped, skippedRecords } = result.data.data;
        toast.success(`${assigned} lead(s) assigned successfully`);
        if (skipped > 0) {
          toast.info(`${skipped} lead(s) were skipped`);
          console.info("Skipped:", skippedRecords);
        }
        clearAssignSelection();
        await Promise.all([getLeadData(), getAssignedLeadData()]);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        setErr(m);
        toast.error(`${m}`);
      } else setErr(["Something went wrong"]);
    } finally {
      setIsAssigning(false);
    }
  };

  const allAssignedSelected = assignedLeadData.length > 0 && assignedLeadData.every((l) => selectedReassignIds.has(l.id));
  const isReassignIndeterminate = selectedReassignIds.size > 0 && !allAssignedSelected;
  const reassignSelectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (reassignSelectAllRef.current) reassignSelectAllRef.current.indeterminate = isReassignIndeterminate;
  }, [isReassignIndeterminate]);

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
  const clearReassignSelection = () => {
    setSelectedReassignIds(new Set());
    setSelectedReassignUserId("");
  };

  const handleReassignLeads = async (): Promise<void> => {
    if (!selectedReassignUserId) {
      toast.warning("Please select a user to reassign leads to");
      return;
    }
    if (selectedReassignIds.size === 0) {
      toast.warning("Please select at least one lead to reassign");
      return;
    }
    setIsReassigning(true);
    try {
      const result = await LeadService.reassignBulkLead({
        userId: selectedReassignUserId,
        leadsId: Array.from(selectedReassignIds),
      });
      if (result.status === 200) {
        const { reassigned, skipped, skippedRecords } = result.data.data;
        toast.success(`${reassigned} lead(s) reassigned successfully`);
        if (skipped > 0) {
          toast.info(`${skipped} lead(s) skipped`);
          console.info("Skipped:", skippedRecords);
        }
        clearReassignSelection();
        await getAssignedLeadData();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        setErr(m);
        toast.error(`${m}`);
      } else setErr(["Something went wrong"]);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleRevokeLeads = async (): Promise<void> => {
    if (selectedReassignIds.size === 0) {
      toast.warning("Please select a lead to reassign");
      return;
    }
    try {
      const confirm = await ConfirmPopup({
        text: `Are you want to revoke ${selectedReassignIds.size} leads`,
        title: "Are you sure",
        btnTxt: "Yes, revoke"
      });
      if (confirm) {
        const result = await LeadService.revokeLeads(Array.from(selectedReassignIds));
        if (result.status === 200) {
          toast.success(`${selectedReassignIds.size} leads revoked successfully`);
          await getAssignedLeadData();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        setErr(m);
        toast.error(`${m}`);
      } else setErr(["Something went wrong"]);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleDelete = async (id: ParamValue, name: string): Promise<void> => {
    try {
      const confirm = await ConfirmPopup({
        text: `Are you want to delete ${name} lead`,
        title: "Are you sure",
        btnTxt: "Yes, delete"
      });
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
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        setErr(m);
        toast.error(`${m}`);
      } else setErr(["Something went wrong"]);
    }
  };

  const updateLeadStatus = async (id: string, newStatus: LeadEngagementStatus): Promise<void> => {
    try {
      const result = await LeadService.updateEngagementStatus(id, { status: newStatus });

      if (result.status === 200) {
        toast.success(`Lead status updated to ${newStatus} successfully`);

        setLeadData((prevData) =>
          prevData.map((lead) =>
            lead.id === id ? { ...lead, connectStatus: newStatus } : lead
          )
        );
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
    clearAssignSelection();
    clearReassignSelection();
    if (no === TAB.WON) await getWonLeadData();
    if (no === TAB.LOST) await getLostLeadData();
    if (no === TAB.ASSIGNED) await getAssignedLeadData();
  };

  const handlePageLimit = (val: number): void => {
    if (currentTab === TAB.ALL) {
      setCurrentPage(1);
      setPageLimit(val);
    } else if (currentTab === TAB.WON) {
      setWonCurrentPage(1);
      setWonPageLimit(val);
    } else if (currentTab === TAB.LOST) {
      setLostCurrentPage(1);
      setLostPageLimit(val);
    } else if (currentTab === TAB.ASSIGNED) {
      setAssignedCurrentPage(1);
      setAssignedPageLimit(val);
    }
  };

  // ✅ Updated handlers for advanced filters
  const handleTeamFilter = (value: string): void => {
    setTeamFilter(value);
    setFilters((prev) => ({ ...prev, team: value }));
  };

  const handleDesignationFilter = (value: string): void => {
    setDesignationFilter(value);
    setFilters((prev) => ({ ...prev, designation: value }));
  };

  const handleSalesPersonFilter = (value: string): void => {
    setSalesPersonFilter(value);
    setFilters((prev) => ({ ...prev, createdBy: value }));
  };

  const handleSourceFilter = (value:"all" | "company" | "referral"): void => {
    setSourceFilter(value);
    setFilters((prev) => ({ ...prev, source: value }));
  };

  const clearAllAdvancedFilters = (): void => {
    resetAdvancedFilters();
    setFilters((prev) => ({
      ...prev,
      team: "",
      designation: "",
      source: "",
      createdBy: "",
    }));
  };

  // ✅ Fixed search handler to use 'search' field
  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: val }));
    }, 300);
  };

  const handleProjectType = (val: string): void => {
    setFilters((prev) => ({ ...prev, type: val }));
  };

  const handleStatus = (val: string): void => {
    setFilters((prev) => ({ ...prev, status: val }));
  };

  const handleSource = (val: string): void => {
    setFilters((prev) => ({ ...prev, source: val }));
  };

  const handleDataTag = (val: string): void => {
    setFilters((prev) => ({ ...prev, tag: val }));
  };

  function clearFields() {
    const selects = document.querySelectorAll<HTMLSelectElement>("select.field");
    selects.forEach((select) => {
      select.value = "";
    });
  }

  // ✅ SINGLE effect — refetch whenever any filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (currentTab === TAB.ALL) {
        setCurrentPage(1);
        getLeadData();
      } else if (currentTab === TAB.WON) {
        setWonCurrentPage(1);
        getWonLeadData();
      } else if (currentTab === TAB.LOST) {
        setLostCurrentPage(1);
        getLostLeadData();
      } else if (currentTab === TAB.ASSIGNED) {
        setAssignedCurrentPage(1);
        getAssignedLeadData();
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filters, dateFilter, teamFilter, designationFilter, sourceFilter, salesPersonFilter, assignFilter]);

  // ✅ SINGLE effect — reset everything when switching tabs
  useEffect(() => {
    setFilters({
      type: "",
      search: "",
      status: "",
      source: "",
      tag: "",
      engagementStatus: "",
      team: "",
      designation: "",
      createdBy: "",
    });
    setSearchVal("");
    setDateFilter({ fromDate: "", toDate: "" });
    resetAdvancedFilters();
    clearAssignSelection();
    clearReassignSelection();
    clearFields();
  }, [currentTab]);

  const options: Record<
    string,
    { value: string[]; handlefunction: (value: string) => void }
  > = {
    Status: {
      value: Object.values(SALES_STATUS),
      handlefunction: handleStatus,
    },
  };

  const Spinner = ({ color }: { color: string }) => (
    <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  const SkeletonRows = ({ cols }: { cols: number }) =>
    Array.from({ length: 10 }).map((_, i) => (
      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"}>
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="p-4">
            <Skeleton height={28} borderRadius={8} />
          </td>
        ))}
      </tr>
    ));

  const RowActions = ({ item }: { item: Lead }) => (
    <div className="flex items-center gap-2 p-4">
      {hasPermission(PERMISSIONS.readLead) ? (
        <Link
          href={`/leads/view/${item.id}`}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 text-green-500 hover:scale-105 transition-transform"
        >
          <FaRegEye className="text-lg" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed">
          <FaRegEye className="text-lg" />
        </span>
      )}
      {hasPermission(PERMISSIONS.updateLead) && item.status !== SALES_STATUS.DELETE ? (
        <Link
          href={`/leads/update/${item.id}`}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 text-yellow-500 hover:scale-105 transition-transform"
        >
          <MdOutlineEdit className="text-lg" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-50 cursor-not-allowed">
          <MdOutlineEdit className="text-lg" />
        </span>
      )}
      {item.status !== SALES_STATUS.LOST && hasPermission(PERMISSIONS.createDeal) ? (
        item.status !== SALES_STATUS.DELETE ? (
          item.inDeal === false ? (
            <Link
              href={`/leads/make-deal/${item.id}`}
              className="h-9 w-9 flex items-center justify-center rounded-md bg-cyan-100 text-cyan-500 hover:bg-cyan-200 hover:scale-105 transition-transform"
            >
              <FaRegHandshake className="text-lg" />
            </Link>
          ) : (
            <span
              className="h-9 w-9 flex items-center justify-center rounded-md bg-cyan-900 text-white dark:bg-cyan-600 cursor-default"
              title={t("already_on_deal")}
            >
              <FaHandshake className="text-lg" />
            </span>
          )
        ) : (
          <span className="h-9 w-9 flex items-center justify-center rounded-md bg-cyan-100 text-cyan-500 opacity-50 cursor-not-allowed">
            <FaHandshake className="text-lg" />
          </span>
        )
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-md bg-cyan-100 text-cyan-500 opacity-50 cursor-not-allowed">
          <FaHandshake className="text-lg" />
        </span>
      )}
    </div>
  );

  const renderLeadRows = (data: Lead[]) => {
    if (!isLoading && data.length === 0)
      return (
        <tr>
          <td className="p-8 text-center text-slate-400 text-sm" colSpan={10}>
            {t("no_leads_found")}
          </td>
        </tr>
      );
    if (isLoading) return <SkeletonRows cols={hasPermission(PERMISSIONS.assignLead) && currentTab === TAB.ALL ? 11 : 10} />;

    return data.map((item, i) => {
      const isChecked = selectedLeadIds.has(item.id);
      return (
        <tr
          key={item.lead_id}
          className={`${
            isChecked
              ? "bg-slate-50 dark:bg-slate-900/20 border-l-[3px] border-l-cyan-500"
              : i % 2 === 0
              ? "bg-white dark:bg-transparent"
              : "bg-slate-100/50 dark:bg-slate-800"
          } w-full transition-colors duration-150 text-nowrap`}
        >
          {hasPermission(PERMISSIONS.assignLead) && currentTab === TAB.ALL && (
            <td className="p-4 text-center">
              {!item.assignedTo?.length ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleSelectOne(item.id)} />
                  <div
                    className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                    ${
                      isChecked
                        ? "bg-cyan-600 border-cyan-600"
                        : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-cyan-400"
                    }`}
                  >
                    {isChecked && <FaCheck className="text-white text-[9px]" />}
                  </div>
                </label>
              ) : item.assignedTo?.length ? (
                <span
                  className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-100 dark:bg-green-900/30"
                  title={t("already_assigned")}
                >
                  <FaCheck className="text-green-500 text-[8px]" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-4.5 h-4.5" title={t("self_created_leads_cannot_be_assigned")}>
                  <span className="block w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </span>
              )}
            </td>
          )}

          <td className="flex gap-1 flex-col p-4">
            <h4 className="capitalize font-medium text-sm  text-slate-500 dark:text-white/70">{item.fullName}</h4>
            <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />
          </td>
          <td className="p-4">
            <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskPhone(item.phone)} fontSize="sm" />
          </td>
          <td className="p-4">
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
              {item.projectType || "N/A"}
            </span>
          </td>
          <td className="p-4">
            <span className="bg-yellow-400 text-white px-2.5 py-1 text-xs font-medium rounded-md">{item.source}</span>
          </td>
          <td className="p-4">
            <StatusBadge status={item.status} />
          </td>
          <td className="p-4">
            <TagBadge tag={item.dataTag || "N/A"} />
          </td>
          <td className="p-4">
            <CreatedAt timestamp={item.createdAt} />
          </td>
          <td className="p-4 capitalize text-[16px] text-slate-500 dark:text-white/70">
            {item.createdBy?.firstName + " " + item.createdBy?.lastName}
          </td>
          <td className="p-4">
            {hasPermission(PERMISSIONS.updateLead) ? (
              <StatusDropdown currentStatus={item.connectStatus as LeadEngagementStatus} Id={item.id} onStatusUpdate={updateLeadStatus} />
            ) : (
              <StatusBadge status={item.connectStatus || "N/A"} />
            )}
          </td>
          <td>
            <RowActions item={item} />
          </td>
        </tr>
      );
    });
  };

  const renderAssignedRows = () => {
    if (!isLoading && assignedLeadData.length === 0)
      return (
        <tr>
          <td colSpan={12} className="py-20 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-800/30">
                <RiUserSharedLine className="text-amber-400 text-3xl" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">{t("no_assigned_leads_yet")}</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs">{t("assign_leads_from_the_all_leads")}</p>
            </div>
          </td>
        </tr>
      );
    if (isLoading) return <SkeletonRows cols={12} />;

    return currentLeadData.map((item, i) => {
      const isChecked = selectedReassignIds.has(item.id);
      const assignedUser = item.assignedTo?.[0] as unknown as { firstName?: string; lastName?: string } | null;
      const assignedUserId = item.assignedTo?.[0] as unknown as { id?: string } | null;

      return (
        <tr
          key={item.lead_id}
          className={`${
            isChecked
              ? "bg-amber-50 dark:bg-amber-900/10 border-l-[3px] border-l-amber-500"
              : i % 2 === 0
              ? "bg-white dark:bg-transparent"
              : "bg-amber-50/40 dark:bg-slate-500/30"
          } w-full transition-colors duration-150 text-nowrap`}
        >
          {hasPermission(PERMISSIONS.reassignLead) && (
            <td className="p-4 text-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleReassignSelectOne(item.id)} />
                <div
                  className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                  ${
                    isChecked
                      ? "bg-amber-500 border-amber-500"
                      : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-amber-400"
                  }`}
                >
                  {isChecked && <FaCheck className="text-white text-[9px]" />}
                </div>
              </label>
            </td>
          )}

          <td className="flex gap-1 flex-col p-4">
            <h4 className="capitalize font-medium text-slate-600 text-[16px] dark:text-white/70">{item.fullName}</h4>
            <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />
          </td>
          <td className="p-4">
            <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskPhone(item.phone)} fontSize="sm" />
          </td>
          <td className="p-4">
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
              {item.projectType || "N/A"}
            </span>
          </td>
          <td className="p-4">
            <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-600 text-xs font-medium">
              {item.source || "N/A"}
            </span>
          </td>
          <td className="p-4">
            <StatusBadge status={item.status || "N/A"} />
          </td>
          <td className="p-4">
            <TagBadge tag={item.dataTag || "N/A"} />
          </td>
          <td className="p-4">
            <CreatedAt timestamp={item.createdAt} />
          </td>
          <td className="p-4 text-slate-400 capitalize text-[16px] dark:text-white/70">
            {item.createdBy?.firstName + " " + item.createdBy?.lastName}
          </td>
          {hasPermission(PERMISSIONS.updateLead) ? (
            <td>
              <StatusDropdown currentStatus={item.connectStatus as LeadEngagementStatus} Id={item.id} onStatusUpdate={updateLeadStatus} />
            </td>
          ) : (
            <td className="p-4">
              <StatusBadge status={item.connectStatus || "N/A"} />
            </td>
          )}
          <td className="p-4">
            <Link href={`/users/${assignedUserId?.id}`}>
              <AssignedToPill user={assignedUser} />
            </Link>
          </td>
          <td className="p-4">
            <div className="flex items-center gap-2">
              {hasPermission(PERMISSIONS.readLead) ? (
                <Link
                  href={`/leads/view/${item.id}`}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 text-green-500 hover:scale-105 transition-transform"
                >
                  <FaRegEye className="text-lg" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed">
                  <FaRegEye className="text-lg" />
                </span>
              )}
              {hasPermission(PERMISSIONS.updateLead) && item.status !== SALES_STATUS.DELETE ? (
                <Link
                  href={`/leads/update/${item.id}`}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 text-yellow-500 hover:scale-105 transition-transform"
                >
                  <MdOutlineEdit className="text-lg" />
                </Link>
              ) : (
                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-50 cursor-not-allowed">
                  <MdOutlineEdit className="text-lg" />
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
      <div className="ml-72 mt-14 p-6 ">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm gap-5 p-6 rounded-xl border border-slate-900/10 w-full flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900">{t("add_bulk_leads")}</h2>
            <p className="text-gray-500 dark:text-gray-400">{t("create_bulk_leads_via_csv_file")}</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            {hasPermission(PERMISSIONS.createLead) ? (
              <PrimaryButton text="Create Bulk Leads" link="/leads/bulk" icon={<LiaMailBulkSolid />} />
            ) : (
              <span className="bg-cyan-400 cursor-not-allowed text-white px-5 py-2.5 rounded-md flex items-center gap-2">
                <LiaMailBulkSolid /> {t("create_bulk_leads")}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-6">
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold dark:text-white text-slate-900">{t("all_sales_leads")}</h2>
              <p className="text-gray-500 dark:text-gray-400">{t("create_edit_or_remove_leads")}</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={pageLimitMap[currentTab] ?? pageLimit}
                className="bg-slate-50 outline-none text-slate-500 dark:bg-gray-600 dark:text-white/70 px-3 py-2.5 rounded-lg border border-slate-900/10 "
                onChange={(e) => handlePageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>

              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg outline-none border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl text-slate-400" />
                <input
                  type="text"
                  id="searchbar"
                  className="outline-none bg-transparent text-sm w-36 dark:text-white/70"
                  placeholder={t("search_3")}
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchVal}
                />
              </div>
              <div>
                <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
              </div>
              {hasPermission(PERMISSIONS.createLead) ? (
                <Link
                  href="/leads/add"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors group"
                >
                  <FaPlus className="group-hover:rotate-90 transition-transform duration-300" /> {t("create_lead")}
                </Link>
              ) : (
                <span className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 opacity-70 cursor-not-allowed text-sm">
                  <FaPlus /> {t("create_lead")}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-600 pb-3">
            <div className="flex items-center gap-2 ">
              <TabsButton
                btnTxt={t("all_leads")}
                dataLen={leadData.length}
                no={TAB.ALL}
                currentVal={currentTab}
                onClickEvent={() => setCurrentTab(TAB.ALL)}
              />
              <TabsButton
                btnTxt={t("won_leads")}
                dataLen={wonLeadData.length}
                no={TAB.WON}
                currentVal={currentTab}
                onClickEvent={() => handleTabs(TAB.WON)}
              />
              <TabsButton
                btnTxt={t("lost_leads")}
                dataLen={lostLeadData.length}
                no={TAB.LOST}
                currentVal={currentTab}
                onClickEvent={() => handleTabs(TAB.LOST)}
              />

              {hasPermission(PERMISSIONS.assignLead) && (
                <button
                  onClick={() => handleTabs(TAB.ASSIGNED)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer
                  ${
                    currentTab === TAB.ASSIGNED
                      ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 "
                  }`}
                >
                  <TbArrowsExchange
                    className={`text-base transition-transform duration-300 ${currentTab === TAB.ASSIGNED ? "rotate-180" : ""}`}
                  />
                  {t("assigned_leads")}
                  {assignedLeadData.length > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${
                      currentTab === TAB.ASSIGNED
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    }`}
                    >
                      {assignedLeadData.length}
                    </span>
                  )}
                </button>
              )}
            </div>
            {/* <button
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer
                  ${
                    showAdvancedFilters
                      ? "bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-200/50 dark:shadow-cyan-900/30"
                      : "bg-slate-50 dark:bg-gray-600 border-slate-900/10 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-gray-500"
                  }`}
            >
              <FiFilter className={`text-base transition-transform duration-300 ${showAdvancedFilters ? "rotate-180" : ""}`} />
              {t("filters")}
              {activeAdvancedFilterCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${showAdvancedFilters ? "bg-white text-cyan-600" : "bg-cyan-600 text-white"}`}
                >
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button> */}
          </div>

          {/* ✅ Common Advanced Filters component — reused across Leads/Enquiry/Deals/Quotations */}
       
            <AdvancedFilters
              teamData={teamData}
              designationData={designationData}
              userData={userData}
              teamFilter={teamFilter}
              designationFilter={designationFilter}
              salesPersonFilter={salesPersonFilter}
              sourceFilter={sourceFilter}
              onTeamChange={handleTeamFilter}
              onDesignationChange={handleDesignationFilter}
              onSalesPersonChange={handleSalesPersonFilter}
              onSourceChange={handleSourceFilter}
              onReset={clearAllAdvancedFilters}
              activeCount={activeAdvancedFilterCount}
            />

          {selectedLeadIds.size > 0 && currentTab === TAB.ALL && (
            <div className="w-full bg-cyan-600 dark:bg-cyan-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-cyan-200/60 dark:shadow-cyan-900/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <HiOutlineUserGroup className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedLeadIds.size} {t("lead_2")}
                    {selectedLeadIds.size > 1 ? "s" : ""} {t("selected_2")}
                  </span>
                </div>
                <button
                  onClick={clearAssignSelection}
                  className="text-cyan-200 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  <FaXmark className="text-xs group-hover:rotate-90" /> {t("clear")}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedUserId && <span className="text-cyan-200 text-[11px] ml-1">{t("select_a_user_first")}</span>}
                  <UserSelect mode="single" value={selectedUserId} onChange={setSelectedUserId} placeholder={t("search_select_user")} />
                </div>
                <button
                  onClick={handleAssignLeads}
                  disabled={!selectedUserId || isAssigning}
                  className="bg-white text-cyan-600 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isAssigning ? (
                    <>
                      <Spinner color="text-cyan-600" /> {t("assigning")}
                    </>
                  ) : (
                    <>
                      <MdOutlinePersonAdd className="text-lg" /> {t("assign_leads")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {selectedReassignIds.size > 0 && currentTab === TAB.ASSIGNED && (
            <div
              className="w-full rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/30 animate-in slide-in-from-top-2 duration-200"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <TbArrowsExchange className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedReassignIds.size} {t("lead_2")}
                    {selectedReassignIds.size > 1 ? "s" : ""} {t("ready_to_reassign")}
                  </span>
                </div>
                <button
                  onClick={clearReassignSelection}
                  className="text-amber-100 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  <FaXmark className="text-xs group-hover:rotate-90" /> {t("clear")}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedReassignUserId && <span className="text-amber-100 text-[11px] ml-1">{t("pick_the_new_assignee")}</span>}
                  <UserSelect
                    mode="single"
                    value={selectedReassignUserId}
                    onChange={setSelectedReassignUserId}
                    placeholder={t("search_select_user")}
                  />
                </div>
                <button
                  onClick={handleReassignLeads}
                  disabled={!selectedReassignUserId || isReassigning || !hasPermission("lead:reassign")}
                  className="bg-white text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isReassigning ? (
                    <>
                      <Spinner color="text-amber-500" /> {t("reassigning")}
                    </>
                  ) : (
                    <>
                      <TbArrowsExchange className="text-lg" /> {t("reassign_leads")}
                    </>
                  )}
                </button>
                <button
                  onClick={handleRevokeLeads}
                  disabled={!hasPermission("deal:reassign")}
                  className="bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {t("revoke")}
                </button>
              </div>
            </div>
          )}

          {currentTab !== TAB.ASSIGNED ? (
            <div className="overflow-x-scroll custom-scrollbar">
              <table className="w-full rounded-xl overflow-hidden">
                <thead>
                  <tr className="w-full border-b-2 border-zinc-300 dark:border-zinc-400  bg-slate-200 dark:bg-gray-800">
                    <div>
                   {hasPermission(PERMISSIONS.assignLead) &&
                    currentTab === TAB.ALL &&
                    assignableLeads.length > 0 && (
                      <th className="p-4 w-12">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input ref={selectAllRef} type="checkbox" className="sr-only" 
                          checked={isAllSelected} onChange={handleSelectAll} />
                          <div
                            className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                          ${
                            isAllSelected || isIndeterminate
                              ? "bg-cyan-600 border-cyan-600"
                              : "bg-white dark:bg-gray-700 border-slate-300 hover:border-cyan-400"
                          }`}
                          >
                            {
                            isIndeterminate && <FaCheck className="text-white text-[9px]" />}
                            {isAllSelected && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>
                        </label>
                      </th>
                    )}
                    </div>
                    {[
                      "client_info",
                      "phone",
                      "project_type",
                      "source",
                      "status",
                      "data_tag",
                      "created_date",
                      "created_by",
                      "engagement_status",
                      "actions",
                    ].map((h) => {
                      const filterConfig = h != "Status" ? options[h] : currentTab === TAB.ALL && options[h];

                      return (
                        <th
                          key={h}
                          className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 font-semibold text-nowrap tracking-wide"
                        >
                          {t(h)}
                          {filterConfig && (
                            <>
                              <br />
                              <select
                                onChange={(e) => filterConfig.handlefunction(e.target.value)}
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none"
                              >
                                <option value="">{t("all")}</option>

                                {filterConfig.value.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                          {h == "project_type" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none"
                                placeholder={t("search_2")}
                                onChange={(e) => handleProjectType(e.target.value)}
                              />
                            </>
                          )}
                          {h == "source" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none"
                                placeholder={t("search_2")}
                                onChange={(e) => handleSource(e.target.value)}
                              />
                            </>
                          )}
                          {h == "data_tag" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none"
                                placeholder={t("search_2")}
                                onChange={(e) => handleDataTag(e.target.value)}
                              />
                            </>
                          )}
                          {h == "engagement_status" && (
                            <>
                              <br />
                              <select
                                value={filters["engagementStatus"]}
                                onChange={(e) => setFilters((prev) => ({ ...prev, engagementStatus: e.target.value }))}
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm outline-none"
                              >
                                <option value="">{t("all")}</option>
                                {Object.values(LeadEngagementStatus).map((s) => (
                                  <option key={s} value={s}>
                                    {s.replace(/_/g, " ").charAt(0).toUpperCase() + s.replace(/_/g, " ").slice(1)}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>{renderLeadRows(currentLeadData)}</tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-scroll custom-scrollbar">
              <table className="w-full rounded-xl ">
                <thead>
                  <tr className="w-full border-b-2 border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20">
                    {hasPermission(PERMISSIONS.reassignLead) && (
                      <th className="p-4 w-12 rounded-tl-xl">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            ref={reassignSelectAllRef}
                            type="checkbox"
                            className="sr-only"
                            checked={allAssignedSelected}
                            onChange={handleReassignSelectAll}
                          />
                          <div
                            className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                          ${
                            allAssignedSelected || isReassignIndeterminate
                              ? "bg-amber-500 border-amber-500"
                              : "bg-white dark:bg-gray-700 border-slate-300 hover:border-amber-400"
                          }`}
                          >
                            {allAssignedSelected && <FaCheck className="text-white text-[9px]" />}
                            {isReassignIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>
                        </label>
                      </th>
                    )}
                    {[
                      "Client Info",
                      "Phone",
                      "Project Type",
                      "Source",
                      "Status",
                      "Data Tag",
                      "Created Date",
                      "Created By",
                      "Engagement Status",
                    ].map((h) => {
                      const filterConfig = options[h];
                      return (
                        <th
                          key={h}
                          className="field p-4 uppercase text-xs text-start text-nowrap text-slate-500 dark:text-slate-300 font-semibold tracking-wide "
                        >
                          {h}
                          {filterConfig && (
                            <>
                              <br />
                              <select
                                onChange={(e) => filterConfig.handlefunction(e.target.value)}
                                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm outline-none"
                              >
                                <option value="">{t("all")}</option>

                                {filterConfig.value.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}

                          {h == "Project Type" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none "
                                placeholder={t("search_2")}
                                onChange={(e) => handleProjectType(e.target.value)}
                              />
                            </>
                          )}
                          {h == "Source" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none "
                                placeholder={t("search_2")}
                                onChange={(e) => handleSource(e.target.value)}
                              />
                            </>
                          )}
                          {h == "Data Tag" && (
                            <>
                              <br />
                              <input
                                type="text"
                                className="field bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm max-w-20 outline-none "
                                placeholder={t("search_2")}
                                onChange={(e) => handleDataTag(e.target.value)}
                              />
                            </>
                          )}
                          {h == "Engagement Status" && (
                            <>
                              <br />
                              <select
                                value={filters["engagementStatus"]}
                                onChange={(e) => setFilters((prev) => ({ ...prev, engagementStatus: e.target.value }))}
                                className="field outline-none  bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm   "
                              >
                                <option value="">{t("all")}</option>
                                {Object.values(LeadEngagementStatus).map((s) => (
                                  <option key={s} value={s}>
                                    {s.replace(/_/g, " ").charAt(0).toUpperCase() + s.replace(/_/g, " ").slice(1)}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </th>
                      );
                    })}
                    <th className="p-4 uppercase text-xs text-start text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <RiUserSharedLine /> {t("assigned_to")}
                      </span>
                      <br />
                      <UserSelect mode="single" value={assignFilter} onChange={setAssignFilter} placeholder={t("search_select_user")} />
                    </th>
                    <th className="p-4 rounded-tr-xl uppercase text-xs text-start text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>{renderAssignedRows()}</tbody>
              </table>
            </div>
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