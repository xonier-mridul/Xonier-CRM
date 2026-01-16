"use client";
import { EnquiryData } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import React, { JSX, useState, useEffect } from "react";
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

const page = (): JSX.Element => {
  const [enquiryData, setEnquiryData] = useState<EnquiryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const { hasPermission } = usePermissions();

  const getEnquiryData = async () => {
    setIsLoading(true);
    try {
      const result = await EnquiryService.getAll({
        page: currentPage,
        limit: pageLimit,
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
  }, [pageLimit, currentPage]);

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

  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
         <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
              Add bulk enquiries
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              You want to create bulk enquiries via CSV file
            </p>
         </div>
         <div className="flex items-center justify-end gap-3 ">
          <PrimaryButton text="Create Bulk Enquiry" link="/enquiry/bulk" icon={<LiaMailBulkSolid />}/>
         </div>
         
      </div>
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full ">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All Sales Enquiries
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Create, edit or remove enquiries.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl" />
              <input type="text" className="outline-none" />
            </div>
            {hasPermission(PERMISSIONS.createEnquiry) ? <Link
              href={"/enquiry/add"}
              className="bg-blue-600 hover:bg-blue-700
                          text-white px-5 py-2 rounded-md
                          flex items-center gap-2 group"
            >
              <FaPlus className="group-hover:rotate-90 transition-all duration-300" />{" "}
              Create New Enquiry
            </Link> : <span className="bg-blue-600 
                          text-white px-5 py-2 rounded-md
                          flex items-center gap-2  opacity-80 cursor-not-allowed"><FaPlus className=" transition-all duration-300" />Create New Enquiry</span>}
          </div>
        </div>
        <table className="w-full rounded-xl overflow-hidden">
          <thead>
            <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Enquiry Id
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                Client Info
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                {" "}
                Project Type
              </th>

              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Source
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Status
              </th>
              <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="">
            {enquiryData &&
            Array.isArray(enquiryData) &&
            enquiryData.length > 0 ? (
              enquiryData.map((item, i) => {
                let rr = i % 2 == 0;

                return (
                  <tr
                    key={item.enquiry_id}
                    className={`${
                      rr
                        ? "bg-white dark:bg-transparent"
                        : "bg-blue-100/50 dark:bg-slate-500"
                    } w-full`}
                  >
                    <td className="p-4">
                      <span className="text-sm"> {item.enquiry_id}</span>
                    </td>
                    <td className="flex gap-1 flex-col p-4">
                      <h4>{item.fullName}</h4>{" "}
                      <Link href={``} className="text-xs">
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
                        className={`bg-yellow-400 text-slate-800 px-3 py-1.5 text-sm rounded-sm`}
                      >
                        {" "}
                        {item.source}
                      </span>
                    </td>
                    <td className="p-4"> {item.status} </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {hasPermission(PERMISSIONS.createEnquiry) ? <Link
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
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                          disabled={!hasPermission(PERMISSIONS.deleteEnquiry)}
                        >
                          {" "}
                          <MdDeleteOutline className="text-xl" />{" "}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="p-4">
                <td colSpan={6} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
