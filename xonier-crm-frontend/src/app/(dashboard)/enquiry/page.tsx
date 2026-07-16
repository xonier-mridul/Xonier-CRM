"use client";
import { EnquiryData } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import React, { JSX, useState, useEffect, useRef } from "react";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import { EnquiryService } from "@/src/services/enquiry.service";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import { IoIosSearch } from "react-icons/io";
import Link from "next/link";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaXmark } from "react-icons/fa6";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { PERMISSIONS, SOURCE } from "@/src/constants/enum";
import Pagination from "@/src/components/common/pagination";
import { RootState } from "@/src/store";
import { useSelector } from "react-redux";
import checkRole from "../../utils/roleCheck.utils";
import { usePermissions } from "@/src/hooks/usePermissions";
import { HiDownload } from "react-icons/hi";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { LiaMailBulkSolid } from "react-icons/lia";
import Skeleton from "react-loading-skeleton";
import StatusBadge from "@/src/components/common/Status";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import CreatedAt from "@/src/components/common/CreatedAt";
import Limit from "@/src/components/ui/Limit";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useTranslation } from "react-i18next";


const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [enquiryData, setEnquiryData] = useState<EnquiryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const [TosearchVal, setToSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });


  const { hasPermission } = usePermissions();

  const auth = useSelector((state: RootState) => state.auth)

  const getEnquiryData = async () => {
    setIsLoading(true);
    try {
     
        const result = await EnquiryService.getAll({
          page: currentPage,
          limit: pageLimit,
          fullName: searchVal,
          fromDate: dateFilter.fromDate,
          toDate: dateFilter.toDate
        });
        if (result.status === 200) {
          let data = result.data.data;
          setEnquiryData(data.data);
          setCurrentPage(data.page);
          setPageLimit(data.limit);
          setTotalPages(data.totalPages);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getEnquiryData();
  }, [pageLimit, currentPage, TosearchVal,dateFilter]);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setToSearchVal(val);
    }, 500);
  };

  const handleDelete = async (id: string) => {
    try {
      const confirm = await ConfirmPopup({
        title: "Are your sure",
        text: "Are you sure to delete this enquiry",
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        const result = await EnquiryService.delete(id);
        if (result.status === 200) {
          toast.success("Enquiry deleted successfully");
          await getEnquiryData();
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
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("text copied successfully")
  };

  return (
    <div className={`lg:ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
            {t("add_bulk_enquiries")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t("you_want_to_create_bulk_enquiries")}
          </p>
        </div>
        {(hasPermission(PERMISSIONS.createEnquiry) ) && 
          <div className="flex items-center justify-end gap-3 ">
            <PrimaryButton text={t("create_bulk_enquiry")} link="/enquiry/bulk" icon={<LiaMailBulkSolid />} />
          </div>
        }
      </div>
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full ">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              {t("all_sales_enquiries")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t("create_edit_or_remove_enquiries")}
            </p>
          </div>
          
            <div className='block lg:hidden'>
              <span className='w-10 h-10 cursor-pointer bg-slate-200 flex justify-center items-center rounded-xl '>
              <BsThreeDotsVertical className='text-slate-400 text-xl' />

              </span>
            </div>
          <div className=" items-center hidden lg:flex gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50 outline-none text-slate-400 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 dark:text-white/70"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>

           {/* <Limit pageLimit={pageLimit} setPageLimit={setPageLimit}/> */}
            <div className="bg-slate-50 text-slate-500 col-span-2 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl text-slate-500" />
              <input type="text" className="outline-none dark:text-white/70" placeholder={t("search_3")} onChange={(e) => handleSearch(e.target.value)} value={searchVal} />
            </div>
            <div>
              <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter}  />
            </div>
            {hasPermission(PERMISSIONS.createEnquiry) ? <Link
              href={"/enquiry/add"}
              className="bg-cyan-600 hover:bg-cyan-700
                          text-white px-5 py-2 rounded-md
                          flex items-center gap-2 group "
            >
              <FaPlus className="group-hover:rotate-90 transition-all duration-300" />{" "}
              {t("create_new_enquiry")}
            </Link> : <span className="bg-cyan-600 
                          text-white px-5 py-2 rounded-md
                          flex items-center gap-2  opacity-80 cursor-not-allowed"><FaPlus className=" transition-all duration-300" />{t("create_new_enquiry")}</span>}
          </div>
        </div>
        <div className="w-full rounded-xl overflow-x-auto">
          <table className="w-full rounded-xl text-nowrap overflow-x-scroll">
            <thead>
              <tr className="w-full border-b-2 border-zinc-300 dark:border-zinc-400 bg-slate-200 dark:bg-gray-800">
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Enquiry Id
              </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("client_info")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                  {" "}
                  {t("project_type")}
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                  {t("source")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                  {t("status")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_at")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_by")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ? ((enquiryData && Array.isArray(enquiryData) && enquiryData.length > 0) ? (
                enquiryData.map((item, i) => {
                  let rr = i % 2 == 0;

                  return (
                    <tr
                      key={item.enquiry_id}
                      className={`${rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-slate-100/50 dark:bg-slate-800"
                        } w-full`}
                    >
                      {/* <td className="p-4">
                      <span className="text-sm cursor-copy" onClick={()=> handleCopy(item.enquiry_id)}> {item.enquiry_id}</span>
                    </td> */}
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className='text-slate-600 text-[16px] capitalize dark:text-white/70'>{item.fullName}</h4>{" "}
                        <Link href={`mailto:${item.email}`} className="text-xs text-slate-400">
                          {item.email}
                        </Link>{" "}
                      </td>
                      <td className="p-4 ">
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-500 text-sm">
                          {item.projectType}
                        </span>
                      </td>
                      <td className="p-4 ">
                        <span
                          className={`bg-yellow-400 text-white px-3 py-1.5 text-sm rounded-sm`}
                        >
                          {" "}
                          {item.source}
                        </span>
                      </td>
                      <td className="p-4"> <StatusBadge status={item.status} /></td>
                      <td className="p-4"><CreatedAt timestamp={item.createdAt} /></td>
                      <td className="p-4 text-slate-500 text-[16px]  capitalize dark:text-white/70">{item.createdBy?.firstName} {item.createdBy?.lastName ?? ""}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readEnquiry) ? <Link
                            href={`/enquiry/view/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                          >
                            <FaRegEye className="text-xl" />
                          </Link> : <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed"> <FaRegEye className="text-xl" /> </span>}
                          {hasPermission(PERMISSIONS.updateEnquiry) ? (
                            <Link
                              href={`/enquiry/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md
               bg-yellow-200/80 dark:bg-yellow-100
               hover:bg-yellow-300/70 dark:hover:bg-yellow-200
               text-yellow-500 hover:scale-104"
                            >
                              <MdOutlineEdit className="text-xl" />
                            </Link>
                          ) : (
                            <span
                              className="h-9 w-9 flex items-center justify-center rounded-md
               bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed"
                            >
                              <MdOutlineEdit className="text-xl" />
                            </span>
                          )}
                          {
                            hasPermission(PERMISSIONS.deleteEnquiry) ?
                           ( <button
                              onClick={() => handleDelete(item.id)}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                              disabled={!hasPermission(PERMISSIONS.deleteEnquiry)}
                            >
                              {" "}
                              <MdDeleteOutline className="text-xl" />{" "}
                            </button>) : (
                              <button
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-50"
                              disabled={!hasPermission(PERMISSIONS.deleteEnquiry)}
                            >
                              {" "}
                              <MdDeleteOutline className="text-xl" />{" "}
                            </button>
                            )
                          }
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : <tr><td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={6}>{t("data_not_found")}</td></tr>) : (
                <tr className="p-4">
                  <td className="text-center p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton width={120} height={28} borderRadius={12} />
                      <Skeleton width={80} height={12} borderRadius={10} />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default page;
