"use client";

import { useState, useRef, useEffect } from "react";
import { User, UserSelectProps } from "@/src/types";

const UserSelect: React.FC<UserSelectProps> = ({
  users,
  selectedUserId,
  setSelectedUserId,
  placeholder = "Search & select user...",
}) => {
  const [search, setSearch] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users
  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Selected user
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="relative min-w-52" ref={dropdownRef}>
      {/* Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={
          isOpen
            ? search
            : selectedUser
            ? `${selectedUser.firstName} ${selectedUser.lastName ?? ""}`
            : ""
        }
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg border outline-none text-xs shadow-sm"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg max-h-60 overflow-y-auto shadow-lg">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                title={`${u.firstName} ${u.lastName ?? ""}`}
                onClick={() => {
                  setSelectedUserId(u.id);
                  setSearch("");
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 capitalize text-xs whitespace-nowrap overflow-hidden truncate"
              >
                {u.firstName} {u.lastName ?? ""}
                {u.userRole?.[0]?.name
                  ? ` · ${u.userRole[0].name}`
                  : ""}
              </div>
            ))
          ) : (
            <div className="px-3 py-1.5 text-gray-400 text-xs whitespace-nowrap">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSelect;