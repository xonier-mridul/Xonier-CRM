"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, FormEvent } from "react";
import { IoIosSearch } from "react-icons/io";
import Link from "next/link";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS, SALES_STATUS } from "@/src/constants/enum";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import LeadService from "@/src/services/lead.service";
import { Lead } from "@/src/types/leads/leads.types";
import Skeleton from "react-loading-skeleton";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { LiaMailBulkSolid } from "react-icons/lia";
import { ParamValue } from "next/dist/server/request/params";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

import SensitiveField from "@/src/components/common/SensitiveField";
import TabsButton from "@/src/components/ui/TabsButton";
import { FaRegHandshake } from "react-icons/fa";
import { FaHandshake } from "react-icons/fa6";
import { UseDispatch, useSelector } from "react-redux";
import { RootState } from "@/src/store";
import Pagination from "@/src/components/common/pagination";
import { useSearchParams } from "next/navigation";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";

const LeadContent = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead[]>([]);
  const [wonLeadData, setWonLeadData] = useState<Lead[]>([]);
  const [lostLeadData, setLostLeadData] = useState<Lead[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentWonPage, setWonCurrentPage] = useState<number>(1);
  const [currentLostPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [wonTotalPages, setWonTotalPages] = useState<number>(1);
  const [lostTotalPages, setLostTotalPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1)

  const { hasPermission } = usePermissions();

    const auth = useSelector((state: RootState)=>state.auth)

    const searchParams = useSearchParams()
    const userid = searchParams.get("userid")

    const query = userid ? {"userid": userid}: {}

  const getLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {

        


        const result = await LeadService.getAll(currentPage, pageLimit, query);
        if (result.status === 200) {
          const data = result.data.data;
          setLeadData(data.data);
          setCurrentPage(Number(data.page));
          setPageLimit(Number(data.limit));
          setTotalPages(Number(data.totalPages));
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

  const getWonLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
    
        const result = await LeadService.getAll(currentWonPage, wonPageLimit, {status: SALES_STATUS.WON, ...query});
      if (result.status === 200) {
        const data = result.data.data;
        setWonLeadData(data.data);
        setWonCurrentPage(Number(data.page));
        setWonPageLimit(Number(data.limit));
        setWonTotalPages(Number(data.totalPages))
       
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

  const getLostLeadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
   
const result = await LeadService.getAll(currentLostPage, lostPageLimit, {status: SALES_STATUS.LOST, ...query});
      if (result.status === 200) {
        const data = result.data.data;
        setLostLeadData(data.data);
        setLostCurrentPage(Number(data.page));
        setLostPageLimit(Number(data.limit));
        setLostTotalPages(Number(data.totalPages))
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
    getLeadData();
  }, [currentPage, pageLimit]);

  const handleDelete = async (id: ParamValue, name: string): Promise<void> => {
    try {
      const confirm = await ConfirmPopup({
        text: `Are you want to delete ${name} lead`,
        title: "Are you sure",
        btnTxt: "Yes, delete",
      });
      if (confirm) {
        const result = await LeadService.delete(String(id));
        if (result.status === 200) {
          toast.success(`${name} lead deleted successfully`);
          const filteredLead = leadData.filter((item) => item.id !== id);
          setLeadData(filteredLead);
          setCurrentTab(1)
          await getLeadData()
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
    toast.success("text copied successfully");
  };


  useEffect(() => {
    getWonLeadData()
  }, [currentWonPage, wonPageLimit])

  useEffect(() => {
    getLostLeadData()
  }, [currentLostPage, lostPageLimit])
  

  const handleTabs =async(no:number):Promise<void>=>{
     setCurrentTab(no)
     if(no === 2){
     await getWonLeadData()
     }
     if(no===3){
      await getLostLeadData()
     }
  }

  const handlePageLimit = (val:number)=>{
    if (currentTab === 1){
      setCurrentPage(1)
      setPageLimit(val)
    }
    else if(currentTab === 2){
      setWonCurrentPage(1)
      setWonPageLimit(val)
    }
    
    else if(currentTab === 3){
      setLostCurrentPage(1)
      setLostPageLimit(val)
    }
  }

  return (
    <>
      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
              Add bulk Leads
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              You want to create bulk Leads via CSV file
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 ">
            {hasPermission(PERMISSIONS.createLead) ? (
              <PrimaryButton
                text="Create Bulk Leads"
                link="/leads/bulk"
                icon={<LiaMailBulkSolid />}
              />
            ) : (
              <span className="bg-blue-400 cursor-not-allowed text-white px-5 py-2.5 rounded-md flex items-center w-fit gap-2">
                {" "}
                <LiaMailBulkSolid /> Create Bulk Leads{" "}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
                All Sales Leads
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove Leads.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
                onChange={(e) => handlePageLimit(Number(e.target.value))}
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
          <ul className="w-full flex items-center gap-5">
            <li><TabsButton btnTxt="All Leads" dataLen={leadData.length} no={1} currentVal={currentTab} onClickEvent={()=>setCurrentTab(1)}/></li>
            <li><TabsButton btnTxt="Won Leads" dataLen={wonLeadData.length} no={2} currentVal={currentTab} onClickEvent={()=>handleTabs(2)}/></li>
            <li><TabsButton btnTxt="Lost Leads" dataLen={lostLeadData.length} no={3} currentVal={currentTab} onClickEvent={()=>handleTabs(3)}/></li>
          </ul>
          {(currentTab === 1) && <> <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Lead Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Info
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Phone
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
              {!isLoading ?((leadData && Array.isArray(leadData) && leadData.length > 0) ? (
                leadData.map((item, i) => {
                  let rr = i % 2 == 0;

                  const maskMail = maskEmail(item.email)
                  const maskNumber = maskPhone(item.phone)

                  return (
                    <tr
                      key={item.lead_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/leads/view/${item.id}`}
                          className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.lead_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize">{item.fullName}</h4>{" "}
                        
                          <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskMail} fontSize="sm"/>
                    
                      </td>
                      <td className="p-4">
                        <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskNumber} fontSize="sm"/>
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
                      <td className="p-4"> <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize
      ${
        item.status === "new"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : item.status === "contacted"
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          : item.status === "qualified"
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : item.status === "proposal"
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          : item.status === "won"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : item.status === "lost"
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          : item.status === "delete"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
      }`}
  >
    {item.status}
  </span> </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/leads/view/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                            >
                              <FaRegEye className="text-xl" />
                            </Link>
                          ) : (
                            <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                              {" "}
                              <FaRegEye className="text-xl" />{" "}
                            </span>
                          )}
                          {hasPermission(PERMISSIONS.updateLead) && (item.status !== SALES_STATUS.DELETE) ? (
                            <Link
                              href={`/leads/update/${item.id}`}
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
                            onClick={() => handleDelete(item.id, item.fullName)}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                            disabled={!hasPermission(PERMISSIONS.deleteLead)}
                          >
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </button> */}
                         {hasPermission(PERMISSIONS.createDeal) ? (item.status !== SALES_STATUS.DELETE) ? ((item.inDeal === false)  ?  <Link
                            href={`/leads/make-deal/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-blue-100 text-blue-500 hover:bg-blue-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-100 disabled:opacity-80"
                            
                          >
                            {" "}
                            <FaRegHandshake className="text-xl" />{" "}
                          </Link> : <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-900 text-white hover:bg-blue-950 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-default" title="Already on deal"> <FaHandshake className="text-xl"/></span>) : <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed" title="Already on deal"> <FaHandshake className="text-xl"/></span> : <span className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-500 opacity-50 cursor-not-allowed opacity-80" title="Already on deal"> <FaHandshake className="text-xl"/></span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : <tr> <td className="p-4 text-center" colSpan={7}>Data not found</td></tr> ): (
                Array.from({length: 10}).map((item, i)=>{
                  let rr = i % 2 == 0;

        return (<tr key={i}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}>
                  <td className="text-center p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton width={110} height={28} borderRadius={12} />
                      <Skeleton width={140} height={12} borderRadius={10} />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={80} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                    </div>
                  </td>
                </tr>)}
                ) 
                
              )}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={((page)=>setCurrentPage(page))} className="w-full"/> </>}
          {(currentTab === 2) && <><table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Lead Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Info
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Phone
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
              {!isLoading ?((wonLeadData && Array.isArray(wonLeadData) && wonLeadData.length > 0) ? (
                wonLeadData.map((item, i) => {
                  let rr = i % 2 == 0;

                  const maskMail = maskEmail(item.email)
                  const maskNumber = maskPhone(item.phone)

                  return (
                    <tr
                      key={item.lead_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/leads/view/${item.id}`}
                          className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.lead_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize">{item.fullName}</h4>{" "}
                        
                          <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskMail} fontSize="sm"/>
                    
                      </td>
                      <td className="p-4">
                        <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskNumber} fontSize="sm"/>
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
                      <td className="p-4"> <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize
      ${
        item.status === "new"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : item.status === "contacted"
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          : item.status === "qualified"
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : item.status === "proposal"
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          : item.status === "won"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : item.status === "lost"
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          : item.status === "delete"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
      }`}
  >
    {item.status}
  </span> </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/leads/view/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                            >
                              <FaRegEye className="text-xl" />
                            </Link>
                          ) : (
                            <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                              {" "}
                              <FaRegEye className="text-xl" />{" "}
                            </span>
                          )}
                          {hasPermission(PERMISSIONS.updateLead) ? (
                            <Link
                              href={`/leads/update/${item.id}`}
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
                            onClick={() => handleDelete(item.id, item.fullName)}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                            disabled={!hasPermission(PERMISSIONS.deleteLead)}
                          >
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ): <tr> <td className="p-4 text-center" colSpan={7}>Data not found</td></tr> ) : (
                Array.from({length: 10}).map((item, i)=>{
                  let rr = i % 2 == 0;

        return (<tr key={i}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}>
                  <td className="text-center p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton width={110} height={28} borderRadius={12} />
                      <Skeleton width={140} height={12} borderRadius={10} />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={80} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                    </div>
                  </td>
                </tr>)}
                ) 
                
              )}
            </tbody>
          </table><Pagination currentPage={currentWonPage} totalPages={wonTotalPages} onPageChange={((page)=>setWonCurrentPage(page))} className="w-full" /></>}

          {(currentTab === 3) && <> <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Lead Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Client Info
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Phone
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
              {!isLoading ?((lostLeadData && Array.isArray(lostLeadData) && lostLeadData.length > 0) ? (
                lostLeadData.map((item, i) => {
                  let rr = i % 2 == 0;

                  const maskMail = maskEmail(item.email)
                  const maskNumber = maskPhone(item.phone)

                  return (
                    <tr
                      key={item.lead_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/leads/view/${item.id}`}
                          className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.lead_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize">{item.fullName}</h4>{" "}
                        
                          <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskMail} fontSize="sm"/>
                    
                      </td>
                      <td className="p-4">
                        <SensitiveField value={item.phone} link={`tel:${item.phone}`} maskedValue={maskNumber} fontSize="sm"/>
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
                      <td className="p-4"> <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize
      ${
        item.status === "new"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : item.status === "contacted"
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          : item.status === "qualified"
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : item.status === "proposal"
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          : item.status === "won"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : item.status === "lost"
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          : item.status === "delete"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
      }`}
  >
    {item.status}
  </span> </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/leads/view/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                            >
                              <FaRegEye className="text-xl" />
                            </Link>
                          ) : (
                            <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                              {" "}
                              <FaRegEye className="text-xl" />{" "}
                            </span>
                          )}
                          {hasPermission(PERMISSIONS.updateLead) || (item.status !== SALES_STATUS.DELETE) ? (
                            <Link
                              href={`/leads/update/${item.id}`}
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
                            onClick={() => handleDelete(item.id, item.fullName)}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                            disabled={!hasPermission(PERMISSIONS.deleteLead)}
                          >
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ): <tr> <td className="p-4 text-center" colSpan={7}>Data not found</td></tr> ) : (
                Array.from({length: 10}).map((item, i)=>{
                  let rr = i % 2 == 0;

        return (<tr key={i}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}>
                  <td className="text-center p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton width={110} height={28} borderRadius={12} />
                      <Skeleton width={140} height={12} borderRadius={10} />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={80} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={120} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                      <Skeleton width={32} height={32} borderRadius={10} />
                    </div>
                  </td>
                </tr>)}
                ) 
                
              )}
            </tbody>
          </table> <Pagination currentPage={currentLostPage} totalPages={lostTotalPages} onPageChange={((page)=>setLostCurrentPage(page))} className="w-full" /> </>}
          
          
        </div>
      </div>
    </>
  );
};

export default LeadContent;
