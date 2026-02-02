"use client"
import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import Input from "@/src/components/ui/Input";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import Select from "@/src/components/ui/Select";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import LeadService from "@/src/services/lead.service";
import { UserFormService } from "@/src/services/userForm.service";
import { LeadPayload } from "@/src/types/leads/leads.types";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import React, { JSX, useState, useEffect, FormEvent, ChangeEvent } from "react";
import { GrDocumentUpdate } from "react-icons/gr";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import InformationComponent from "@/src/components/ui/InformationComponent";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";


const page = ():JSX.Element => {
    const [err, setErr] = useState<string | string[]>("");
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [loading, setLoading] = useState<boolean>(false);
      const [userFormData, setUserFormData] = useState<UserForm[]>([]);
      const [userFormField, setUserFormField] = useState<CustomField[]>([]);
      
      const router = useRouter()
      const {id} = useParams()
    
      const [formData, setFormData] = useState<LeadPayload>({
        fullName: "",
        email: "",
        phone: "",
        priority: "",
        source: "",
        projectType: "",
        status: "",
    
        companyName: "",
        city: "",
        country: null,
        postalCode: null,
        language: null,
    
        industry: null,
        employeeRole: "",
        employeeSeniority: null,
    
        message: null,
        membershipNotes: null,
      });

      const getLeadData = async () => {
    setIsLoading(true);
    try {
      const result = await LeadService.getById(id);
      if (result.status === 200) {
        const data = result.data.data;
        setFormData({
          fullName: data.fullName ?? "",
          email : data.email ?? "",
          phone: data.phone ?? "",
          priority: data.priority ?? "",
        source: data.source ?? "",
        projectType: data.projectType ?? "",
        status: data.status ?? "",
    
        companyName: data.companyName ?? "",
        city: data.city ?? "",
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        language: data.language ?? null,
    
        industry: data.industry ?? null,
        employeeRole: data.employeeRole ?? "",
        employeeSeniority: data.employeeSeniority ?? null,
    
        message: data.message ?? null,
        membershipNotes: data.membershipNotes ?? null,
        })
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        // toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };
    
      const getFormFields = async (): Promise<void> => {
        setIsLoading(true);
        try {
          const result = await UserFormService.getAllLead();
          if (result.status === 200) {
            setUserFormData(result.data.data);
            setUserFormField(result.data.data.selectedFormFields);
          }
        } catch (error) {
          process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
          if (axios.isAxiosError(error)) {
            const messages = extractErrorMessages(error);
            setErr(messages);
            // toast.error(`${messages}`);
          } else {
            setErr(["Something went wrong"]);
          }
        } finally {
          setIsLoading(false);
        }
      };

type FormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
    
      const handleChange = (
        e: ChangeEvent<FormElement>,
      ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
    
      useEffect(() => {
        getFormFields();
        getLeadData()
      }, []);
    
      const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()
        setLoading(true);
        setErr("")
        try {
          if(!id){
            toast.info("Lead id not found")
            return
          }
          const result = await LeadService.update(id, formData);
          if(result.status === 200){
            toast.success(`${formData.fullName} lead Updated successfully`)
            setFormData({
              fullName: "",
        email: "",
        phone: "",
        priority: "",
        source: "",
        projectType: "",
        status: "",
    
        companyName: "",
        city: "",
        country: null,
        postalCode: null,
        language: null,
    
        industry: null,
        employeeRole: "",
        employeeSeniority: null,
    
        message: null,
        membershipNotes: null,
            })
    
            setTimeout(() => {
             
              router.back()
            }, 2000);
          }
        } catch (error) {
          process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
          if (axios.isAxiosError(error)) {
            const messages = extractErrorMessages(error);
            setErr(messages);
            // toast.error(`${messages}`);
          } else {
            setErr(["Something went wrong"]);
          }
        } finally {
          setLoading(false);
        }
      };
  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
       <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-8 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
        <div className="flex items-center gap-5 justify-between">
          <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
            Update Leads
          </h2>
          <p className="text-slate-500 dark:text-slate-300">You can customize your fields, if you want then click edit form field button</p>
          </div>

          <PrimaryButton
            text={(userFormData.length <= 0 ) ? "create Form Fields":"Edit Form Fields" }
            link="/leads/update-form"
            icon={<GrDocumentUpdate />}
          />
        </div>
        {err &&<ErrorComponent error={err}/>}
        {(formData.fullName === "" || formData.email === "" || formData.phone === "" || formData.priority === "" || formData.projectType === "" || formData.status === "" ||  formData.source === "") && <InformationComponent message="Full Name, Email, Phone, Source, Priority, Project Type and Status fields are mandatory"/>}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
          {!isLoading ? ((userFormField &&
            userFormField.length > 0) ?
            userFormField.map((item, i) => {
              const fieldValue = formData[item.key] ?? "";
              if (item.type === "text" || item.type === "email" || item.type === "number") {
                return (
                  <Input
                    key={item.id}
                    name={item.key}
                    type={item.type}
                    label={item.name}
                    placeholder={item.placeholder ?? ""}
                    value={fieldValue as string}
                    onChange={handleChange}
                    required={item.required}
                  />
                );
              }

              if (item.type === "select") {
                return (
                  <Select
                    key={item.id}
                    name={item.key}
                    label={item.name}
                    options={item.options ?? []}
                    placeholder={item.placeholder ?? "Select"}
                    value={fieldValue as string}
                    onChange={handleChange}
                    required={item.required}
                  />
                );
              }

              return null;
            }): (
              <div className="flex items-center flex-col justify-center col-span-2 py-5">
                                  <Image src={"/images/Cry.gif"} alt="cry img" height={200} width={200} />
                          <p className="">No form fields found, please select fields first</p></div> 
            )): (
              <>
              {Array.from({length:6}).map(()=>(
                <div className="flex flex-col gap-2">

              <Skeleton height={18} width={100} borderRadius={10} className="animate-pulse" />
              <Skeleton height={38} width={500} borderRadius={14} className="animate-pulse" />
              </div>

              )) }
              
              </>
            )}


          <FormButton className="col-span-2" isLoading={loading} disabled={formData.fullName === "" || formData.email === "" || formData.phone === "" || formData.priority === "" || formData.projectType === "" || formData.status === "" ||  formData.source === "" || loading}> Update Lead </FormButton>
        </form>
      </div>
    </div>
  )
}

export default page
