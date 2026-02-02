"use client";
import TabsButton from "@/src/components/ui/TabsButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { Quotation } from "@/src/types/quotations/quote.types";
import axios from "axios";
import Link from "next/link";
import React, { JSX, useState, useEffect } from "react";
import { IoIosSearch } from "react-icons/io";
import { MdOutlineLeaderboard } from "react-icons/md";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { FaRegEye } from "react-icons/fa";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dealData, setDealData] = useState<Quotation[]>([]);
  const [wonDealData, setWonDealData] = useState<Quotation[]>([]);
  const [lostDealData, setLostDealData] = useState<Quotation[]>([]);
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

  const getQuotationData = async () => {
    setIsLoading(true);
    try {
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

  const handleTabs = async (no: number): Promise<void> => {
    setCurrentTab(no);
    if (no === 2) {
      await getQuotationData();
    }
    if (no === 3) {
      await getQuotationData();
    }
  };

  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All Sales Quotations
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              View and edit quotations
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
            {
              <Link
                href={"/leads"}
                className="bg-blue-600 hover:bg-blue-700
                                            text-white px-5 py-2 rounded-md
                                            flex items-center gap-2 group"
              >
                <MdOutlineLeaderboard className="group-hover:rotate-90 transition-all duration-300" />{" "}
                All Leads
              </Link>
            }
          </div>
        </div>
        <ul className="w-full flex items-center gap-5">
          <li>
            <TabsButton
              btnTxt="All Quotations"
              dataLen={dealData.length}
              no={1}
              currentVal={currentTab}
              onClickEvent={() => setCurrentTab(1)}
            />
          </li>
          <li>
            <TabsButton
              btnTxt="Won Deals"
              dataLen={wonDealData.length}
              no={2}
              currentVal={currentTab}
              onClickEvent={() => handleTabs(2)}
            />
          </li>
          <li>
            <TabsButton
              btnTxt="Lost Deals"
              dataLen={lostDealData.length}
              no={3}
              currentVal={currentTab}
              onClickEvent={() => handleTabs(3)}
            />
          </li>
        </ul>
        {currentTab === 1 && (
          <table className="w-full rounded-xl overflow-hidden">
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
            
          </table>
        )}
      </div>
    </div>
  );
};

export default page;
