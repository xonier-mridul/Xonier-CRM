"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User } from "@/src/types";
import { AuthService } from "@/src/services/auth.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BaseUserSelectProps {
  /** Show the full scrollable user list below the search bar (default: false — dropdown only) */
  showList?: boolean;
  placeholder?: string;
  cls?: string;
  /** "Assign to Me" button — pass current user id to enable */
  currentUserId?: string;
  disabled?: boolean;
}

interface SingleUserSelectProps extends BaseUserSelectProps {
  mode: "single";
  value: string;
  onChange: (userId: string) => void;
}

interface MultiUserSelectProps extends BaseUserSelectProps {
  mode: "multiple";
  value: string[];
  onChange: (userIds: string[]) => void;
}

export type UserSelectProps = SingleUserSelectProps | MultiUserSelectProps;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userName(u: User) {
  return `${u.firstName} ${u.lastName ?? ""}`.trim();
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── UserSelect ───────────────────────────────────────────────────────────────

const UserSelect: React.FC<UserSelectProps> = (props) => {
  const {
    showList = false,
    placeholder = "Search users…",
    cls,
    currentUserId,
    disabled = false,
  } = props;

  // ── Internal state ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Refs so the fetch function never reads stale state
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const searchRef = useRef("");
  const debounce = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isSingle = props.mode === "single";
  const isMultiple = props.mode === "multiple";

  const selectedIds: string[] = isSingle
    ? props.value ? [props.value] : []
    : (props as MultiUserSelectProps).value;

  const userMap = users.reduce<Record<string, User>>((acc, u) => {
    if (u.id) acc[u.id] = u;
    return acc;
  }, {});

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;

    const currentPage = pageRef.current; // ✅ FIX: snapshot page

    setLoading(true);

    try {
      const result = await AuthService.getAllTeamUsers({
        search: searchRef.current,
        page: currentPage,
      });

      if (result.status === 200) {
        const newUsers: User[] = result.data.data ?? [];

        setUsers((prev) =>
          currentPage === 1 ? newUsers : [...prev, ...newUsers]
        );

        if (newUsers.length < PAGE_SIZE) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          pageRef.current = currentPage + 1; // ✅ FIX: update AFTER using snapshot
        }
      }
    } catch (err) {
      console.error("[UserSelect] fetchUsers error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(() => {
      searchRef.current = search;
      pageRef.current = 1;
      hasMoreRef.current = true;
      loadingRef.current = false;
      setHasMore(true);
      setUsers([]);
      fetchUsers();
    }, 300);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, fetchUsers]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    if (showList) return; // list mode doesn't use a dropdown
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showList]);

  // ── Scroll handler (works for both dropdown and inline list) ────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 40) {
      fetchUsers();
    }
  };

  // ── Toggle selection ────────────────────────────────────────────────────────
  const toggle = (userId: string) => {
    if (isSingle) {
      const selected = users.find(u => u.id === userId) || null;
      setSelectedUser(selected);
      (props as SingleUserSelectProps).onChange(userId);
      setIsOpen(false);
      setSearch("");
    } else {
      const next = selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId];
      (props as MultiUserSelectProps).onChange(next);
      setSearch("");
      searchRef.current = "";
      pageRef.current = 1;
      hasMoreRef.current = true;
      setUsers([]);

    }
  };

  const deselect = (userId: string) => {
    if (isSingle) {
      (props as SingleUserSelectProps).onChange("");
    } else {
      (props as MultiUserSelectProps).onChange(
        selectedIds.filter((id) => id !== userId),
      );
    }
  };

  // ── Assign to me ────────────────────────────────────────────────────────────
  const assignToMe = () => {
    if (!currentUserId) return;
    if (isSingle) {
      (props as SingleUserSelectProps).onChange(currentUserId);
    } else {
      if (!selectedIds.includes(currentUserId))
        (props as MultiUserSelectProps).onChange([...selectedIds, currentUserId]);
    }
  };

  // ── Single-mode display value ───────────────────────────────────────────────
  const singleDisplayValue = () => {
    if (isOpen) return search;
    if (isSingle && props.value) {
      const u = userMap[props.value] || selectedUser;
      return u ? userName(u) : "";
    }
    return "";
  };

  // ── User list rows (shared between dropdown and inline list) ────────────────
  const UserRows = (
    <div
      onScroll={handleScroll}
      className={
        showList
          ? "max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-2 space-y-0.5"
          : "max-h-52 overflow-y-auto p-1 space-y-0.5"
      }
    >
      {users.map((user) => {
        const selected = selectedIds.includes(user.id);
        return (
          <div
            key={user.id}
            onClick={() => !disabled && toggle(user.id)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-sm transition select-none ${disabled ? "opacity-50 cursor-not-allowed" :
              selected
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Avatar */}
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                {user.firstName?.[0]}{user.lastName?.[0] ?? ""}
              </span>
              <span className="truncate">
                {userName(user)}
                {user.userRole?.[0]?.name && (
                  <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                    · {user.userRole[0].name}
                  </span>
                )}
              </span>
            </div>
            {selected && (
              <span className="text-blue-500 text-xs font-bold flex-shrink-0 ml-2">✓</span>
            )}
          </div>
        );
      })}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner />
          <span className="text-xs text-gray-400">Loading more…</span>
        </div>
      )}

      {/* End of list */}
      {!hasMore && !loading && users.length > 0 && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-1.5 border-t border-gray-100 dark:border-gray-700 mt-1">
          No more users
        </div>
      )}

      {/* Empty */}
      {!loading && users.length === 0 && (
        <div className="flex items-center justify-center py-3 text-sm text-gray-400 dark:text-gray-500">
          No users found
        </div>
      )}
    </div>
  );

  // ── Selected pills (multiple mode) ──────────────────────────────────────────
  const SelectedPills = isMultiple && selectedIds.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {selectedIds.map((id) => {
        const u = userMap[id];
        const label = u ? userName(u) : id;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
          >
            👤 {id === currentUserId ? "You" : label}
            {!disabled && (
              <button
                type="button"
                onClick={() => deselect(id)}
                className="text-indigo-300 hover:text-red-500 dark:hover:text-red-400 transition leading-none"
              >
                ×
              </button>
            )}
          </span>
        );
      })}
    </div>
  ) : null;

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: showList mode (inline, no dropdown)
  // ────────────────────────────────────────────────────────────────────────────
  if (showList) {
    return (
      <div className={`space-y-3 ${cls ?? ""}`}>


        {/* Single-mode selected display */}
        {isSingle && props.value && userMap[props.value] && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              👤 {userMap[props.value] ? userName(userMap[props.value]) : props.value}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => deselect(props.value)}
                className="ml-auto text-indigo-300 hover:text-red-500 transition text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputCls}
        />
        {UserRows}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: dropdown mode
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${cls ?? "min-w-52"}`} ref={dropdownRef}>

      {/* Search input */}
      <input
        type="text"
        placeholder={
          isSingle && props.value && !isOpen
            ? (userMap[props.value] ? userName(userMap[props.value]) : placeholder)
            : placeholder
        }
        value={isSingle ? singleDisplayValue() : search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={
          (cls ??
            "w-full bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg border outline-none text-xs shadow-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          ) + " px-3 py-1.5"}
      />

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
          {/* Assign to me row */}
          {currentUserId && (
            <div
              onClick={assignToMe}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition"
            >
              ⚡ Assign to Me
            </div>
          )}
          {UserRows}
        </div>
      )}
    </div>
  );
};

export default UserSelect;