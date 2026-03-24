"use client";
import React, {
  JSX,
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
} from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { User } from "@/src/types";
import { AuthService } from "@/src/services/auth.service";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import extractErrorMessages from "../../utils/error.utils";
import {
  FiSearch,
  FiTrash2,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiArchive,
} from "react-icons/fi";
import { MdOutlineDeleteForever } from "react-icons/md";

// ─── Avatar helper ───────────────────────────────────────────────────────────

const getInitials = (firstName: string, lastName: string | undefined) =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

const avatarColors = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500",
  "bg-sky-500", "bg-violet-500", "bg-pink-500",
];

const getAvatarColor = (str: string) =>
  avatarColors[str.charCodeAt(0) % avatarColors.length];

// ─── Skeleton row ────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100 dark:border-gray-800">
    <td className="px-4 py-4"><div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" /></td>
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </td>
    <td className="px-4 py-4"><div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
    <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" /></td>
    <td className="px-4 py-4"><div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" /></td>
    <td className="px-4 py-4"><div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
    <td className="px-4 py-4">
      <div className="flex gap-2">
        <div className="h-7 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="h-7 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>
    </td>
  </tr>
);

// ─── Stat card ───────────────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) => (
  <div className="flex-1 min-w-[140px] rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
      {label}
    </p>
    <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
  </div>
);

// ─── Main page ───────────────────────────────────────────────────────────────

const DeletedUsersPage = (): JSX.Element => {
  const [userData, setUserData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPage, setTotalPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Search
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch deleted users ──────────────────────────────────────────────────

  const fetchDeletedUsers = useCallback(async () => {
    setIsLoading(true);
    setErr("");
    try {
      // Replace with your actual service call — e.g. AuthService.getDeleted(...)
      const result = await AuthService.deletedUser({
        page: currentPage || 1,
        limit: pageLimit || 10,             // pass whatever filter your API expects
        search: debouncedSearch || "",
      });

      if (result.status === 200) {
        const d = result.data.data;
        setUserData(d.data);
        setCurrentPage(d.page);
        setPageLimit(d.limit);
        setTotalPage(d.totalPages);
        setTotalCount(d.total ?? d.data.length);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, debouncedSearch]);

  useEffect(() => {
    fetchDeletedUsers();
  }, [fetchDeletedUsers]);

  // Reset selected when data reloads
  useEffect(() => {
    setSelected(new Set());
  }, [userData]);

  // ── Selection helpers ────────────────────────────────────────────────────

  const allIds = userData.map((u) => u.id as string);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Ref for the select-all checkbox — needed to set indeterminate (not a React prop)
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someSelected;
    selectAllRef.current.checked = allSelected;
  }, [someSelected, allSelected]);

  // ── Restore single ───────────────────────────────────────────────────────

  const handleRestore = async (id: string, name: string) => {
    const confirm = await ConfirmPopup({
      title: "Restore user?",
      text: `"${name}" will be restored and gain access again.`,
      btnTxt: "Yes, restore",
    });

    if (!confirm) return;

    try {
      // Replace with your actual restore service call
      const result = await AuthService.restore(id);
      if (result.status === 200) {
        toast.success(`${name} restored successfully`);
        await fetchDeletedUsers();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg = extractErrorMessages(error);
        toast.error(`${msg}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  // ── Permanent delete single ──────────────────────────────────────────────

  const handlePermanentDelete = async (id: string, name: string) => {
    const confirm = await ConfirmPopup({
      title: "Permanently delete?",
      text: `This will permanently remove "${name}". This action cannot be undone.`,
      btnTxt: "Yes, delete permanently",
    });

    if (!confirm) return;

    try {
      // Replace with your actual permanent delete service call
      const result = await AuthService.permanentDelete(id);
      if (result.status === 200) {
        toast.success(`${name} permanently deleted`);
        await fetchDeletedUsers();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg = extractErrorMessages(error);
        toast.error(`${msg}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  // ── Bulk delete ──────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;

    const confirm = await ConfirmPopup({
      title: `Permanently delete ${selected.size} user${selected.size > 1 ? "s" : ""}?`,
      text: "All selected users will be permanently removed. This action cannot be undone.",
      btnTxt: `Delete ${selected.size} user${selected.size > 1 ? "s" : ""}`,
    });

    if (!confirm) return;

    try {
      // Replace with your actual bulk delete service call
      const result = await AuthService.bulkPermanentDelete({
        userIds: Array.from(selected)
      });
      if (result.status === 200) {
        toast.success(`${selected.size} user${selected.size > 1 ? "s" : ""} permanently deleted`);
        setSelected(new Set());
        await fetchDeletedUsers();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg = extractErrorMessages(error);
        toast.error(`${msg}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  // ── Bulk restore ───────────────────────────────────────────────────────
  const handleBulkRestore = async () => {
    if (selected.size === 0) {
      toast.warning("Please select a user to restore");
      return;
    }

    try {
      // Replace with your actual bulk restore service call
      const result = await AuthService.bulkRestore({
        userIds: Array.from(selected)
      });
      if (result.status === 200) {
        toast.success(`${selected.size} user${selected.size > 1 ? "s" : ""} restored`);
        setSelected(new Set());
        await fetchDeletedUsers();
      }
      else {
        toast.error("Failed to restore users")
      }
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  // ── Pagination helpers ───────────────────────────────────────────────────

  const pages = Array.from({ length: totalPage }, (_, i) => i + 1);
  const startEntry = (currentPage - 1) * pageLimit + 1;
  const endEntry = Math.min(currentPage * pageLimit, totalCount);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ml-72 mt-16 p-6 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">

      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MdOutlineDeleteForever className="w-5 h-5 text-rose-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Deleted Users
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage soft-deleted accounts — restore or permanently remove them.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard label="Total Deleted" value={totalCount} accent="text-rose-500 dark:text-rose-400" />
        <StatCard label="This Page" value={userData.length} accent="text-amber-500 dark:text-amber-400" />
        <StatCard label="Selected" value={selected.size} accent="text-violet-500 dark:text-violet-400" />
      </div>

      {/* ── Error banner ── */}
      {err && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{Array.isArray(err) ? err.join(", ") : err}</span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-gray-500 pointer-events-none">
            <FiSearch />
          </span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:focus:ring-rose-600 transition-shadow"
          />
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {/* Bulk delete button */}
          {selected.size > 0 && (
            <>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors duration-150"
              >
                <MdOutlineDeleteForever />
                Delete {selected.size} selected
              </button>
              <button
                onClick={handleBulkRestore}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors duration-150"
              >
                <FiRotateCcw />
                Restore {selected.size} selected
              </button>
            </>
          )}
          {/* Rows per page */}
          <select
            value={pageLimit}
            onChange={(e) => {
              setPageLimit(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:focus:ring-rose-600 transition-shadow"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>

        </div>
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-sm whitespace-nowrap">
            {/* Head */}
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
                {/* Checkbox all */}
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  User
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  Phone
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  Company
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  Deleted On
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isLoading
                ? Array.from({ length: pageLimit > 5 ? 5 : pageLimit }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
                : userData.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-gray-400 dark:text-gray-600">
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-gray-300 dark:text-gray-700">
                            <FiArchive />
                          </span>
                          <p className="font-medium text-gray-500 dark:text-gray-400">No deleted users found</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">
                            {debouncedSearch ? "Try a different search term." : "Soft-deleted users will appear here."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : userData.map((u) => {
                    const id = u.id as string;
                    const name = `${u.firstName} ${u.lastName}`;
                    const isChecked = selected.has(id);
                    const roleLabel =
                      Array.isArray(u.userRole) && u.userRole.length > 0
                        ? (u.userRole[0] as any)?.name ?? "—"
                        : "—";
                    const deletedDate = u.deletedAt
                      ? new Date(u.deletedAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                      : "—";

                    return (
                      <tr
                        key={id}
                        className={`border-b border-gray-50 dark:border-gray-800/70 transition-colors duration-100
                          ${isChecked
                            ? "bg-rose-50/60 dark:bg-rose-950/30"
                            : "hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(id)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                          />
                        </td>

                        {/* User info */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 ${getAvatarColor(name)} opacity-70`}
                            >
                              {getInitials(u.firstName, u?.lastName)}
                              {/* Deleted badge overlay */}
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-1 ring-white dark:ring-gray-900" title="Deleted" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                {name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {u.phone || "—"}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                            {roleLabel}
                          </span>
                        </td>

                        {/* Company */}
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {u.company || "—"}
                        </td>

                        {/* Deleted date */}
                        <td className="px-4 py-3.5 text-gray-500 dark:text-gray-500 whitespace-nowrap text-xs">
                          {deletedDate}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {/* Restore */}
                            <button
                              onClick={() => handleRestore(id, name)}
                              title="Restore user"
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
                            >
                              <FiRotateCcw />
                              Restore
                            </button>

                            {/* Permanent delete */}
                            <button
                              onClick={() => handlePermanentDelete(id, name)}
                              title="Permanently delete"
                              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination ── */}
        {!isLoading && userData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20">
            {/* Entry count */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{startEntry}–{endEntry}</span> of{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{totalCount}</span> deleted users
            </p>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft />
              </button>

              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`rounded-md w-8 h-8 text-sm font-semibold transition-colors duration-150
                    ${p === currentPage
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPage, p + 1))}
                disabled={currentPage >= totalPage}
                className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeletedUsersPage;