"use client";
import React, { useState, useEffect, useRef } from "react";
import { TelephoneNumber, CreatePhoneNumber } from "@/src/types/communication/telephone.types";
import { User } from "@/src/types";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import { TelephoneServices } from "@/src/services/communication/telephone.service";
import { IoIosSearch } from "react-icons/io";
import { FaPlus, FaRegEye, FaXmark } from "react-icons/fa6";
import { MdOutlineEdit, MdDeleteOutline, MdOutlineContentCopy, MdPhone, MdPerson, MdCalendarToday, MdCheckCircle, MdCancel } from "react-icons/md";
import { IoClose, IoPhonePortrait } from "react-icons/io5";
import { HiUserAdd } from "react-icons/hi";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import Skeleton from "react-loading-skeleton";
import Pagination from "@/src/components/common/pagination";
import Input from "@/src/components/ui/Input";
import { toast } from "react-toastify";
import { PHONE_NUMBER_STATUS } from "@/src/constants/enum";
import { AuthService } from "@/src/services/auth.service";
import { AssignedPhoneNumber } from "@/src/types";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

const Page = () => {
  const [telephoneData, setTelephoneData] = useState<TelephoneNumber[]>([]);
  const [userData, setUserData] = useState<User[] | []>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchVal, setSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedPhone, setSelectedPhone] = useState<TelephoneNumber | null>(null);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignPhone, setAssignPhone] = useState<TelephoneNumber | null>(null);
  const [userSearch, setUserSearch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [clearingUserId, setClearingUserId] = useState<string | null>(null);

  const getTelephonesNumber = async () => {
    setIsLoading(true);
    try {
      const result = await TelephoneServices.getAllActives(currentPage, pageLimit, filters);
      if (result.status === 200) {
        const data = result.data.data;
        setTelephoneData(Array.isArray(data.data) ? data.data : []);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        setTotalPages(Number(data.totalPages));
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
  };

  useEffect(() => {
    getTelephonesNumber();
  }, [currentPage, pageLimit, filters]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getAllUsers = async () => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) {
        const data = result.data.data;
        setUserData(data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      if (val.trim()) {
        setFilters({ number: val.trim() });
      } else {
        setFilters({});
      }
    }, 500);
  };

  const getCreatorName = (createdBy: string | User) => {
    if (typeof createdBy === "string") return "Unknown";
    return `${createdBy.firstName} ${createdBy.lastName ?? ""}`.trim();
  };

  const handleView = (phone: TelephoneNumber) => {
    setSelectedPhone(phone);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedPhone(null);
  };

  const openCreateModal = () => {
    setPhoneNumber("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setPhoneNumber("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }
    setIsCreating(true);
    try {
      const payload: CreatePhoneNumber = { phoneNumber: phoneNumber.trim() };
      const result = await TelephoneServices.create(payload);
      if (result.status === 200 || result.status === 201) {
        toast.success("Phone number created successfully");
        closeCreateModal();
        getTelephonesNumber();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Failed to create phone number");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openAssignModal = (phone: TelephoneNumber) => {
    setAssignPhone(phone);
    setSelectedUser(null);
    setUserSearch("");
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignPhone(null);
    setSelectedUser(null);
    setUserSearch("");
  };

  const handleAssign = async () => {
    if (!selectedUser || !assignPhone) return;
    setIsAssigning(true);
    try {
      const payload: AssignedPhoneNumber = { assignedPhoneNumber: assignPhone.id };
      const result = await AuthService.assignNumber(selectedUser.id, payload);
      if (result.status === 200 || result.status === 201) {
        toast.success(`Phone number assigned to ${selectedUser.firstName} ${selectedUser.lastName ?? ""} successfully`);
        closeAssignModal();
        getTelephonesNumber();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Failed to assign phone number");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClearNumber = async (userId: string, name: string, number:string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClearingUserId(userId);
    try {

      const confirm = await ConfirmPopup({title: "Are you sure", text: `Are you sure to remove ${number} phone number from ${name} user`, btnTxt:"Yes, Remove"})

      if(confirm){
      const result = await AuthService.clearNumber(userId);
      if (result.status === 200 || result.status === 201) {
        toast.success("Phone number cleared successfully");
        getAllUsers();
        getTelephonesNumber();
      }
      }
      
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Failed to clear phone number");
      }
    } finally {
      setClearingUserId(null);
    }
  };

  const filteredUsers = userData.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName ?? ""}`.toLowerCase();
    const email = user.email.toLowerCase();
    const query = userSearch.toLowerCase().trim();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <>
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
                Telephone Numbers
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Manage your organization's phone numbers
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                value={pageLimit}
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
                onChange={(e) => setPageLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>

              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input
                  type="text"
                  placeholder="Search phone number..."
                  className="outline-none bg-transparent"
                  value={searchVal}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group"
              >
                <FaPlus className="group-hover:rotate-90 transition-all duration-300" />
                Add Number
              </button>
            </div>
          </div>

          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Phone Number
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Status
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Created By
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Created Date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                telephoneData && Array.isArray(telephoneData) && telephoneData.length > 0 ? (
                  telephoneData.map((phone, i) => {
                    const isEven = i % 2 === 0;
                    const date = formatDate(phone.createdAt);

                    return (
                      <tr
                        key={phone.id}
                        className={`${
                          isEven
                            ? "bg-white dark:bg-transparent"
                            : "bg-blue-100/50 dark:bg-slate-500"
                        } w-full`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold font-mono">{phone.phoneNumber}</span>
                            <button
                              onClick={() => handleCopy(phone.phoneNumber)}
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <MdOutlineContentCopy className="text-sm" />
                            </button>
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className={`${
                              phone.status === PHONE_NUMBER_STATUS.ACTIVE
                                ? "bg-green-500"
                                : phone.status === PHONE_NUMBER_STATUS.INACTIVE
                                ? "bg-gray-600"
                                : "bg-red-500"
                            } text-white px-4 py-1.5 text-sm rounded-md capitalize`}
                          >
                            {phone.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="text-sm capitalize">{getCreatorName(phone.createdBy)}</span>
                        </td>

                        <td className="p-4">
                          <span className="px-3 py-1.5 rounded-md bg-blue-100 text-xs text-blue-600 font-medium">
                            {date}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(phone)}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104 transition-transform"
                            >
                              <FaRegEye className="text-xl" />
                            </button>

                            {phone.status !== PHONE_NUMBER_STATUS.DELETED && (
                              <button
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104 transition-transform cursor-pointer"
                              >
                                <MdOutlineEdit className="text-xl" />
                              </button>
                            )}

                            {phone.status !== PHONE_NUMBER_STATUS.DELETED && (
                              <button className="h-9 w-9 flex items-center justify-center rounded-md bg-red-200/80 dark:bg-red-100 hover:bg-red-300/70 dark:hover:bg-red-200 text-red-500 hover:scale-104 transition-transform cursor-pointer" title="Delete phone number">
                                <MdDeleteOutline className="text-xl" />
                              </button>
                            )}

                            {phone.status !== PHONE_NUMBER_STATUS.DELETED && (
                              <button
                                onClick={() => openAssignModal(phone)}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-200/80 dark:bg-purple-100 hover:bg-purple-300/70 dark:hover:bg-purple-200 text-purple-500 hover:scale-104 transition-transform cursor-pointer"
                                title="Assign to user"
                              >
                                <HiUserAdd className="text-xl" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-4 text-center" colSpan={5}>
                      Data not found
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 10 }).map((_, i) => {
                  const isEven = i % 2 === 0;
                  return (
                    <tr
                      key={i}
                      className={`${
                        isEven
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Skeleton width={140} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Skeleton width={32} height={32} borderRadius={10} />
                          <Skeleton width={32} height={32} borderRadius={10} />
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            className="w-full"
          />
        </div>
      </div>

      {showViewModal && selectedPhone && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <IoPhonePortrait className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Phone Number Details</h3>
                  <p className="text-sm text-blue-100">View complete information</p>
                </div>
              </div>
              <button
                onClick={closeViewModal}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors group cursor-pointer"
              >
                <IoClose className="w-6 h-6 group-hover:rotate-90" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Phone Number
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">
                      {selectedPhone.phoneNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleCopy(selectedPhone.phoneNumber);
                      toast.success("Phone number copied!");
                    }}
                    className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                  >
                    <MdOutlineContentCopy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-5 border border-slate-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      {selectedPhone.status === PHONE_NUMBER_STATUS.ACTIVE ? (
                        <MdCheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <MdCancel className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      selectedPhone.status === PHONE_NUMBER_STATUS.ACTIVE
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        : selectedPhone.status === PHONE_NUMBER_STATUS.INACTIVE
                        ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }`}
                  >
                    {selectedPhone.status === PHONE_NUMBER_STATUS.ACTIVE && <MdCheckCircle className="w-4 h-4" />}
                    {selectedPhone.status === PHONE_NUMBER_STATUS.INACTIVE && <MdCancel className="w-4 h-4" />}
                    {selectedPhone.status === PHONE_NUMBER_STATUS.DELETED && <MdDeleteOutline className="w-4 h-4" />}
                    <span className="capitalize">{selectedPhone.status}</span>
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-5 border border-slate-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <MdPerson className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created By
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {typeof selectedPhone.createdBy === "string"
                        ? "?"
                        : `${selectedPhone.createdBy.firstName?.[0] ?? ""}${selectedPhone.createdBy.lastName?.[0] ?? ""}`}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {getCreatorName(selectedPhone.createdBy)}
                      </p>
                     
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-5 border border-slate-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <MdCalendarToday className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created Date
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedPhone.createdAt)}</p>
                </div>

                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-5 border border-slate-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <MdPhone className="w-5 h-5 text-violet-500" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Phone ID
                    </p>
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{selectedPhone.id}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-gray-700/30 border-t border-slate-100 dark:border-gray-700 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={closeViewModal}
                className="px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors border border-slate-200 dark:border-gray-600"
              >
                Close
              </button>
              {selectedPhone.status !== PHONE_NUMBER_STATUS.DELETED && (
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                  Edit Number
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FaPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Add Phone Number</h3>
                  <p className="text-sm text-blue-100">Create a new telephone number</p>
                </div>
              </div>
              <button
                onClick={closeCreateModal}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <IoClose className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <Input
                label="Phone Number"
                type="text"
                placeholder="Enter phone number (e.g., +1234567890)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    Make sure to include the country code and format the number correctly. Example: +1 (555) 123-4567
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors border border-slate-200 dark:border-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaPlus className="w-4 h-4" />
                      Create Number
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && assignPhone && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-400 px-6 py-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <HiUserAdd className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Assign Phone Number</h3>
                  <p className="text-sm text-purple-100 font-mono">{assignPhone.phoneNumber}</p>
                </div>
              </div>
              <button
                onClick={closeAssignModal}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors group cursor-pointer"
              >
                <IoClose className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-hidden flex-1">
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2 flex-shrink-0">
                <IoIosSearch className="text-xl text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="outline-none bg-transparent w-full text-sm"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button onClick={() => setUserSearch("")} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <IoClose className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
                    const hasNumber = !!user?.assignedPhoneNumber?.phoneNumber;
                    const isClearing = clearingUserId === user.id;

                    return (
                      <div
                        key={user.id}
                        onClick={() => !hasNumber && setSelectedUser(isSelected ? null : user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          hasNumber
                            ? "border-transparent bg-slate-50 dark:bg-gray-700/50 opacity-80 cursor-not-allowed"
                            : isSelected
                            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 cursor-pointer"
                            : "border-transparent bg-slate-50 dark:bg-gray-700/50 hover:border-purple-200 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 cursor-pointer"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            hasNumber
                              ? "bg-gradient-to-br from-orange-400 to-orange-500"
                              : isSelected
                              ? "bg-gradient-to-br from-cyan-500 to-cyan-600"
                              : "bg-gradient-to-br from-gray-400 to-gray-500"
                          }`}
                        >
                          {initials || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate capitalize ${isSelected && !hasNumber ? "text-cyan-700 dark:text-cyan-300" : "text-gray-900 dark:text-white"}`}>
                            {user.firstName} {user.lastName ?? ""}
                          </p>
                          <p className={`text-xs truncate ${hasNumber ? "text-orange-500 dark:text-orange-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                            {hasNumber ? `Assigned: ${user.assignedPhoneNumber.phoneNumber}` : "No number assigned"}
                          </p>
                        </div>
                        {hasNumber ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleClearNumber(user.id, `${user.firstName} ${user.lastName} `, user.assignedPhoneNumber.phoneNumber , e); }}
                            disabled={isClearing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            {isClearing ? (
                              <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MdDeleteOutline className="w-4 h-4" />
                            )}
                            {isClearing ? "Clearing..." : "Clear"}
                          </button>
                        ) : isSelected ? (
                          <MdCheckCircle className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <MdPerson className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm">No users found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-gray-700/30 border-t border-slate-100 dark:border-gray-700 rounded-b-2xl flex items-center justify-between gap-3 flex-shrink-0">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedUser ? (
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    Selected: {selectedUser.firstName} {selectedUser.lastName ?? ""}
                  </span>
                ) : (
                  "No user selected"
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeAssignModal}
                  disabled={isAssigning}
                  className="px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors border border-slate-200 dark:border-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUser || isAssigning}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-purple-200 dark:shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <HiUserAdd className="w-4 h-4" />
                      Assign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Page;