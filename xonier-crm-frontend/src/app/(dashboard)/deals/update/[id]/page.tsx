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

import React, {
  ChangeEvent,
  JSX,
  useState,
  useEffect,
  FormEvent,
  MouseEvent,
} from "react";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import { GrDocumentUpdate } from "react-icons/gr";
import {
  MdOutlineCloudUpload,
  MdOutlineFormatIndentIncrease,
} from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import Select from "@/src/components/ui/Select";
import { IoChevronBack } from "react-icons/io5";

const page = (): JSX.Element => {
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
  const [formData, setFormData] = useState<DealUpdatePayload>({

    dealName: "",
    dealPipeline: DEAL_PIPELINE.QUALIFICATION,
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
        dealPipeline: data.dealPipeline ?? DEAL_PIPELINE.QUALIFICATION,
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
    } else if (requiredIds.some((item) => item.key === value)) {
      toast.info("this field is required");
    } else {
      setSelectedFieldsKeys((prev) => prev.filter((item) => item != value));
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


  return (
    <div className="fixed min-h-screen overflow-y-scroll z-100 top-0 left-0 right-0 border-0 w-full h-full bg-stone-100 dark:bg-gray-800">
      <div className="fixed z-100 left-0 top-0 w-88 border-r flex flex-col gap-6  border-slate-900/15 dark:border-gray-700 bg-slate-50 h-screen dark:bg-gray-800/50 pt-12 px-6">
        <div className="flex items-center gap-4 w-full border-b border-slate-600 py-4">
          <MdOutlineFormatIndentIncrease className="text-blue-500" />

          <h2 className="text-slate-900 dark:text-white font-semibold text-lg tracking-wide ">
            All Form Fields
          </h2>
        </div>
        <ul className="flex flex-col gap-3 px-4 py-2.5 min-h-[70vh] overflow-y-scroll">
          {!fieldDataLoading
            ? allFormFiled &&
              allFormFiled.length > 0 &&
              allFormFiled.map((item) => {
                const checked = selectedFieldsKeys.find(
                  (field) => field === item.key,
                )
                  ? true
                  : false;

                return (
                  <li className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={item.key}
                      name={item.name}
                      value={item.key}
                      className="peer cursor-pointer "
                      checked={checked}
                      onChange={handleChecked}
                    />
                    <label
                      htmlFor={item.key}
                      className="capitalize checked:text-blue-200 hover:text-blue-700 dark:hover:text-blue-200 hover:scale-104 transition-all duration-200 cursor-pointer peer-checked:text-blue-600 dark:peer-checked:text-blue-300  "
                    >
                      {item.name}
                    </label>
                  </li>
                );
              })
            : Array.from({ length: 18 }).map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  {" "}
                  <Skeleton
                    height={15}
                    width={15}
                    borderRadius={6}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton
                    height={16}
                    width={100}
                    borderRadius={6}
                    className="animate-pulse"
                  />{" "}
                </div>
              ))}
        </ul>
      </div>

      <div className="fixed top-4 z-50 left-96 w-[72vw] backdrop-blur-sm flex items-center justify-between gap-10 p-5">
        <div className="flex items-center gap-3 w-1/2">
          <GrDocumentUpdate className="text-xl text-blue-500" />{" "}
          <div className="flex flex-col gap-1">
            <h2 className="text-slate-900 dark:text-white font-semibold text-2xl tracking-wide ">
              {" "}
              Update Deal
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 ml-6">
          <button
            onClick={() => router.back()}
            className="h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"
          >
            <FaArrowLeftLong className="group-hover:scale-105 transition-all" />
          </button>
          <button
            onClick={() => router.forward()}
            className="h-10 w-10 flex items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-blue-600 hover:border-blue-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"
          >
            <FaArrowRightLong className="group-hover:scale-105 transition-all" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="ml-92 relative mt-18 flex flex-col gap-3 p-8">
        <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-start flex-col gap-1">
            <h2 className="text-blue-500 capitalize font-medium">Lead Name: {isLoading ? <Skeleton height={22} width={100} borderRadius={10} className="animate-pulse"/> : dealData ? <span>{dealData.dealName}</span> : "not found"} </h2>
            {isLoading ? <Skeleton height={18} width={190} borderRadius={8} className="animate-pulse"/>  : dealData && <span className="text-sm cursor-copy text-slate-500 dark:hover:text-blue-300 hover:text-blue-600" onClick={()=>handleCopy(dealData?.deal_id)}> Lead Id: {dealData?.deal_id}</span>}
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
                  alt="cry img"
                  height={200}
                  width={200}
                />
                <p className="">
                  No form fields found, please select fields first
                </p>
              </div>
            ) : (
              allFormFiled.map((item, i) => {
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
              bg-blue-600 text-white
              hover:bg-blue-700 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 capitalize"
              disabled={loading || selectedFieldsKeys.length <= 0}
            >
              <MdOutlineCloudUpload className="text-lg" />{" "}
              {loading ? "Updating..." : "Create deals"}
            </button>

            <button
              className="w-fit flex items-center justify-center gap-2
              rounded-md px-4 py-2 font-medium bg-blue-200 text-blue-600 hover:text-blue-700
              hover:bg-blue-300 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200"
              onClick={() => router.back()}
            >
              <IoChevronBack /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
