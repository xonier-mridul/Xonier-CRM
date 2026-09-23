"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Star, Users, TrendingUp, Search, ChevronDown, Eye } from "lucide-react";
import Pagination from "@/src/components/common/pagination";
import { RatingService } from "@/src/services/rating.service";

interface RatedUser {
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  rating: number;
  reviews: number;
  lastRated: string;
}

interface StatsData {
  totalRatedUsers: number;
  averageRating: number;
  highestRating: number;
}

const RATING_OPTIONS = [
  "All Ratings",
  "4.5 & above",
  "4.0 - 4.5",
  "3.5 - 4.0",
  "Below 3.5",
];

type DropdownKey = "role" | "rating" | "department" | "designation" | null;

const Page = () => {
  const [users, setUsers] = useState<RatedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<StatsData>({
    totalRatedUsers: 0,
    averageRating: 0,
    highestRating: 0,
  });

  // Dynamic filter option lists (from backend)
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedRating, setSelectedRating] = useState("All Ratings");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedDesignation, setSelectedDesignation] = useState("All Designations");

  // Single active dropdown tracker
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRatedUsers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await RatingService.getRatedUsers(currentPage, itemsPerPage, {
        search: debouncedSearch,
        role: selectedRole !== "All Roles" ? selectedRole : "",
        rating: selectedRating !== "All Ratings" ? selectedRating : "",
        department: selectedDepartment !== "All Departments" ? selectedDepartment : "",
        designation: selectedDesignation !== "All Designations" ? selectedDesignation : "",
      });

      const data = res.data;

      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalUsers(data.totalUsers || 0);

      setStats(
        data.stats || {
          totalRatedUsers: 0,
          averageRating: 0,
          highestRating: 0,
        }
      );

      setRoleOptions(data.filters?.roles || []);
      setDepartmentOptions(data.filters?.departments || []);
      setDesignationOptions(data.filters?.designations || []);
    } catch (error) {
      console.error("Failed to fetch rated users:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    selectedRole,
    selectedRating,
    selectedDepartment,
    selectedDesignation,
  ]);

  useEffect(() => {
    fetchRatedUsers();
  }, [fetchRatedUsers]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedRole("All Roles");
    setSelectedRating("All Ratings");
    setSelectedDepartment("All Departments");
    setSelectedDesignation("All Designations");
    setCurrentPage(1);
  };

  console.log("users :",users)

  const showingFrom = totalUsers === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalUsers);

  return (
    <div className="space-y-6 ">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Star className="h-7 w-7 fill-blue-500 text-blue-500" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Rated Users
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          View and manage all users who have received ratings.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card
          icon={<Users className="h-6 w-6 text-blue-500" />}
          title="Total Rated Users"
          value={String(stats.totalRatedUsers)}
        />
        <Card
          icon={<Star className="h-6 w-6 text-yellow-500" />}
          title="Average Rating"
          value={stats.averageRating.toFixed(1)}
          suffix="/ 5"
        />
        <Card
          icon={<TrendingUp className="h-6 w-6 text-green-500" />}
          title="Highest Rating"
          value={stats.highestRating.toFixed(1)}
          suffix="/ 5"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:flex-wrap dark:border-slate-700">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900"
            />
          </div>

          {/* Role Filter */}
          <FilterDropdown
            label={selectedRole}
            isOpen={openDropdown === "role"}
            onToggle={() =>
              setOpenDropdown((prev) => (prev === "role" ? null : "role"))
            }
            options={["All Roles", ...roleOptions]}
            selected={selectedRole}
            onSelect={(val) => {
              setSelectedRole(val);
              setCurrentPage(1);
              setOpenDropdown(null);
            }}
          />

          {/* Department Filter */}
          {/* <FilterDropdown
            label={selectedDepartment}
            isOpen={openDropdown === "department"}
            onToggle={() =>
              setOpenDropdown((prev) => (prev === "department" ? null : "department"))
            }
            options={["All Departments", ...departmentOptions]}
            selected={selectedDepartment}
            onSelect={(val) => {
              setSelectedDepartment(val);
              setCurrentPage(1);
              setOpenDropdown(null);
            }}
          /> */}

          {/* Designation Filter */}
          {/* <FilterDropdown
            label={selectedDesignation}
            isOpen={openDropdown === "designation"}
            onToggle={() =>
              setOpenDropdown((prev) => (prev === "designation" ? null : "designation"))
            }
            options={["All Designations", ...designationOptions]}
            selected={selectedDesignation}
            onSelect={(val) => {
              setSelectedDesignation(val);
              setCurrentPage(1);
              setOpenDropdown(null);
            }}
          /> */}

          {/* Rating Filter */}
          <FilterDropdown
            label={selectedRating}
            isOpen={openDropdown === "rating"}
            onToggle={() =>
              setOpenDropdown((prev) => (prev === "rating" ? null : "rating"))
            }
            options={RATING_OPTIONS}
            selected={selectedRating}
            onSelect={(val) => {
              setSelectedRating(val);
              setCurrentPage(1);
              setOpenDropdown(null);
            }}
          />

          <button
            onClick={handleClearFilters}
            className="px-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">User</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Role</th>
                {/* <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Department</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Designation</th> */}
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Rating</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Total Reviews</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase text-slate-500">Last Rated</th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No rated users found.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900/40">
                          {user.name
                            .split(" ")
                            .map((name) => name[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {user.role}
                      </span>
                    </td>
{/* 
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {user.department}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {user.designation}
                    </td> */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {user.rating}
                        </span>
                        <span className="text-xs text-slate-400">/ 5</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {user.reviews}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {user.lastRated}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 md:flex-row dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium">{showingFrom} - {showingTo}</span> of{" "}
            <span className="font-medium">{totalUsers}</span> users
          </p>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            className="w-full md:w-auto"
          />
        </div>
      </div>
    </div>
  );
};

interface FilterDropdownProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
}

const FilterDropdown = ({
  label,
  isOpen,
  onToggle,
  options,
  selected,
  onSelect,
}: FilterDropdownProps) => {
  return (
    <div className="relative min-w-[180px]">
      <button
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-600 ${
                selected === opt
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  suffix?: string;
}

const Card = ({ icon, title, value, suffix }: CardProps) => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</span>
          {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
        </div>
      </div>
    </div>
  );
};

export default Page;