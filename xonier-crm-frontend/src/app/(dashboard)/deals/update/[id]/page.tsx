"use client";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import extractErrorMessages from "@/src/app/utils/error.utils";
import DataNotFound from "@/src/components/common/DataNotFound";
import ThemeToggle from "@/src/components/common/ThemeToggle";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import Input from "@/src/components/ui/Input";
import { DEAL_PIPELINE, DEAL_STAGES, DEAL_TYPE } from "@/src/constants/enum";
import dealService from "@/src/services/deal.service";
import { FormFieldService } from "@/src/services/formField.service";
import { Deal, DealPayload, DealUpdatePayload } from "@/src/types/deals/deal.types";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";


import React, {
  ChangeEvent,
  JSX,
  useState,
  useEffect,
  FormEvent,
  MouseEvent,
  useRef,
} from "react";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import { GrDocumentUpdate } from "react-icons/gr";
import {
  MdOutlineCloudUpload,
  MdOutlineFormatIndentIncrease,
  MdSearch,
} from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import Select from "@/src/components/ui/Select";
import { IoChevronBack, IoLanguage } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { IoIosSearch } from "react-icons/io";
import LanguageSelector from "@/src/components/common/LanguageSelector";

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fieldDataLoading, setFieldDataLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [dealData, setDealData] = useState<Deal | null>(null);
  const [selectedFieldsKeys, setSelectedFieldsKeys] = useState<string[]>([]);
  const [allFormFiled, setAllFormField] = useState<CustomField[]>([]);
  const [requiredIds, setRequiredIds] = useState<CustomField[]>([]);
  const [userFormData, setUserFormData] = useState<UserForm | null>(null);
  const [userFormField, setUserFormField] = useState<CustomField[]>([]);
   const [searchQuery, setSearchQuery] = useState<string>("");
   const excludeFromRequired = ["priority", "source"];
    const buttonRef = useRef<HTMLButtonElement>(null);
     const dropdownRef = useRef<HTMLDivElement>(null);
       const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<DealUpdatePayload>({

    dealName: "",
    dealStage: DEAL_STAGES.QUALIFICATION,
    dealType: DEAL_TYPE.NEW_BUSINESS,
    dealOwner: null,
    createDate: new Date().toISOString().split("T")[0],
    closeDate: null,
    amount: 0,
    dealCollaborator: null,
    dealDescription: null,
    dealProbability: null,
    forecastProbability: null,
    nextStep: "",
    forecastCategory: null,
    closedWonReason: "",
    closedLostReason: "",
    originalTrafficSource: "",
  });

  const getKeysWithValue = (obj: Record<string, any>) => {
  return Object.keys(obj).filter((key) => {
    const value = obj[key];

    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).length > 0;
    }

    return true;
  });
};


  const { id } = useParams();
  const router = useRouter();

  const getAllFieldsData = async (): Promise<void> => {
    setFieldDataLoading(true);
    try {
      const result = await FormFieldService.getDealAll();
      if (result.status === 200) {
        const data = result.data.data ?? [];
        const requiredData = data.filter((item: any) => item.required === true);
        setRequiredIds(requiredData);
        const ids = requiredData.map((item: any) => item.key);
        // setSelectedFieldsKeys(ids);
        setAllFormField(data);
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
      setFieldDataLoading(false);
    }
  };

  const formatDateForInput = (value?: string) => {
    if (!value) return "";
    return value.split("T")[0];
  };

 const getDealData = async (id: ParamValue) => {
  setIsLoading(true);
  try {
    const result = await dealService.getById(id);

    if (result.status === 200) {
      const data = result.data.data;

      const selectedKeys = getKeysWithValue(data);

      console.log("selectedKeys:", selectedKeys);

      setSelectedFieldsKeys(selectedKeys);
      setDealData(data);
       console.log("data: ", data.dealStage)
      setFormData({
        dealName: data.dealName ?? "",
        dealStage: data.dealStage ?? DEAL_STAGES.QUALIFICATION,
        dealType: data.dealType ?? DEAL_TYPE.NEW_BUSINESS,
        dealOwner: data.dealOwner ?? null,
        createDate: data.createDate ?? new Date().toISOString().split("T")[0],
        closeDate: data.closeDate ?? null,
        amount: data.amount ?? 0,
        dealCollaborator: data.dealCollaborator ?? null,
        dealDescription: data.dealDescription ?? null,
        dealProbability: data.dealProbability ?? null,
        forecastProbability: data.forecastProbability ?? null,
        nextStep: data.nextStep ?? "",
        forecastCategory: data.forecastCategory ?? null,
        closedWonReason: data.closedWonReason ?? "",
        closedLostReason: data.closedLostReason ?? "",
        originalTrafficSource: data.originalTrafficSource ?? "",
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const messages = extractErrorMessages(error);
      toast.error(`${messages}`);
    } else {
      toast.error("Something went wrong");
    }
  } finally {
    setIsLoading(false);
  }
};


const handleChecked = (e: ChangeEvent<HTMLInputElement>) => {
  const { value, checked } = e.target;

  if (checked) {
    setSelectedFieldsKeys((prev) => [...prev, value]);
  } else if (
    requiredIds.some((item) => item.key === value) &&
    !excludeFromRequired.includes(value) // ✅ Allow removing priority/source
  ) {
    toast.info("this field is required");
  } else {
    setSelectedFieldsKeys((prev) => prev.filter((item) => item !== value));
  }
};



  useEffect(() => {
    getAllFieldsData();

    if (!id) return;
    getDealData(id);
  }, []);
  type change = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const handleChange = (e: ChangeEvent<change>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData({ ...formData, [name]: Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleUpdate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true)
    try {
        const result = await dealService.update(id, formData)

        if(result.status === 200){
            toast.success(`${formData.dealName} updated successfully`)
            setTimeout(() => {
                router.push(`/deals/view/${dealData?.id}`)
            }, 1600);
            setErr("")
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
        setLoading(false)
    }
  };

   useEffect(() => {
         const handleClickOutside = (event: globalThis.MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      
          if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
          }
      
          return () => {
            document.removeEventListener("mousedown", handleClickOutside);
          };
        }, [isOpen]);

    const filteredFields = allFormFiled.filter(
    (field) =>
      field.key !== "dealPipeline" &&
      field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <div className="fixed min-h-screen overflow-y-scroll z-100 top-0 left-0 right-0 border-0 w-full h-full bg-stone-100 dark:bg-gray-800">
       <div className="fixed z-100 left-0 top-0 w-80  flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-screen">
        
        {/* Sidebar Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <MdOutlineFormatIndentIncrease className="text-white text-xl" />
            </div>
            <h2 className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">
              {t("all_form_fields")}
            </h2>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none" />
            <input
              type="text"
              placeholder={t("search_fields")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Selected Count */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t("fields_selected", { count: selectedFieldsKeys.length })}
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium">
              {t("available_count", { count: filteredFields.length })}
            </span>
          </div>
        </div>

        {/* Scrollable Field List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-4 space-y-1.5">
            {!fieldDataLoading ? (
              filteredFields.length > 0 ? (
                filteredFields.map((item) => {
                  const checked = selectedFieldsKeys.includes(item.key);
                  const isRequired =
  requiredIds.some((req) => req.key === item.key) &&
  !excludeFromRequired.includes(item.key); // ✅ No required badge for priority/source


                  return (
                    <div key={item.id}>
                      <label
                        htmlFor={item.key}
                        className={`
                          flex items-center gap-3 px-3 py-1.5 rounded-xl cursor-pointer
                          transition-all duration-200 group
                          ${
                            checked
                              ? "bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-900/20 border-2 border-cyan-200 dark:border-cyan-800"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          id={item.key}
                          name={item.name}
                          value={item.key}
                          checked={checked}
                          onChange={handleChecked}
                          className="sr-only peer"
                        />

                        {/* Custom Checkbox */}
                        <div
                          className={`
                            relative h-5 w-5 rounded-md flex items-center justify-center
                            transition-all duration-200 flex-shrink-0
                            ${
                              checked
                                ? "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-md"
                                : "bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 group-hover:border-cyan-400"
                            }
                          `}
                        >
                          {checked && (
                            <FaCheck className="text-white text-[10px]" />
                          )}
                        </div>

                        {/* Field Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`
                                text-sm font-medium truncate capitalize
                                ${
                                  checked
                                    ? "text-cyan-700 dark:text-cyan-300"
                                    : "text-gray-700 dark:text-gray-300"
                                }
                              `}
                            >
                              {item.name}
                            </span>
                            {isRequired && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex-shrink-0">
                                {t("required")}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {t(item.type)}
                          </span>
                        </div>
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  {t("no_fields_found")}
                </div>
              )
            ) : (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-3 py-3 flex items-center gap-3">
                  <Skeleton
                    height={20}
                    width={20}
                    borderRadius={6}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1">
                    <Skeleton height={14} width={120} borderRadius={6} className="mb-1" />
                    <Skeleton height={10} width={60} borderRadius={6} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      <div className="fixed top-2 z-50 left-80 right-0 bg-white dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <GrDocumentUpdate className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight">
                {t("update_deal")}
              </h2>
              {isLoading ? (
                <Skeleton height={16} width={160} borderRadius={6} />
              ) : dealData ? (
                <p
                  className="text-sm text-cyan-500 cursor-copy hover:text-cyan-600 transition-colors"
                  onClick={() => handleCopy(dealData?.deal_id)}
                >
                  {t("lead_id_2")} {dealData?.deal_id}
                </p>
              ) : null}
            </div>
          </div>

           <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.back()}
                          className="h-10 w-10 flex  bg-slate-50 items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-cyan-600 cursor-pointer hover:border-cyan-600/20 hover:scale-103 group"
                        >
                          <FaArrowLeftLong className="text-lg group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                          onClick={() => router.forward()}
                          className="h-10 w-10 flex  bg-slate-50 items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-cyan-600 cursor-pointer hover:border-cyan-600/20 hover:scale-103 group"
                        >
                          <FaArrowRightLong className="text-lg group-hover:translate-x-1 transition-transform" />
                        </button>
                        <ThemeToggle />
                        <div className="relative ">
                          <button
                            ref={buttonRef}
                            onClick={() => setIsOpen(!isOpen)}
                            className="h-10 w-10 flex  bg-slate-50 items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-cyan-600 cursor-pointer hover:border-cyan-600/20 hover:scale-103"
                            aria-label={t("select_language")}
                          >
                            <IoLanguage className="w-5 h-5" />
                          </button>
          
                          <LanguageSelector
                            isOpen={isOpen}
                            setIsOpen={setIsOpen}
                            dropdownRef={dropdownRef}
                          />
                        </div>
                      </div>
        </div>
      </div>

      <div className="ml-90 relative mt-18 flex flex-col gap-3 p-8 mr-4">
        <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-start flex-col gap-1">
            <h2 className="text-cyan-500 capitalize font-medium">{t("lead_name")} {isLoading ? <Skeleton height={22} width={100} borderRadius={10} className="animate-pulse"/> : dealData ? <span>{dealData.dealName}</span> : "not found"} </h2>
            {isLoading ? <Skeleton height={18} width={190} borderRadius={8} className="animate-pulse"/>  : dealData && <span className="text-sm cursor-copy text-slate-500 dark:hover:text-cyan-300 hover:text-cyan-600" onClick={()=>handleCopy(dealData?.deal_id)}> {t("lead_id_2")} {dealData?.deal_id}</span>}
            </div>
        </div>
        {err && <ErrorComponent error={err} />}
        <div className=" bg-white dark:bg-gray-700 p-6 rounded-lg grid grid-cols-2 gap-5">
          {!isLoading ? (
            allFormFiled &&
            allFormFiled.length > 0 &&
            (selectedFieldsKeys.length == 0 ? (
              <div className="flex items-center flex-col justify-center col-span-2 py-5">
                <Image
                  src={"/images/Cry.gif"}
                  alt={t("cry_img")}
                  height={200}
                  width={200}
                />
                <p className="">
                  {t("no_form_fields_found_please_select")}
                </p>
              </div>
            ) : (
              allFormFiled.map((item, i) => {
                if(item.key === "dealPipeline"){
                  return null
                }
                const rawValue = (formData as Record<string, any>)[item.key];

                const fieldValue =
                  item.type === "date"
                    ? formatDateForInput(rawValue)
                    : (rawValue ?? "");

                const checked = selectedFieldsKeys.find(
                  (field) => field === item.key,
                )
                  ? true
                  : false;
                if (!checked) {
                  return;
                }

                if (
                  item.type === "text" ||
                  item.type === "email" ||
                  item.type === "date" ||
                  item.type === "textarea"
                ) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 8 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="w-full"
                      key={item.id}
                    >
                      <Input
                        name={item.key}
                        type={item.type}
                        label={item.name}
                        onChange={(e) => handleChange(e)}
                        value={fieldValue}
                        placeholder={item.placeholder ?? ""}
                        required={item.required}
                      />
                    </motion.div>
                  );
                }

                if (item.type === "number") {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 8 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="w-full"
                      key={item.id}
                    >
                      <Input
                        name={item.key}
                        type={item.type}
                        label={item.name}
                        onChange={(e) => handleChange(e)}
                        onWheel={(e) => e.currentTarget.blur()}
                        value={fieldValue}
                        placeholder={item.placeholder ?? ""}
                        required={item.required}
                      />
                    </motion.div>
                  );
                }

                if (item.type === "select") {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 8 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="w-full"
                      key={item.id}
                    >
                      <Select
                        name={item.key}
                        label={item.name}
                        options={item.options ?? []}
                        placeholder={item.placeholder ?? "Select"}
                        onChange={(e) => handleChange(e)}
                        value={fieldValue}
                        required={item.required}
                      />
                    </motion.div>
                  );
                }

                return null;
              })
            ))
          ) : (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton
                    height={18}
                    width={100}
                    borderRadius={10}
                    className="animate-pulse"
                  />
                  <Skeleton
                    height={38}
                    width={450}
                    borderRadius={14}
                    className="animate-pulse"
                  />
                </div>
              ))}
            </>
          )}
          <div className="flex mt-6 items-center gap-5 justify-end col-span-2">
            <button
              onClick={handleUpdate}
              className="w-fit flex items-center justify-center gap-2
              rounded-md px-4 py-2 font-medium text-nowrap
              bg-cyan-600 text-white
              hover:bg-cyan-700 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 capitalize"
              disabled={loading || selectedFieldsKeys.length <= 0}
            >
              <MdOutlineCloudUpload className="text-lg" />{" "}
              {loading ? "Updating..." : "Update deals"}
            </button>

            <button
              className="w-fit flex items-center justify-center gap-2
              rounded-md px-4 py-2 font-medium bg-cyan-200 text-cyan-600 hover:text-cyan-700
              hover:bg-cyan-300 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200"
              onClick={() => router.back()}
            >
              <IoChevronBack /> {t("back")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
