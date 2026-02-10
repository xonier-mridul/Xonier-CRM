"use client";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import axios from "axios";
import Link from "next/link";
import React, { JSX, useEffect, useState } from "react";
import { FaPlus, FaRegEye } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import InvoiceService from "@/src/services/invoice.service";
import { Invoice } from "@/src/types/invoice/invoice.types";
import { handleCopy } from "../../utils/clipboard.utils";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { formatDate } from "../../utils/date.utils";
import { formatCurrency } from "../../utils/currency.utils";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentText,
  IoSendOutline,
  IoCardOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [err, setErr] = useState<string[] | string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);

  const { hasPermission } = usePermissions();

  const getInvoiceData = async()=>{
    setIsLoading(true)
    try {
        const result = await InvoiceService.getAll(currentPage, pageLimit)
        if (result.status === 200){
            const data = result.data.data
            setInvoiceData(data.data)
            setCurrentPage(Number(data.page))
            setPageLimit(Number(data.limit))
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
        setIsLoading(false)
    }
  }

  useEffect(() => {
     getInvoiceData()
  }, [currentPage, pageLimit])



  
  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
            Invoices
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            You want to manage your invoices
          </p>
        </div>
      </div>

      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All Invoices
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              edit or remove invoices.
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
            {hasPermission(PERMISSIONS.createLead) ? (
              <Link
                href={"/leads/add"}
                className="bg-blue-600 hover:bg-blue-700
                                            text-white px-5 py-2 rounded-md
                                            flex items-center gap-2 group"
              >
                <FaPlus className="group-hover:rotate-90 transition-all duration-300" />{" "}
                Create New Leads
              </Link>
            ) : (
              <span
                className="bg-blue-600 
                                            text-white px-5 py-2 rounded-md
                                            flex items-center gap-2  opacity-80 cursor-not-allowed"
              >
                <FaPlus className=" transition-all duration-300" />
                Create New Enquiry
              </span>
            )}
          </div>
        </div>
        <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Invoice Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Info
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Issue date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                 Due date
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  amount
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
            {!isLoading ? ((invoiceData && Array.isArray(invoiceData) && invoiceData.length > 0) ? (
              invoiceData.map((item, i) => {
                let rr = i % 2 == 0;
                const issueDate = item.issueDate ? formatDate(item.issueDate) : "";
                const dueDate = formatDate(item.dueDate)
                const amount = formatCurrency(item.total)
                return (
                  <tr
                    key={item.invoiceId}
                    className={`${
                      rr
                        ? "bg-white dark:bg-transparent"
                        : "bg-blue-100/50 dark:bg-slate-500"
                    } w-full`}
                  >
                    <td className="p-4">
                      <Link href={`/invoice/view/${item.id}`} className="text-sm cursor-pointer hover:text-blue-500" > {item.invoiceId}</Link>
                    </td>
                    <td className="flex gap-1 flex-col p-4">
                      <h4>{item.customerName}</h4>{" "}
                      
                    </td>
                    <td className="p-4 ">
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-500 text-sm">
                        {issueDate}
                      </span>
                    </td>
                    <td className="p-4 ">
                      <span
                        className={`bg-yellow-400 text-slate-800 px-3 py-1.5 text-sm rounded-sm`}
                      >
                        {" "}
                        {dueDate}
                      </span>
                    </td>
                    <td className="p-4"> <span className="px-4 py-1.5 bg-green-500 text-white rounded-md text-sm"> {amount} </span> </td>
                    <td className="p-4">
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      item.status.toUpperCase() === 'DRAFT'
        ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
        : item.status.toUpperCase() === 'SENT'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        : item.status.toUpperCase() === 'PAID'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
        : item.status.toUpperCase() === 'PARTIALLY_PAID'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        : item.status.toUpperCase() === 'OVERDUE'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
        : item.status.toUpperCase() === 'CANCELLED'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    }`}
  >
    {item.status.toUpperCase() === 'DRAFT' && <IoDocumentText className="w-3.5 h-3.5" />}
    {item.status.toUpperCase() === 'SENT' && <IoSendOutline className="w-3.5 h-3.5" />}
    {item.status.toUpperCase() === 'PAID' && <IoCheckmarkCircle className="w-3.5 h-3.5" />}
    {item.status.toUpperCase() === 'PARTIALLY_PAID' && <IoCardOutline className="w-3.5 h-3.5" />}
    {item.status.toUpperCase() === 'OVERDUE' && <IoAlertCircleOutline className="w-3.5 h-3.5" />}
    {item.status.toUpperCase() === 'CANCELLED' && <IoCloseCircle className="w-3.5 h-3.5" />}
    {!['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'].includes(item.status.toUpperCase()) && (
      <IoDocumentText className="w-3.5 h-3.5" />
    )}
    <span className="capitalize">
      {item.status.toLowerCase().replace('_', ' ')}
    </span>
  </span>
</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {hasPermission(PERMISSIONS.readEnquiry) ? <Link
                          href={`/invoice/view/${item.id}`}
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
                        {/* <button
                          onClick={() => handleDelete(item.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                          disabled={!hasPermission(PERMISSIONS.deleteEnquiry)}
                        >
                          {" "}
                          <MdDeleteOutline className="text-xl" />{" "}
                        </button> */}
                      </div>
                    </td>
                  </tr>
                );
              })
            ): <tr><td className="p-4 text-center" colSpan={6}>Data not found</td></tr>) : (
              <tr className="p-4">
                <td className="text-center p-4">
                   <Skeleton width={120} height={30} borderRadius={14}/>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                   <Skeleton width={120} height={28} borderRadius={12}/>
                   <Skeleton width={80} height={12} borderRadius={10} />
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton width={120} height={30} borderRadius={14}/>
                </td>
                <td className="p-4">
                  <Skeleton width={120} height={30} borderRadius={14}/>
                </td>
                <td className="p-4">
                  <Skeleton width={120} height={30} borderRadius={14}/>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                  <Skeleton width={32} height={32} borderRadius={10}/>
                  <Skeleton width={32} height={32} borderRadius={10}/>
                  <Skeleton width={32} height={32} borderRadius={10}/>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
           
        </table>
      </div>
    </div>
  );
};

export default page;
