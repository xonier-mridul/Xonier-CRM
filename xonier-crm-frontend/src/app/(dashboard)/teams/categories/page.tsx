"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, ChangeEvent, ChangeEventHandler, FormEvent } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiUserPlus } from "react-icons/fi";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { TeamCategoryService } from "@/src/services/teamCategory.service";
import {
  TeamCategory,
  TeamCategoryCreatePayload,
} from "@/src/types/team/team.types";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import Link from "next/link";
import { GoDotFill } from "react-icons/go";
import Pagination from "@/src/components/common/pagination";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { FaPlus, FaXmark } from "react-icons/fa6";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { div } from "framer-motion/client";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import SuccessComponent from "@/src/components/ui/SuccessComponent";
import Skeleton from "react-loading-skeleton";

const page = (): JSX.Element => {
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [teamCatData, setTeamCateData] = useState<TeamCategory[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [formData, setFormData] = useState<TeamCategoryCreatePayload>({
    name: "",
    description: "",
  });
  const [showSuccess, setShowSuccess] = useState<string>("")

  const { hasPermission } = usePermissions();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getTeamCategoryData = async () => {
    setIsLoading(true);
    setErr("");
    try {
      const result = await TeamCategoryService.getAll({
        page: currentPage,
        limit: pageLimit,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setTeamCateData(data.data);
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

  useEffect(() => {
    getTeamCategoryData();
  }, [currentPage, pageLimit]);

  const handleSubmit = async(e: FormEvent<HTMLFormElement>)=>{
    e.preventDefault()
    try {

        const result = await TeamCategoryService.create(formData)

        if(result.status === 201){
            setFormData({
                name: "",
                description: "",
            })
             toast.success("Category created successfully")
             setIsPopupShow(false)
             setShowSuccess("Category created successfully")
             await getTeamCategoryData()
             setTimeout(() => {
                setShowSuccess("")
             }, 3000);
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
  }

  const handleDelete = async (id: string) => {
   
    setErr("")
    
    
    try {
      if(!id){
      toast.info("category Id not found")
      return
    }

     const isDelete =  await ConfirmPopup({title: "Are you sure", text:"are you sure", btnTxt:"Yes, delete"})

    
     if(isDelete){
      const response = await TeamCategoryService.delete(id)

      if(response.status === 200){
       await getTeamCategoryData()
       toast.success("Category deleted successfully")
       setShowSuccess("Category deleted successfully")
       setTimeout(() => {
        setShowSuccess("")
       }, 3000);
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
    <>
      {isPopupShow && (
        <>
          {" "}
          <BlurryBackground />{" "}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
            bg-white dark:bg-gray-700 p-6 rounded-xl w-[650px] z-[200]
            flex flex-col gap-5 shadow-xl"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Create Team Category</h2>
              <button onClick={() => setIsPopupShow(false)}>
                <FaXmark className="text-xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <Input
              label="Category name"
              name="name"
              placeholder="e.g. Development team"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">Description</label>
            <textarea name="description" id="description" className="w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500" rows={5} value={formData.description} onChange={(e)=>handleChange(e)} placeholder="Write you description..."></textarea></div>
            {err && <div className=" flex items-center justify-end w-full"> <p className="text-red-500"> {err} </p></div>}
            <FormButton isLoading={isLoading} disabled={formData.name === "" || formData.description === ""}>Upload</FormButton>
            </form>
          </div>{" "}
        </>
      )}
      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
          <div className="flex items-center gap-12 justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
                All Team categories
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Create, edit or remove team categories.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <select
                name="limit"
                id="limit"
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border-[1px] border-slate-900/10"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">50</option>
              </select>
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 gap-1.5 rounded-lg border-[1px] border-slate-900/10 flex items-center">
                <IoIosSearch className="text-xl" />
                <input type="text" placeholder="search by name..." />
              </div>
              {hasPermission(PERMISSIONS.createTeamCategory) ? (
                <button
                  onClick={() => setIsPopupShow(true)}
                  className="bg-blue-600 hover:bg-blue-700
                                text-white px-5 py-2 rounded-md
                                flex items-center gap-2 cursor-pointer"
                >
                  <FiUserPlus /> Create Category
                </button>
              ) : (
                <span
                  className="bg-blue-400 opacity-89 cursor-not-allowed
                                text-white px-5 py-2 rounded-md
                                flex items-center gap-2"
                >
                  <FiUserPlus /> Create Category
                </span>
              )}
            </div>
          </div>
          {err && <ErrorComponent error={err}/>}
          {showSuccess && <SuccessComponent message={showSuccess}/>}
          <table className="w-full rounded-xl overflow-hidden">
            <thead>
              <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                  S.No.
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  {" "}
                  Name
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Description
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Created At
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
              {!isLoading ? (
                teamCatData && teamCatData?.length > 0 ? (
                  teamCatData?.map((item, index) => {
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

                    return (
                      <tr
                        className={`${
                          rr
                            ? "bg-white dark:bg-transparent"
                            : "bg-blue-100/50 dark:bg-slate-500"
                        } w-full`}
                      >
                        <td className="p-4">{index + 1}</td>
                        <td>
                          <Link
                            href={`/teams/categories/${item.id}`}
                            className="cursor-pointer hover:text-blue-500 capitalize"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="first-letter:uppercase">
                          {item.description}
                        </td>
                        <td>{date}</td>
                        <td>
                          <span
                            className={`${
                              item.isActive === true
                                ? "bg-green-100  text-green-600"
                                : "bg-orange-100 text-orange-500"
                            }  rounded-full text-sm font-medium py-1 px-3 flex items-center gap-1 w-fit  capitalize`}
                          >
                            {" "}
                            <GoDotFill />{" "}
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/users/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                            >
                              <FaRegEye className="text-xl" />
                            </Link>
                            <Link
                              href={`/teams/categories/update/${item.id}`}
                              className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                            >
                              <MdOutlineEdit className="text-xl" />
                            </Link>
                            {
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={!hasPermission(PERMISSIONS.deleteTeamCategory)}
                                className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:text-red-400"
                              >
                                {" "}
                                <MdDeleteOutline className="text-xl" />{" "}
                              </button>
                            }
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
               
                Array.from({length: 8}).map((_, i)=>(
                   <tr key={i} className=" text-center animate-pulse">
                                  <td className="p-4" >
                                    <Skeleton width={30} height={30} borderRadius={12}/>
                                  </td>
                                  <td className="p-4" >
                                    <Skeleton width={140} height={30} borderRadius={12}/>
                                  </td>
                                  <td className="p-4" >
                                    <Skeleton width={140} height={30} borderRadius={12}/>
                                  </td>
                                  <td className="p-4" >
                                    <Skeleton width={130} height={30} borderRadius={12}/>
                                  </td>
                                  <td className="p-4" >
                                    <Skeleton width={120} height={30} borderRadius={999}/>
                                  </td>
                                 
                                  <td className="p-4" >
                                    <div className="flex items-center gap-2">
                                      <Skeleton width={35} height={35} borderRadius={12}/>
                                      <Skeleton width={35} height={35} borderRadius={12}/>
                                      <Skeleton width={35} height={35} borderRadius={12}/>
                                    </div>
                                  </td>
                  
                                </tr>

                )) 
                
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
    </>
  );
};

export default page;
