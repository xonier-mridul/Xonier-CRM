"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";

import React, { JSX, useState, useEffect } from "react";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { usePermissions } from "@/src/hooks/usePermissions";
import { DEAL_PIPELINE, DEAL_STAGES, PERMISSIONS } from "@/src/constants/enum";
import { Deal } from "@/src/types/deals/deal.types";
import extractErrorMessages from "../../utils/error.utils";
import axios from "axios";
import { toast } from "react-toastify";
import dealService from "@/src/services/deal.service";
import Skeleton from "react-loading-skeleton";
import TabsButton from "@/src/components/ui/TabsButton";
import { MdOutlineEdit, MdDeleteOutline, MdOutlineLeaderboard } from "react-icons/md";
import Link from "next/link";
import { formatDate } from "../../utils/date.utils";

import {  } from "react-icons/md";
import { handleCopy } from "../../utils/clipboard.utils";
import { FaRegPaperPlane } from "react-icons/fa";

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dealData, setDealData] = useState<Deal[]>([]);
  const [wonDealData, setWonDealData] = useState<Deal[]>([]);
  const [lostDealData, setLostDealData] = useState<Deal[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wonCurrentPage, setWonCurrentPage] = useState<number>(1);
  const [lostCurrentPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1);

  const { hasPermission } = usePermissions();

  const getDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(currentPage, pageLimit);

      if (result.status === 200) {
        const data = result.data.data;
        setDealData(data.data);
        console.log("deal data: ", data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        
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

  const getWonDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(wonCurrentPage, wonPageLimit, {stage: "won"});

      if (result.status === 200) {
        const data = result.data.data;
        setWonDealData(data.data);
        
        setWonCurrentPage(Number(data.page));
        setWonPageLimit(Number(data.limit));
        
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

  const getLostDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(wonCurrentPage, wonPageLimit, {stage: "lost"});

      if (result.status === 200) {
        const data = result.data.data;
        setLostDealData(data.data);
        
        setLostCurrentPage(Number(data.page));
        setLostPageLimit(Number(data.limit));
        
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
    getDealData();
  }, [currentPage, pageLimit]);
  // useEffect(() => {
  //   getWonDealData();
  // }, [wonCurrentPage, wonPageLimit]);
  // useEffect(() => {
  //   getLostDealData;
  // }, [lostCurrentPage, lostPageLimit]);


  const handleTabs =async(no:number):Promise<void>=>{
     setCurrentTab(no)
     if(no === 2){
     await getWonDealData()
     }
     if(no===3){
      await getLostDealData()
     }
  }

  return (
    <div className={`ml-72 mt-14 p-6`}>
      
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
                All Sales Deals
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove Deals
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
              {(
                <Link
                  href={"/leads"}
                  className="bg-blue-600 hover:bg-blue-700
                                    text-white px-5 py-2 rounded-md
                                    flex items-center gap-2 group"
                >
                  <MdOutlineLeaderboard className="group-hover:rotate-90 transition-all duration-300" />{" "}
                  All Leads
                </Link>
              ) }
            </div>
          </div>
          <ul className="w-full flex items-center gap-5">
            <li><TabsButton btnTxt="All Deals" dataLen={dealData.length} no={1} currentVal={currentTab} onClickEvent={()=>setCurrentTab(1)}/></li>
            <li><TabsButton btnTxt="Won Deals" dataLen={wonDealData.length} no={2} currentVal={currentTab} onClickEvent={()=>handleTabs(2)}/></li>
            <li><TabsButton btnTxt="Lost Deals" dataLen={lostDealData.length} no={3} currentVal={currentTab} onClickEvent={()=>handleTabs(3)}/></li>
          </ul>
          {(currentTab === 1) && <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  deal Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                 deal name
                </th>
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Pipeline
                </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                  Deal stage
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                 against
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  created date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ? ((dealData && Array.isArray(dealData) && dealData.length > 0) ? (
                dealData.map((item, i) => {
                  let rr = i % 2 == 0;

                  // const maskMail = maskEmail(item.email)
                  // const maskNumber = maskPhone(item.phone)

                  const date = formatDate(item.createDate)

                  return (
                    <tr
                      key={item.deal_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/deals/view/${item.id}`}
                          className="text-xs cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.deal_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize text-sm">{item.dealName}</h4>{" "}
                        
                      
                      </td>
                      {/* <td className="p-4">
                        <span className={`${(item.dealPipeline.trim() === DEAL_PIPELINE.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.QUALIFICATION) ? "bg-blue-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.PROPOSAL) ? "bg-cyan-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.NEGOTIATION) ? "bg-teal-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.WON) ? "bg-green-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize`}>{item.dealPipeline.trim()}</span>
                      </td> */}
                      <td className="p-4 ">
                        <span className={`${(item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealStage.trim() === DEAL_STAGES.QUALIFICATION) ? "bg-blue-600" : (item.dealStage.trim() === DEAL_STAGES.PROPOSAL) ? "bg-cyan-500" : (item.dealPipeline.trim() === DEAL_STAGES.NEGOTIATION) ? "bg-teal-600" : (item.dealStage.trim() === DEAL_STAGES.WON) ? "bg-green-500" : (item.dealStage.trim() === DEAL_STAGES.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize text-sm`}>{item.dealStage.trim()}</span>
                      </td>
                      <td className="p-4 ">
                        <span
                          className={`bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy`}
                          onClick={()=>handleCopy(item?.lead_id?.lead_id)}
                        >
                          {" "}
                          {item?.lead_id?.lead_id}
                        </span>
                      </td>
                      <td className="p-4"> <span className="px-3 py-1.5 rounded-md bg-blue-100 text-xs text-blue-600 font-medium">{date}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/deals/view/${item.id}`}
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
                              href={`/deals/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100
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
                          {hasPermission(PERMISSIONS.createQuote) ? (
                           item.inQuotation ? <span
                              className="h-9 w-9 flex items-center justify-center rounded-md
               bg-orange-500 text-white  cursor-no-drop"
                            >
                              <FaRegPaperPlane className="text-lg" />
                            </span> : <Link
                              href={`/deals/quotation/${item.id}`}
                              className={`${item.inQuotation ? "" : "bg-orange-200/80 dark:bg-orange-100 hover:bg-orange-300/70 dark:hover:bg-orange-200 text-orange-500"} h-9 w-9 flex items-center justify-center rounded-md  hover:scale-104`}
                            >
                              <FaRegPaperPlane className="text-lg" />
                            </Link>
                          ) : (
                            <span
                              className="h-9 w-9 flex items-center justify-center rounded-md
               bg-orange-100 text-orange-400 opacity-80 cursor-not-allowed"
                            >
                              <FaRegPaperPlane className="text-lg" />
                            </span>
                          )}
                          
                         
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : <tr><td className="p-4 text-center" colSpan={6}>Data not found</td></tr>) : (
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
                  {/* <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td> */}
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
          </table>}
          {(currentTab === 2) && <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  deal Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                 deal name
                </th>
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Pipeline
                </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                  Deal stage
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                 against
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  created date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              {!isLoading ?((wonDealData && Array.isArray(wonDealData) && wonDealData.length > 0) ? (
                wonDealData.map((item, i) => {
                  let rr = i % 2 == 0;

                  // const maskMail = maskEmail(item.email)
                  // const maskNumber = maskPhone(item.phone)

                  const date = formatDate(item.createDate)

                  return (
                    <tr
                      key={item.deal_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/deals/view/${item.id}`}
                          className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.deal_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize">{item.dealName}</h4>{" "}
                        
                      
                      </td>
                      {/* <td className="p-4">
                        <span className={`${(item.dealPipeline.trim() === DEAL_PIPELINE.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.QUALIFICATION) ? "bg-blue-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.PROPOSAL) ? "bg-cyan-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.NEGOTIATION) ? "bg-teal-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.WON) ? "bg-green-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize`}>{item.dealPipeline.trim()}</span>
                      </td> */}
                      <td className="p-4 ">
                        <span className={`${(item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealStage.trim() === DEAL_STAGES.QUALIFICATION) ? "bg-blue-600" : (item.dealStage.trim() === DEAL_STAGES.PROPOSAL) ? "bg-cyan-500" : (item.dealStage.trim() === DEAL_STAGES.NEGOTIATION) ? "bg-teal-600" : (item.dealStage.trim() === DEAL_STAGES.WON) ? "bg-green-500" : (item.dealStage.trim() === DEAL_STAGES.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize`}>{item.dealStage.trim()}</span>
                      </td>
                      <td className="p-4 ">
                        <span
                          className={`bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy`}
                          onClick={()=>handleCopy(item?.lead_id?.lead_id)}
                        >
                          {" "}
                          {item?.lead_id?.lead_id}
                        </span>
                      </td>
                      <td className="p-4"> <span className="px-4 py-1.5 rounded-md bg-blue-200 text-sm text-blue-600 font-medium">{date}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/deals/view/${item.id}`}
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
                              href={`/deals/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100
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
                          
                         
                        </div>
                      </td>
                    </tr>
                  );
                })
              ): <tr> <td className="p-4 text-center" colSpan={7}>Data not found</td></tr>) : (
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
                  {/* <td className="p-4">
                    <Skeleton width={80} height={30} borderRadius={14} />
                  </td> */}
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
          </table>}
          {(currentTab === 3) && <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  deal Id
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                 deal name
                </th>
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  Pipeline
                </th> */}
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                  Deal stage
                </th>

                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                 against
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  created date
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              { !isLoading ? (lostDealData && Array.isArray(lostDealData) && lostDealData.length > 0 ? (
                lostDealData.map((item, i) => {
                  let rr = i % 2 == 0;

                  // const maskMail = maskEmail(item.email)
                  // const maskNumber = maskPhone(item.phone)

                  const date = formatDate(item.createDate)

                  return (
                    <tr
                      key={item.deal_id}
                      className={`${
                        rr
                          ? "bg-white dark:bg-transparent"
                          : "bg-blue-100/50 dark:bg-slate-500"
                      } w-full`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/deals/view/${item.id}`}
                          className="text-sm cursor-pointer hover:scale-110 transition-all hover:text-blue-300"
                        >
                          {" "}
                          {item.deal_id}
                        </Link>
                      </td>
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="capitalize">{item.dealName}</h4>{" "}
                        
                      
                      </td>
                      {/* <td className="p-4">
                        <span className={`${(item.dealPipeline.trim() === DEAL_PIPELINE.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.QUALIFICATION) ? "bg-blue-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.PROPOSAL) ? "bg-cyan-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.NEGOTIATION) ? "bg-teal-600" : (item.dealPipeline.trim() === DEAL_PIPELINE.WON) ? "bg-green-500" : (item.dealPipeline.trim() === DEAL_PIPELINE.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize`}>{item.dealPipeline.trim()}</span>
                      </td> */}
                      <td className="p-4 ">
                        <span className={`${(item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS) ? "bg-orange-500" : (item.dealStage.trim() === DEAL_STAGES.QUALIFICATION) ? "bg-blue-600" : (item.dealStage.trim() === DEAL_STAGES.PROPOSAL) ? "bg-cyan-500" : (item.dealStage.trim() === DEAL_STAGES.NEGOTIATION) ? "bg-teal-600" : (item.dealStage.trim() === DEAL_STAGES.WON) ? "bg-green-500" : (item.dealStage.trim() === DEAL_STAGES.LOST) ? "bg-red-500" : "bg-gray-600"} text-white px-4 py-1.5 text-sm rounded-md capitalize`}>{item.dealStage.trim()}</span>
                      </td>
                      <td className="p-4 ">
                        <span
                          className={`bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy`}
                          onClick={()=>handleCopy(item?.lead_id?.lead_id)}
                        >
                          {" "}
                          {item?.lead_id?.lead_id}
                        </span>
                      </td>
                      <td className="p-4"> <span className="px-4 py-1.5 rounded-md bg-blue-200 text-sm text-blue-600 font-medium">{date}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readLead) ? (
                            <Link
                              href={`/deals/view/${item.id}`}
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
                              href={`/deals/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100
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
                          
                         
                        </div>
                      </td>
                    </tr>
                  );
                })
              ): <tr> <td className="p-4 text-center" colSpan={7}>Data not found</td></tr>) : (
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
                  {/* <td className="p-4">
                    <Skeleton width={110} height={30} borderRadius={14} />
                  </td> */}
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
          </table>}
        </div>
    </div>
  );
};

export default page;
