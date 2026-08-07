"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import { FaXmark } from "react-icons/fa6";

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface CustomUserFilterSelectProps {
  users: UserOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  accentColor?: "cyan" | "purple" | "amber";
}

const accentMap = {
  cyan: "focus-within:ring-cyan-500/30 hover:border-cyan-400",
  purple: "focus-within:ring-purple-500/30 hover:border-purple-400",
  amber: "focus-within:ring-amber-500/30 hover:border-amber-400",
};

const CustomUserFilterSelect = ({
  users,
  value,
  onChange,
  placeholder = "Search & select user",
  accentColor = "amber",
}: CustomUserFilterSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const selectedUser = users.find((u) => u.id === value);
  const selectedName = selectedUser
    ? `${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}`.trim()
    : "";

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm outline-none dark:text-white/70 transition-all cursor-pointer
          ${accentMap[accentColor]}`}
      >
        <span className={`truncate ${selectedName ? "capitalize" : "text-slate-400 dark:text-slate-400"}`}>
          {selectedName || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <FaXmark className="text-xs" />
            </span>
          )}
          <FaChevronDown className={`text-[10px] text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[220px] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-slate-900/10 dark:border-slate-600 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100 dark:border-slate-600 flex items-center gap-2 bg-slate-50 dark:bg-gray-800">
            <IoIosSearch className="text-slate-400 text-sm shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="w-full bg-transparent outline-none text-sm dark:text-white/70"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelected = u.id === value;
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unknown";
                const initials = `${u.firstName?.charAt(0) ?? ""}${u.lastName?.charAt(0) ?? ""}`.toUpperCase();
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors
                      ${isSelected ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-amber-400 dark:bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials || "?"}
                      </span>
                      <span className="text-sm capitalize truncate dark:text-white/80">{name}</span>
                    </span>
                    {isSelected && <FaCheck className="text-amber-500 text-xs shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">No users found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomUserFilterSelect;