"use client"
import extractErrorMessages from "@/src/app/utils/error.utils";
import EnquiryUpdate from "@/src/components/pages/enquiry/EnquiryUpdate";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { PRIORITY, PROJECT_TYPES, SOURCE } from "@/src/constants/enum";
import { AuthService } from "@/src/services/auth.service";
import { EnquiryService } from "@/src/services/enquiry.service";
import { RootState } from "@/src/store";
import { User } from "@/src/types";
import {
  EnquiryData,
  UpdateEnquiryFromData,
  UpdateEnquiryPayload,
} from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { useParams, useRouter } from "next/navigation";

import React, { JSX, useState, useEffect, FormEvent } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [usersData, setUsersData] = useState<User[] | null>(null)
  const [formData, setFormData] = useState<UpdateEnquiryFromData>({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    projectType: "",
    priority: "",
    source: "",
    assignTo: "",
    message: "",
  });

  const { id } = useParams();
  const router = useRouter()
 

  const getEnquiryData = async (id: ParamValue): Promise<void> => {
    setErr("");
    console.log("enquiry id: ", id)
    try {
      const result = await EnquiryService.getById(id);

      if (result.status === 200) {
        const data = result.data.data;
        console.log("enquirey data: ",data)

        setFormData({
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          companyName: data.companyName ?? "",
          projectType: data.projectType ?? "",
          priority: data.priority ?? "",
          source: data.source ?? "",
          assignTo: (data.assignTo?.id && (data.assignTo?.id ?? "")),
          message: data.message ?? "",
        });
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

  const getUsers = async()=>{
    try {
      const result = await AuthService.getAllActiveWithoutPagination()
      if (result.status === 200) {
        setUsersData(result.data.data);
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



  useEffect(() => {
    getUsers()
    if (!id) return;

    getEnquiryData(id);
  }, []);

  const handleSubmit = async (e:FormEvent<HTMLFormElement>):Promise<void> => {
    e.preventDefault()
    setIsLoading(true);
    setErr("");
    try {

      if(!id){
        toast.error("Enquiry id not found")
      }

      const payload = {
        ...formData, projectType: formData.projectType as PROJECT_TYPES, priority: formData.priority as PRIORITY, source: formData.source as SOURCE
      }
      const result = await EnquiryService.update(id, payload)
      if(result.status === 200){
        toast.success("Enquiry updated successfully")
        setErr("")
        router.push("/enquiry")
      }

    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    } finally {
      setIsLoading(false)
    }
  };

  return <div className={`ml-[${SIDEBAR_WIDTH}] mt-[60px] p-6`}>
    <EnquiryUpdate isLoading={isLoading} formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} usersData={usersData} err={err}/>

  </div>;
};

export default page;
