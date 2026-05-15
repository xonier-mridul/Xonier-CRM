import { UserTableComponentProps } from "@/src/types";

import React, { JSX, useRef, useMemo, useState, useEffect } from "react";
import { IoIosSearch } from "react-icons/io";

import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { FaRegEye } from "react-icons/fa";
import { USER_STATUS } from "@/src/types";
import Link from "next/link";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { FiUserPlus } from "react-icons/fi";
import BlurryBackground from "../../common/BlurryBackground";
import Input from "../../ui/Input";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import FormButton from "../../ui/FormButton";
import Skeleton from "react-loading-skeleton";
import Pagination from "../../common/pagination";
import { countryCodes } from "@/src/constants/countryCodes";
import { countryCode } from "@/src/types";

import { ChevronDown, Search } from "lucide-react";
import { CompanySelectProps } from "@/src/types/company/company.types";



export const UsersTable = ({
  currentPage,
  pageLimit,
  userData,
  handleDelete,
  isLoading,
  isPopupShow,
  setIsPopupShow,
  formData,
  roleData,
  handleChange,
  handleUserRoleChange,
  handleRemoveRole,
  handleSubmit,
  setPageLimit,
  totalPage,
  setFormData,
  err,
  loading,
  setCurrentPages,
  setSearchFilter,
  isAdmin,
  handleSearchFilter,
  companyData,
  handleCompanyChange,
}: UserTableComponentProps): JSX.Element => {
  const [selectedcountryCode, setCountryCode] = useState("+91");
  const { hasPermission } = usePermissions();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [search, setSearch] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [company,setCompany] = useState('')




  

  const handleLimit = (n: string) => {
    setPageLimit(Number(n))
    setCurrentPages(1)
  }


  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchFilter(search);
    }, 500);

  }, [search]);


useEffect(() => {
  setFormData((p) => ({
    ...p,
    phone: `${selectedcountryCode}${phoneNumber}`,
  }));
}, [selectedcountryCode, phoneNumber]);



const CompanySelect: React.FC<CompanySelectProps> = ({
  companyData,
    company,
   handleCompanyChange,
  
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] =
    useState(10);

  const dropdownRef =
    useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // filter data
  const filteredCompanies = useMemo(() => {
    return companyData.filter((item) =>
      item.companyName
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [companyData, search]);

  // visible items
  const visibleCompanies =
    filteredCompanies.slice(
      0,
      visibleCount
    );

  // infinite scroll
  const handleScroll = (
    e: React.UIEvent<HTMLDivElement>
  ) => {
    const target = e.currentTarget;

    const bottomReached =
      target.scrollHeight -
        target.scrollTop <=
      target.clientHeight + 20;

    if (
      bottomReached &&
      visibleCount <
        filteredCompanies.length
    ) {
      setVisibleCount((prev) => prev + 10);
    }
  };

  // reset visible count on search
  useEffect(() => {
    setVisibleCount(10);
  }, [search]);

  const selectedCompany =
    companyData.find(
      (item) =>
        item.id === company
    );

  return (
    <div
      className="relative w-full max-w-sm"
      ref={dropdownRef}
    >
      {/* Selected Box */}
      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="
          w-full
          flex items-center justify-between
          rounded-xl
          border border-gray-300
          bg-white
          px-4 py-3
          text-sm
          shadow-sm
          transition-all
          hover:border-violet-400
          focus:outline-none
          focus:ring-2 focus:ring-violet-300
        "
      >
        <span className="truncate">
          {selectedCompany
            ? selectedCompany.companyName
            : "Select Company"}
        </span>

        <ChevronDown
          size={18}
          className={`transition-transform ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute z-50 mt-2 w-full
            overflow-hidden
            rounded-2xl
            border border-gray-200
            bg-white
            shadow-xl
          "
        >
          {/* Search */}
          <div className="border-b p-3">
            <div className="relative">
              <Search
                size={16}
                className="
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                placeholder="Search company..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border border-gray-200
                  py-2 pl-9 pr-3
                  text-sm
                  outline-none
                  focus:border-violet-400
                "
              />
            </div>
          </div>

          {/* Company List */}
          <div
            onScroll={
              handleScroll
            }
            className="
              max-h-72
              overflow-y-auto
            "
          >
            {visibleCompanies.length >
            0 ? (
              visibleCompanies.map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={() => {
                      handleCompanyChange(
                        item.id
                      );
                      setOpen(false);
                    }}
                    className={`
                      w-full
                      px-4 py-3
                      text-left text-sm
                      transition-colors
                      hover:bg-violet-50
                      ${
                        company ===
                        item.id
                          ? "bg-violet-100 text-violet-700"
                          : ""
                      }
                    `}
                  >
                    {
                      item.companyName
                    }
                  </button>
                )
              )
            ) : (
              <div className="p-4 text-sm text-gray-500">
                No company found
              </div>
            )}

            {visibleCount <
              filteredCompanies.length && (
              <div className="p-3 text-center text-xs text-gray-400">
                Scroll to load more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



  return (
    <>
      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  bg-white dark:bg-gray-700 p-6 rounded-xl w-[650px] z-[200] flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Create User</h2>
              <button
                className="text-2xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                onClick={() => setIsPopupShow(false)}
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <Input
                label="firstName"
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
              />
              <Input
                label="lastName"
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
              />
              <Input
                label="email"
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
              />
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  User Role
                </label>

                <select
                  onChange={handleUserRoleChange}
                  className="w-full px-3 py-2 rounded-md border
      bg-white dark:bg-gray-700 text-black dark:text-white
      border-gray-300 dark:border-gray-300/30"
                >
                  <option value="">Select user role</option>
                  {roleData.map((role) => (
                    <option key={role.id} value={role.id} hidden={role.code === SUPER_ADMIN_ROLE_CODE} disabled={role.code === SUPER_ADMIN_ROLE_CODE}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {formData.userRole.length > 0 && (
                  <div className="col-span-1 flex flex-wrap gap-2 mt-2">
                    {formData.userRole.map((roleId) => {
                      const role = roleData.find((r) => r.id === roleId);
                      if (!role) return null;



                      return (
                        <span
                          key={roleId}
                          className="flex items-center gap-2 px-3 py-1
            bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {role.name}

                          <button
                            type="button"
                            onClick={() => handleRemoveRole(roleId)}
                            className="hover:text-red-500 transition"
                          >
                            <FaXmark size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Phone
                </label>

                <div className="flex gap-2">
                  {/* Country Code */}
                  <select
                    value={selectedcountryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-800 text-black dark:text-white"
                  >
                    {countryCodes.map((c: countryCode) => (
                      <option key={c.code} value={c.code}>
                        {c.label} ({c.code})
                      </option>
                    ))}
                  </select>

                  {/* Phone Input */}
                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone Number"
                    value={ `${phoneNumber}` }
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-800 text-black dark:text-white outline-none"
                  />
                </div>
              </div>
              <Input
                label="password"
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                label="confirm password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {
                isAdmin && (
                  <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Company
                </label>
                    <CompanySelect
                    companyData={companyData}
                      company={formData.companyId || ""}
                      handleCompanyChange={handleCompanyChange}
                  />

                  </div>
                  
                )
              }

            
             

              {err && <div className="flex justify-end col-span-2"><p className="text-red-500">{err}</p></div>}

              <FormButton

                isLoading={loading}
                disabled={

                  formData.firstName === "" ||
                  formData.lastName === "" ||
                  formData.email === "" ||
                  formData.phone === "" ||
                  formData.password === "" || formData.userRole.length <= 0
                }
                className="col-span-2"
              >
                {" "}
                Submit{" "}
              </FormButton>
            </form>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full ">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All users
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Create, edit or remove users. Each user can have multiple roles.
            </p>
          </div>

          <div>
           { isAdmin && (
            <CompanySelect
                    companyData={companyData}
                      company={formData.companyId || ""}
                      handleCompanyChange={handleSearchFilter}
                  />)
           }
            {/* <select 
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
            >
              <option>Company </option>
              {
                companyData.map((item)=>(
                  <option key={item.id}
                  on>
                        {item.companyName}
                  </option>
                ))
              }
              
              
            </select> */}
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
              onChange={(e) => handleLimit(e.target.value)}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input type="text" placeholder="Search by name" onChange={(e) => { setSearch(e.target.value) }} className="border-none bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white w-full" />
            </div>
            <button
              onClick={() => setIsPopupShow(true)}
              disabled={!hasPermission(PERMISSIONS.createUser)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed
                        text-white px-5 py-2 rounded-md
                        flex items-center gap-2 cursor-pointer"
            >
              <FiUserPlus /> Create User
            </button>
          </div>
        </div>
        <table className="w-full rounded-xl overflow-hidden">
          <thead>
            <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                S.No.
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                {" "}
                User
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Type
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Created At
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Status
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Last Login
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="">
            {!isLoading ? (
              userData && userData?.length > 0 ? (
                userData?.map((item, index) => {
                  let rr = index % 2 == 0;

                  let date = new Date(item.createdAt).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    }
                  );
                  let lastLoginDate = item?.lastLogin
                    ? new Date(item?.lastLogin).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                    : "Not found";
                  return (
                    <tr
                      className={`${rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                        } w-full`}
                        key={item.id}
                    >
                      <td className="p-4">{index + 1}</td>
                      <td>
                        <Link
                          href={`/users/${item.id}`}
                          className="cursor-pointer hover:text-blue-500 capitalize"
                        >
                          {item.firstName} {item.lastName}
                        </Link>
                      </td>
                      <td>
                        {item.userRole.map((item) => (
                          <span key={item.id} className="bg-green-500 px-3.5 py-1.5 rounded-lg text-white text-xs tracking-wide">{item.name}</span>
                        ))}
                      </td>
                      <td>{date}</td>
                      <td>
                        <span
                          className={`${item.status === USER_STATUS.ACTIVE
                              ? "bg-green-100  text-green-500"
                              : item.status === USER_STATUS.INACTIVE
                                ? "bg-yellow-100 text-yellow-500"
                                : item.status === USER_STATUS.DELETED
                                  ? "bg-red-100 text-red-500"
                                  : item.status === USER_STATUS.SUSPENDED
                                    ? "bg-orange-100 text-orange-500"
                                    : "bg-gray-100 text-gray-500"
                            }  rounded-full text-sm font-medium py-1 px-3 flex items-center gap-1 w-fit  capitalize`}
                        >
                          {" "}
                          <GoDotFill /> {item.status}
                        </span>
                      </td>
                      <td>{lastLoginDate}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/users/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                          >
                            <FaRegEye className="text-xl" />
                          </Link>
                          {item.userRole.some(
                            (item) => item.code === SUPER_ADMIN_ROLE_CODE
                          ) || !hasPermission(PERMISSIONS.updateUser) ? (
                            <span className="h-9 w-9 flex items-center justify-center rounded-md cursor-not-allowed bg-yellow-200/80 dark:bg-yellow-100 text-yellow-300">
                              <MdOutlineEdit className="text-xl" />
                            </span>
                          ) : (
                            <Link
                              href={`/users/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                            >
                              <MdOutlineEdit className="text-xl" />
                            </Link>
                          )}
                          {item.userRole.some(
                            (item) => item.code === SUPER_ADMIN_ROLE_CODE
                          ) || !hasPermission(PERMISSIONS.deleteUser) ? (
                            <span className="h-9 w-9 flex items-center justify-center rounded-md cursor-not-allowed bg-red-100 text-red-400  opacity-80">
                              {" "}
                              <MdDeleteOutline className="text-xl" />{" "}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104"
                            >
                              {" "}
                              <MdDeleteOutline className="text-xl" />{" "}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className=" text-center ">
                  <td colSpan={7} className="p-4">
                    User data not found
                  </td>
                </tr>
              )
            ) : (
              Array.from({ length: 10 }).map((_, i) => (
                <tr className=" text-center animate-pulse" key={i}>
                  <td className="p-4" >
                    <Skeleton width={30} height={30} borderRadius={12} />
                  </td>
                  <td className="p-4" >
                    <Skeleton width={140} height={30} borderRadius={12} />
                  </td>
                  <td className="p-4" >
                    <Skeleton width={130} height={30} borderRadius={12} />
                  </td>
                  <td className="p-4" >
                    <Skeleton width={120} height={30} borderRadius={12} />
                  </td>
                  <td className="p-4" >
                    <Skeleton width={100} height={30} borderRadius={999} />
                  </td>
                  <td className="p-4" >
                    <Skeleton width={140} height={30} borderRadius={12} />
                  </td>
                  <td className="p-4" >
                    <div className="flex items-center gap-2">
                      <Skeleton width={35} height={35} borderRadius={12} />
                      <Skeleton width={35} height={35} borderRadius={12} />
                      <Skeleton width={35} height={35} borderRadius={12} />
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPage} onPageChange={(page) => setCurrentPages(page)} />
      </div>
    </>
  );
};


