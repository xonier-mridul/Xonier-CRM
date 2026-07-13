"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { FormFieldService } from "@/src/services/formField.service";
import { UserFormService } from "@/src/services/userForm.service";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import React, { JSX, useState, useEffect, FormEvent, ChangeEvent, MouseEvent } from "react";
import { toast } from "react-toastify";
import { MdOutlineFormatIndentIncrease, MdDeleteOutline } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { GrDocumentUpdate } from "react-icons/gr";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { MdOutlineCloudUpload } from "react-icons/md";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaArrowLeftLong, FaArrowRightLong, FaPlus } from "react-icons/fa6";
import ThemeToggle from "@/src/components/common/ThemeToggle";
import { CUSTOM_FIELD_TYPE, FORM_FIELD_MODULE } from "@/src/constants/enum";
import CustomFormService from "@/src/services/customForm.service";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { CreateUserCustomField, FORM_FIELD_MODULES } from "@/src/types/customForm.types";
import { IoMdClose } from "react-icons/io";
import { FaCheck, FaTrash } from "react-icons/fa";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useTranslation } from "react-i18next";



const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fieldDataLoading, setFieldDataLoading] = useState<boolean>(false);
  const [cuFieldDataLoading, setCuFieldDataLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userFormData, setUserFormData] = useState<UserForm | null>(null);
  const [userFormField, setUserFormField] = useState<CustomField[]>([]);
  const [allFormFiled, setAllFormField] = useState<CustomField[]>([]);
  const [allCustomFormFiled, setAllCustomFormField] = useState<CustomField[]>([]);
  const [requiredIds, setRequiredIds] = useState<CustomField[]>([])
  const [selectedFieldsIds, setSelectedFieldsIds] = useState<string[]>([])
  const [createFieldPopup, setCreateFieldPopup] = useState<boolean>(false)
  const [createFieldLoading, setCreateFieldLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateUserCustomField>({
        name: "",
        type: CUSTOM_FIELD_TYPE.TEXT,
    
    
        options: [{ label: "", value: "" }],
    
        placeholder: "",
    
        order: 0
  })

  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = (e.target as HTMLInputElement).checked;

  setFormData((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : value,
  }));
};



  const router = useRouter()

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        const selectedFields:CustomField[] = result.data.data.selectedFormFields ?? [];
        const selectedFieldsIds = selectedFields.map(item=>item.id)
        const required = selectedFields.filter((item)=> item.required === true || item.id === "6974a52d515f3aec8648561a")
        setUserFormData(result.data.data);
        setUserFormField(selectedFields);setSelectedFieldsIds(prev => [
          ...new Set([...prev, ...selectedFieldsIds])
        ]);
        setRequiredIds(required)
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomFormFields = async(): Promise<void>=>{
     
    setCuFieldDataLoading(true)
    try {
      const result = await CustomFormService.getAllByCreator()
      if (result.status === 200){
        const data = result.data.data
        console.log('form data :',data)
        setAllCustomFormField(data)
      }
     
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
        setAllCustomFormField([]);
        return;
      }
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setCuFieldDataLoading(false)
    }
  }

  const getAllFieldsData = async (): Promise<void> => {
    setFieldDataLoading(true);
    try {
      const result = await FormFieldService.getLeadsAll();
      if (result.status === 200) {
        const req:string[] = [];
        result.data.data.forEach((item:any,i:number)=>{
          if(item.required === true){
            req.push(item.id)
          }
          if(item.id === "6974a52d515f3aec8648561a"){
            req.push(item.id);
            result.data.data[i].required = true;
          }
        })
        setSelectedFieldsIds(prev => [
          ...new Set([...prev, ...req])
        ]);
        setAllFormField(result.data.data);
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

  useEffect(() => {
    getFormFields();
    getAllFieldsData();
    getCustomFormFields();
  }, []);

  const handleChecked = (e:ChangeEvent<HTMLInputElement>)=>{
    const {value, checked} = e.target
    
    if(checked){
        setSelectedFieldsIds((prev)=>([...prev, value]))
    }
    else if(requiredIds.some((item)=>item.id === value)){
        toast.info("this field is required")
    }
    else{
        setSelectedFieldsIds((prev)=>prev.filter(item=> item != value))
    }
  }

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
        if(userFormData && !userFormData.id){
          toast.error("Form id not found")
        }

        if(!userFormData){
          const result = await UserFormService.create({
            "selectedFormFields": selectedFieldsIds, 
            "module": FORM_FIELD_MODULE.LEAD
          })

          if (result.status === 201){
            toast.success("Form field created successfully")
            await getFormFields(); 
            return 
          }
        }
        
        const result = await UserFormService.update(userFormData?.id, {
          "selectedFormFields": selectedFieldsIds, 
          "module": FORM_FIELD_MODULE.LEAD
        })
        
        if(result.status === 200){
            toast.success("Form field updated successfully")
            await getFormFields(); 
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
      setLoading(false);
    }
  };

  const handleAddOption = () => {
  setFormData((prev) => ({
    ...prev,
    options: [...prev.options, { label: "", value: "" }]
  }));
};


const handleRemoveOption = (index: number) => {
  setFormData((prev) => ({
    ...prev,
    options: prev.options.filter((_, i) => i !== index)
  }));
};

  const handleOptionChange = (index: number, field: 'label' | 'value', value: string) => {
  setFormData((prev) => ({
    ...prev,
    options: prev.options.map((opt, i) => 
      i === index ? { ...opt, [field]: value } : opt
    )
  }));
};

const resetFormData = () => {
  setFormData({
    name: "",
    type: CUSTOM_FIELD_TYPE.TEXT,
    options: [{ label: "", value: "" }],
    placeholder: "",
    order: 0
  });
};

const handleCreateCustomField = async (e: FormEvent) => {
  e.preventDefault();
  setCreateFieldLoading(true);
  
  try {
    
    if (formData.type === CUSTOM_FIELD_TYPE.SELECT) {
      const validOptions = formData.options.filter(opt => opt.label && opt.value);
      if (validOptions.length === 0) {
        toast.error("Please add at least one valid option for select field");
        setCreateFieldLoading(false);
        return;
      }
      formData.options = validOptions;
    }

    const new_payload = {
      ...formData,
      "module":  FORM_FIELD_MODULE.LEAD
    }

    const result = await CustomFormService.create(new_payload);
    
    if (result.status === 201) {
      toast.success("Custom field created successfully");
      setCreateFieldPopup(false);
      resetFormData();
      await getCustomFormFields(); 
    }
  } catch (error) {
    process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    if (axios.isAxiosError(error)) {
      const messages = extractErrorMessages(error);
      toast.error(`${messages}`);
    } else {
      toast.error("Failed to create custom field");
    }
  } finally {
    setCreateFieldLoading(false);
  }
};

// Reset form data


  const getAllFields = (): CustomField[] => {
    return [...allFormFiled, ...allCustomFormFiled];
  }


  const getSelectedFields = (): CustomField[] => {
    const allFields = getAllFields();
    return selectedFieldsIds
      .map(id => allFields.find(field => field.id === id))
      .filter(Boolean) as CustomField[];
  }

  const renderFormField = (item: CustomField, index: number) => {
    if (item.type === "text" || item.type === "email" || item.type === "number") {
      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 8 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <Input
            name={item.key}
            type={item.type}
            label={item.name}
            placeholder={item.placeholder ?? ""}
            required={item.required}
          />
        </motion.div>
      );
    }

    if (item.type === "select") {
      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 8 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <Select
            name={item.key}
            label={item.name}
            options={item.options ?? []}
            placeholder={item.placeholder ?? "Select"}
            required={item.required}
          />
        </motion.div>
      );
    }

    return null;
  };


  const handleUpdateFieldPopup = ()=>{
    setCreateFieldPopup(true)

  }

  const handleFieldDelete = async(id:string)=>{
    try {
      const confirm = await ConfirmPopup({title: "Are you sure", text: "Are you sure to delete the field, It is going permanently deleted", btnTxt: "Yes, Delete"})

      if (!confirm) return;
      
      const result = await CustomFormService.delete(id)
      if (result.status === 200){
        toast.success("Field deleted successfully")
        await getCustomFormFields()
      }

      
      
    } catch (error) {
       process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    if (axios.isAxiosError(error)) {
      const messages = extractErrorMessages(error);
      toast.error(`${messages}`);
    } else {
      toast.error("Failed to create custom field");
    }
    }
  }

  return (
    <>
    {createFieldPopup && (
  <>
    <BlurryBackground onClick={() => setCreateFieldPopup(false)} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-1150"
    >

      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <FaPlus className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("create_custom_field")}
          </h2>
        </div>
        <button
          onClick={() => setCreateFieldPopup(false)}
          className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <IoMdClose className="text-xl text-gray-500 dark:text-gray-400" />
        </button>
      </div>


      <form onSubmit={handleCreateCustomField} className="p-6">
        <div className="grid grid-cols-2 gap-5">

          <div className="col-span-2">
            <Input
              label={t("field_name_2")}
              name="name"
              type="text"
              placeholder={t("enter_field_name")}
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>


          <div>
            <Select
              label={t("field_type")}
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={[
                { label: "Text", value: CUSTOM_FIELD_TYPE.TEXT },
                { label: "Number", value: CUSTOM_FIELD_TYPE.NUMBER },
                { label: "Email", value: CUSTOM_FIELD_TYPE.EMAIL },
                { label: "Phone", value: CUSTOM_FIELD_TYPE.PHONE },
                { label: "Select", value: CUSTOM_FIELD_TYPE.SELECT },
                { label: "Textarea", value: CUSTOM_FIELD_TYPE.TEXTAREA },
                { label: "Date", value: CUSTOM_FIELD_TYPE.DATE },
                // { label: "Checkbox", value: CUSTOM_FIELD_TYPE.CHECKBOX },
              ]}
              required
            />
          </div>

 
          <div>
            <Input
              label={t("display_order")}
              name="order"
              type="number"
              placeholder="0"
              value={formData.order}
              onChange={handleChange}
              required
            />
          </div>

          {/* Placeholder */}
          {formData.type !== CUSTOM_FIELD_TYPE.CHECKBOX && (
            <div className="col-span-2">
              <Input
                label={t("placeholder")}
                name="placeholder"
                type="text"
                placeholder={t("enter_placeholder_text")}
                value={formData.placeholder}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Options for Select Type */}
          {formData.type === CUSTOM_FIELD_TYPE.SELECT && (
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  <span className="text-red-500 text-xl">*</span> {t("options")}
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                >
                  <FaPlus className="text-xs" /> {t("add_option")}
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Input
                        label={`Option ${index + 1} Label`}
                        type="text"
                        placeholder={t("display_text")}
                        value={option.label}
                        onChange={(e) =>
                          handleOptionChange(index, "label", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label={t("value")}
                        type="text"
                        placeholder={t("internal_value")}
                        value={option.value}
                        onChange={(e) =>
                          handleOptionChange(index, "value", e.target.value)
                        }
                        required
                      />
                    </div>
                    {formData.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="h-10 w-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors mb-1"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setCreateFieldPopup(false)}
            className="px-5 py-2.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={createFieldLoading}
            className="px-5 py-2.5 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {createFieldLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("creating_2")}
              </>
            ) : (
              <>
                <FaPlus className="text-sm" />
                {t("create_field")}
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  </>
)}
    <div className="fixed min-h-screen overflow-y-scroll custom-scrollbar z-100 top-0 left-0 right-0 border-0 w-full h-full bg-stone-100 dark:bg-gray-800">
      <div className="fixed z-100 left-0 top-0 w-88 border-r flex flex-col gap-6 border-slate-900/15 dark:border-gray-700 bg-slate-50 h-screen overflow-y-scroll custom-scrollbar dark:bg-gray-800/50 pt-12 px-6 pb-12">
        <div className="flex items-center gap-4 w-full border-b border-slate-600 py-4">
          <MdOutlineFormatIndentIncrease className="text-cyan-500" />
          <h2 className="text-slate-900 dark:text-white font-semibold text-lg tracking-wide">
            {t("all_form_fields")}
          </h2>
        </div>
        
        {/* System Form Fields */}
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t("system_fields")}</h3>
        <ul className="flex flex-col gap-3 px-4 py-2.5">
          {!fieldDataLoading
            ? allFormFiled &&
              allFormFiled.length > 0 &&
              allFormFiled.map((item) => {
                const checked = selectedFieldsIds.includes(item.id);
                
                return (
                  <li key={item.id} className="flex items-center gap-3">
  <label
    htmlFor={item.key}
    className="flex items-center gap-3 cursor-pointer group"
  >
    <input
      type="checkbox"
      id={item.key}
      name={item.name}
      value={item.id}
      checked={checked}
      onChange={handleChecked}
      className="peer sr-only"
    />

    <div
      className="
        w-5 h-5
        rounded-md
        border-2 border-slate-300 dark:border-slate-600
        bg-white dark:bg-slate-700
        flex items-center justify-center
        transition-all duration-200
        peer-checked:bg-cyan-600
        peer-checked:border-cyan-600
      "
    >
     {checked && <FaCheck className="text-white text-[10px]" />}
    </div>

    <span
      className="
        capitalize
        text-slate-700 dark:text-slate-300
        transition-all duration-200
        peer-checked:text-cyan-600
        dark:peer-checked:text-cyan-300
        group-hover:text-cyan-600
      "
    >
      {item.name}
    </span>
  </label>
</li>
                );
              })
            : Array.from({ length: 18 }).map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton
                    height={15}
                    width={15}
                    borderRadius={6}
                    className="animate-pulse"
                  />
                  <Skeleton
                    height={16}
                    width={100}
                    borderRadius={6}
                    className="animate-pulse"
                  />
                </div>
              ))}
        </ul>


        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t("custom_fields")}</h3>
        <ul className="flex flex-col gap-3 px-4 py-2.5">
          {!cuFieldDataLoading
            ? allCustomFormFiled &&
              allCustomFormFiled.length > 0 &&
              allCustomFormFiled.map((item) => {
                const checked = selectedFieldsIds.includes(item.id);
                
                return (
                        <li key={item.id} className="flex items-center gap-3 group justify-between">
                          <label
                            htmlFor={item.key}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              id={item.key}
                              name={item.name}
                              value={item.id}
                              checked={checked}
                              onChange={handleChecked}
                              className="peer sr-only"
                            />

                            <div
                              className="
                                w-5 h-5
                                rounded-md
                                border-2 border-slate-300 dark:border-slate-600
                                bg-white dark:bg-slate-700
                                flex items-center justify-center
                                transition-all duration-200
                                peer-checked:bg-cyan-600
                                peer-checked:border-cyan-600
                              "
                            >
                            {checked && <FaCheck className="text-white text-[10px]" />}
                            </div>

                            <span
                              className="
                                capitalize
                                text-slate-700 dark:text-slate-300
                                transition-all duration-200
                                peer-checked:text-cyan-600
                                dark:peer-checked:text-cyan-300
                                group-hover:text-cyan-600
                              "
                            >
                              {item.name}
                            </span>
                          </label>
                          <button className="h-6 w-6 group-hover:flex rounded-full cursor-pointer bg-red-200/80 hidden items-center justify-center text-red-500 hover:bg-red-500 hover:text-white" onClick={()=>handleFieldDelete(item.id)}><MdDeleteOutline className="text-sm"/></button>
                        </li>
                 
                );
              })
            : Array.from({ length: 4 }).map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton
                    height={15}
                    width={15}
                    borderRadius={6}
                    className="animate-pulse"
                  />
                  <Skeleton
                    height={16}
                    width={100}
                    borderRadius={6}
                    className="animate-pulse"
                  />
                </div>
              ))}
        </ul>
        
        <button className="flex items-center group hover:bg-cyan-600 gap-3 capitalize border-2 border-gray-300 dark:border-gray-800 hover:border-cyan-600 rounded-md px-4 py-2.5 bg-white dark:bg-slate-700 w-full hover:text-white cursor-pointer" onClick={handleUpdateFieldPopup}>
          <FaPlus className="text-cyan-500 group-hover:text-white group-hover:rotate-90 transition-all"/> 
          {t("add_custom_fields")}
        </button>
      </div>

      <div className="fixed top-4 z-50 left-96 w-[72vw] backdrop-blur-sm flex items-center justify-between gap-10 p-5">
        <div className="flex items-center gap-3 w-1/2">
          <GrDocumentUpdate className="text-xl text-cyan-500" />
          <h2 className="text-slate-900 dark:text-white font-semibold text-2xl tracking-wide">
            {t("update_lead_form_field")}
          </h2>
        </div>
        <div className="flex items-center justify-end gap-3 ml-6">
          <button 
            onClick={()=>router.back()} 
            className="h-10 w-10 flex items-center justify-center text-xl border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-cyan-600 hover:border-cyan-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"
          >
            <FaArrowLeftLong className="group-hover:scale-105 transition-all"/>
          </button>
          <button 
            onClick={()=>router.forward()} 
            className="h-10 w-10 flex items-center justify-center text-xl border rounded-full dark:bg-[#1a2432] bg-slate-50 hover:text-cyan-600 hover:border-cyan-600/20 group border-[#ecf0f2] dark:border-gray-700 cursor-pointer hover:scale-103"
          >
            <FaArrowRightLong className="group-hover:scale-105 transition-all"/>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="ml-92 relative mt-18 flex flex-col gap-3 p-8">
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg grid grid-cols-2 gap-5">
          {!isLoading ? (
            selectedFieldsIds.length === 0 ? (
              <div className="flex items-center flex-col justify-center col-span-2 py-5">
                <Image src={"/images/Cry.gif"} alt={t("cry_img")} height={200} width={200} />
                <p>{t("no_form_fields_found_please_select")}</p>
              </div>
            ) : (
              getSelectedFields().map((item, index) => renderFormField(item, index))
            )
          ) : (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
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
          
          <div className="flex items-center gap-5 justify-end col-span-2">
            <button 
              onClick={handleSubmit} 
              className="w-fit flex items-center justify-center gap-2 rounded-md px-4 py-2 font-medium text-nowrap bg-cyan-600 text-white hover:bg-cyan-700 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 capitalize" 
              disabled={loading || (selectedFieldsIds.length <= 0)}
            >
              <MdOutlineCloudUpload className="text-lg" /> 
              {loading ? "Updating..." : "Update fields"}
            </button>

            <button 
              className="w-fit flex items-center justify-center gap-2 rounded-md px-4 py-2 font-medium bg-cyan-200 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-300 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200" 
              onClick={()=>router.back()}
            >
              <IoChevronBack /> {t("back")}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default page;