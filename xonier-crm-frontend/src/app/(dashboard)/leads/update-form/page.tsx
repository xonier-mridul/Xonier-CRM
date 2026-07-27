"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { FormFieldService } from "@/src/services/formField.service";
import { UserFormService } from "@/src/services/userForm.service";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import React, { JSX, useState, useEffect, FormEvent, ChangeEvent, MouseEvent, useRef } from "react";
import { toast } from "react-toastify";
import { MdOutlineFormatIndentIncrease, MdDeleteOutline, MdDragIndicator } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { GrDocumentUpdate } from "react-icons/gr";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { MdOutlineCloudUpload, MdSearch } from "react-icons/md";
import { useRouter } from "next/navigation";
import { IoChevronBack, IoLanguage } from "react-icons/io5";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeftLong, FaArrowRightLong, FaPlus } from "react-icons/fa6";
import ThemeToggle from "@/src/components/common/ThemeToggle";
import { CUSTOM_FIELD_TYPE, FORM_FIELD_MODULE } from "@/src/constants/enum";
import CustomFormService from "@/src/services/customForm.service";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { CreateUserCustomField } from "@/src/types/customForm.types";
import { IoMdClose } from "react-icons/io";
import { FaCheck, FaTrash } from "react-icons/fa";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/src/components/common/LanguageSelector";
import { 
  HiOutlineTag, 
  HiOutlineMail, 
  HiOutlinePhone, 
  HiOutlineHashtag,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineViewList
} from "react-icons/hi";

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
  const [requiredIds, setRequiredIds] = useState<CustomField[]>([]);
  const [selectedFieldsIds, setSelectedFieldsIds] = useState<string[]>([]);
  const [createFieldPopup, setCreateFieldPopup] = useState<boolean>(false);
  const [createFieldLoading, setCreateFieldLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
const [deletePopupOpen, setDeletePopupOpen] = useState<boolean>(false);


  const [formData, setFormData] = useState<CreateUserCustomField>({
    name: "",
    type: CUSTOM_FIELD_TYPE.TEXT,
    options: [{ label: "", value: "" }],
    placeholder: "",
    order: 0
  });


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

  const router = useRouter();

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        const selectedFields: CustomField[] = result.data.data.selectedFormFields ?? [];
        const selectedFieldsIds = selectedFields.map(item => item.id);
        const required = selectedFields.filter((item) => item.required === true || item.id === "6974a52d515f3aec8648561a");
        setUserFormData(result.data.data);
        setUserFormField(selectedFields);
        setSelectedFieldsIds(prev => [
          ...new Set([...prev, ...selectedFieldsIds])
        ]);
        setRequiredIds(required);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr([t("something_went_wrong")]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomFormFields = async (): Promise<void> => {
    setCuFieldDataLoading(true);
    try {
      const result = await CustomFormService.getAllByCreator();
      if (result.status === 200) {
        const data = result.data.data;
        console.log('form data :', data);
        setAllCustomFormField(data);
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
        setErr([t("something_went_wrong")]);
      }
    } finally {
      setCuFieldDataLoading(false);
    }
  };

  const getAllFieldsData = async (): Promise<void> => {
    setFieldDataLoading(true);
       setDeletePopupOpen(true); // Show blur background
    try {
      const result = await FormFieldService.getLeadsAll();
      if (result.status === 200) {
        const req: string[] = [];
        result.data.data.forEach((item: any, i: number) => {
          if (item.required === true) {
            req.push(item.id);
          }
          if (item.id === "6974a52d515f3aec8648561a") {
            req.push(item.id);
            result.data.data[i].required = true;
          }
        });
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
        setErr([t("something_went_wrong")]);
      }
    } finally {
      setFieldDataLoading(false);
       setDeletePopupOpen(false); 
    }
  };

  useEffect(() => {
    getFormFields();
    getAllFieldsData();
    getCustomFormFields();
  }, []);

  const handleChecked = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    if (checked) {
      setSelectedFieldsIds((prev) => ([...prev, value]));
    } else if (requiredIds.some((item) => item.id === value)) {
      toast.info(t("this_field_is_required"));
    } else {
      setSelectedFieldsIds((prev) => prev.filter(item => item != value));
    }
  };

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (userFormData && !userFormData.id) {
        toast.error(t("form_id_not_found"));
      }

      if (!userFormData) {
        const result = await UserFormService.create({
          "selectedFormFields": selectedFieldsIds,
          "module": FORM_FIELD_MODULE.LEAD
        });

        if (result.status === 201) {
          toast.success(t("form_field_created_successfully"));
          await getFormFields();
          return;
        }
      }

      const result = await UserFormService.update(userFormData?.id, {
        "selectedFormFields": selectedFieldsIds,
        "module": FORM_FIELD_MODULE.LEAD
      });

      if (result.status === 200) {
        toast.success(t("form_field_updated_successfully"));
        await getFormFields();

        router.push('/leads/add')
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr([t("something_went_wrong")]);
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
          toast.error(t("add_at_least_one_valid_option"));
          setCreateFieldLoading(false);
          return;
        }
        formData.options = validOptions;
      }

      const new_payload = {
        ...formData,
        "module": FORM_FIELD_MODULE.LEAD
      };

      const result = await CustomFormService.create(new_payload);

      if (result.status === 201) {
        toast.success(t("custom_field_created_successfully"));
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
        toast.error(t("failed_to_create_custom_field"));
      }
    } finally {
      setCreateFieldLoading(false);
    }
  };

  const getAllFields = (): CustomField[] => {
    return [...allFormFiled, ...allCustomFormFiled];
  };

  const getSelectedFields = (): CustomField[] => {
    const allFields = getAllFields();
    return selectedFieldsIds
      .map(id => allFields.find(field => field.id === id))
      .filter(Boolean) as CustomField[];
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
        return <HiOutlineTag className="w-4 h-4" />;
      case "email":
        return <HiOutlineMail className="w-4 h-4" />;
      case "phone":
        return <HiOutlinePhone className="w-4 h-4" />;
      case "number":
        return <HiOutlineHashtag className="w-4 h-4" />;
      case "date":
        return <HiOutlineCalendar className="w-4 h-4" />;
      case "textarea":
        return <HiOutlineDocumentText className="w-4 h-4" />;
      case "select":
        return <HiOutlineViewList className="w-4 h-4" />;
      default:
        return <HiOutlineTag className="w-4 h-4" />;
    }
  };

  const renderFormField = (item: CustomField, index: number) => {
    if (item.type === "text" || item.type === "email" || item.type === "number") {
      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <Select
            name={item.key}
            label={item.name}
            options={item.options ?? []}
            placeholder={item.placeholder ?? t("select")}
            required={item.required}
          />
        </motion.div>
      );
    }

    return null;
  };

  const handleUpdateFieldPopup = () => {
    setCreateFieldPopup(true);
  };

  const handleFieldDelete = async (id: string) => {
    try {
      const confirm = await ConfirmPopup({ 
        title: t("are_you_sure"), 
        text: t("delete_field_confirmation"), 
        btnTxt: t("yes_delete") 
      });
      if (!confirm) return;


      const result = await CustomFormService.delete(id);
      if (result.status === 200) {
        toast.success(t("field_deleted_successfully"));
        await getCustomFormFields();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error(t("failed_to_delete_field"));
      }
    }
  };

  // Filter fields based on search
  const filteredSystemFields = allFormFiled.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomFields = allCustomFormFiled.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Create Field Popup */}

<AnimatePresence>
  {createFieldPopup && (
    <>
      <BlurryBackground onClick={() => setCreateFieldPopup(false)} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed top-[5%] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-1150 border border-gray-200 dark:border-gray-700"
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <FaPlus className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("create_custom_field")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t("add_new_field_to_form")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateFieldPopup(false)}
            className="h-10 w-10 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 group"
          >
            <IoMdClose className="text-2xl text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="space-y-5">
              {/* Field Name */}
              <div>
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

              {/* Field Type and Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label={t("field_type")}
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    options={[
                      { label: t("text"), value: CUSTOM_FIELD_TYPE.TEXT },
                      { label: t("number"), value: CUSTOM_FIELD_TYPE.NUMBER },
                      { label: t("email"), value: CUSTOM_FIELD_TYPE.EMAIL },
                      { label: t("phone"), value: CUSTOM_FIELD_TYPE.PHONE },
                      { label: t("select"), value: CUSTOM_FIELD_TYPE.SELECT },
                      { label: t("textarea"), value: CUSTOM_FIELD_TYPE.TEXTAREA },
                      { label: t("date"), value: CUSTOM_FIELD_TYPE.DATE },
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
              </div>

              {/* Placeholder */}
              {formData.type !== CUSTOM_FIELD_TYPE.CHECKBOX && (
                <div>
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      {t("options")}
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddOption();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <FaPlus className="text-xs" /> {t("add_option")}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div
                        key={`option-${index}`}
                        className="flex items-end gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <Input
                            label={t("option_label", { number: index + 1 })}
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
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveOption(index);
                            }}
                            className="h-11 w-11 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 mb-0.5 flex-shrink-0"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions - Fixed */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={() => {
              setCreateFieldPopup(false);
              resetFormData();
            }}
            className="px-6 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleCreateCustomField}
            disabled={createFieldLoading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-600 text-white hover:from-cyan-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
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
      </motion.div>
    </>
  )}
</AnimatePresence>
{deletePopupOpen && <BlurryBackground onClick={() => {}} />}

      {/* Main Layout */}
      <div className="fixed min-h-screen overflow-y-scroll custom-scrollbar z-100 top-0 left-0 right-0 w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        
      {/* Left Sidebar - Field Selector */}
<div className="fixed z-100 left-0 top-0 w-80 shadow-lg flex flex-col border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-screen ">
  
  {/* Sidebar Header - Fixed */}
  <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
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
        {t("fields_selected", { count: selectedFieldsIds.length })}
      </span>
      <span className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium">
        {t("available_count", { count: filteredSystemFields.length + filteredCustomFields.length })}
      </span>
    </div>
  </div>

  {/* Scrollable Field List - Takes remaining space */}
  <div className="flex-1 overflow-y-auto custom-scrollbar">
    <div className="px-6 py-4">
      
      {/* System Fields Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {t("system_fields")}
          </h3>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>
        
        <div className="space-y-1.5 min-h-[200px]">
          {!fieldDataLoading ? (
            filteredSystemFields.length > 0 ? (
              filteredSystemFields.map((item) => {
                const checked = selectedFieldsIds.includes(item.id);
                const isRequired = requiredIds.some(req => req.id === item.id);
                
                return (
                  <div key={item.id}>
                    <label
                      htmlFor={item.key}
                      className={`
                        flex items-center gap-3 px-3 py-1.5 rounded-xl cursor-pointer
                        transition-all duration-200 group
                        ${checked 
                          ? 'bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-900/20 border-2 border-cyan-200 dark:border-cyan-800' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        id={item.key}
                        name={item.name}
                        value={item.id}
                        checked={checked}
                        onChange={handleChecked}
                        className="sr-only peer"
                      />

                      {/* Custom Checkbox */}
                      <div className={`
                        relative h-5 w-5 rounded-md flex items-center justify-center
                        transition-all duration-200 flex-shrink-0 outline-none
                        ${checked 
                          ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-md' 
                          : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 group-hover:border-cyan-400'
                        }
                      `}>
                        {checked && (
                          <FaCheck className="text-white text-[10px]" />
                        )}
                      </div>

                      {/* Field Icon */}
                      {/* <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${checked 
                          ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {getFieldIcon(item.type)}
                      </div> */}

                      {/* Field Info */}
                      <div className="flex-1 min-w-0 ">
                        <div className="flex items-center gap-2">
                          <span className={`
                            text-sm font-medium truncate capitalize
                            ${checked 
                              ? 'text-cyan-700 dark:text-cyan-300' 
                              : 'text-gray-700 dark:text-gray-300'
                            }
                          `}>
                            {t(item.name)}
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
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-3 py-3 flex items-center gap-3">
                <Skeleton height={20} width={20} borderRadius={6} className="flex-shrink-0" />
                <Skeleton height={32} width={32} borderRadius={8} className="flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton height={14} width={120} borderRadius={6} className="mb-1" />
                  <Skeleton height={10} width={60} borderRadius={6} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Custom Fields Section */}
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="h-1 w-1 rounded-full bg-emerald-500"></div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {t("custom_fields")}
          </h3>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>
        
        <div className="space-y-1.5 min-h-[100px]">
          {!cuFieldDataLoading ? (
            filteredCustomFields.length > 0 ? (
              filteredCustomFields.map((item) => {
                const checked = selectedFieldsIds.includes(item.id);
                
                return (
                  <div
                    key={item.id}
                    className="group/item relative"
                  >
                    <label
                      htmlFor={item.key}
                      className={`
                        flex items-center gap-3 px-3 py-1.5 rounded-xl cursor-pointer
                        transition-all duration-200
                        ${checked 
                          ? 'bg-gradient-to-r from-emerald-50  dark:from-emerald-900/20 dark:to-pink-900/20 border-2 border-emerald-200 dark:border-emerald-800' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        id={item.key}
                        name={item.name}
                        value={item.id}
                        checked={checked}
                        onChange={handleChecked}
                        className="sr-only peer"
                      />

                      {/* Custom Checkbox */}
                      <div className={`
                        relative h-5 w-5 rounded-md flex items-center justify-center 
                        transition-all duration-200 flex-shrink-0
                        ${checked 
                          ? 'bg-emerald-500 shadow-md' 
                          : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 group-hover/item:border-emerald-400'
                        }
                      `}>
                        {checked && (
                          <FaCheck className="text-white text-[10px]" />
                        )}
                      </div>

                      {/* Field Icon */}
                      {/* <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${checked 
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {getFieldIcon(item.type)}
                      </div> */}

                      {/* Field Info */}
                      <div className="flex-1 min-w-0">
                        <span className={`
                          text-sm font-medium truncate block capitalize
                          ${checked 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-gray-700 dark:text-gray-300'
                          }
                        `}>
                          {t(item.name)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {t(item.type)}
                        </span>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFieldDelete(item.id);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                      >
                        <MdDeleteOutline className="text-base" />
                      </button>
                    </label>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                {t("no_custom_fields_yet")}
              </div>
            )
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-3 flex items-center gap-3">
                <Skeleton height={20} width={20} borderRadius={6} className="flex-shrink-0" />
                <Skeleton height={32} width={32} borderRadius={8} className="flex-shrink-0" />
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
  </div>

  {/* Add Custom Field Button - Fixed at bottom */}
  <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
    <button
      type="button"
      onClick={handleUpdateFieldPopup}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-700 hover:to-cyan-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl group"
    >
      <FaPlus className="text-sm group-hover:rotate-90 transition-transform duration-200" />
      {t("add_custom_fields")}
    </button>
  </div>
</div>

        {/* Top Navigation Bar */}
        <div className="fixed top-0 z-50 left-90 right-5 backdrop-blur-md bg-white dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 rounded-b-2xl shadow-sm">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <GrDocumentUpdate className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight">
                  {t("update_lead_form_field")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("customize_lead_capture_form")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="h-11 w-11 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200 group"
              >
                <FaArrowLeftLong className="text-lg group-hover:-translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.forward()}
                className="h-11 w-11 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200 group"
              >
                <FaArrowRightLong className="text-lg group-hover:translate-x-1 transition-transform" />
              </button>
              <ThemeToggle />
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setIsOpen(!isOpen)}
                  className="h-11 w-11 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200"
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

        {/* Main Content Area - Form Preview */}
        <div className="ml-85 pt-24 px-8 pb-8">
          <div className="max-w-5xl mx-auto">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-cyan-100 dark:border-cyan-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-cyan-500 flex items-center justify-center">
                    <MdOutlineFormatIndentIncrease className="text-white text-2xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("total_fields")}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {allFormFiled.length + allCustomFormFiled.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50  dark:from-emerald-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <FaCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("selected")}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedFieldsIds.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-100 dark:border-orange-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center">
                    <FaPlus className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("custom_fields")}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {allCustomFormFiled.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Preview Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {t("form_preview")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("form_preview_description")}
                </p>
              </div>

              {/* Form Fields */}
              <div className="p-8">
                {!isLoading ? (
                  selectedFieldsIds.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center flex-col justify-center py-16"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-500 rounded-full blur-2xl opacity-20"></div>
                        <Image
                          src={"/images/Cry.gif"}
                          alt={t("cry_img")}
                          height={200}
                          width={200}
                          className="relative"
                        />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t("no_fields_selected")}
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                        {t("no_form_fields_found_please_select")}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 items-end ">
                      <AnimatePresence>
                        {getSelectedFields().map((item, index) => renderFormField(item, index))}
                      </AnimatePresence>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton height={18} width={120} borderRadius={8} />
                        <Skeleton height={44} borderRadius={12} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer - Actions */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-8 py-6 flex items-center justify-end gap-4">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 font-medium flex items-center gap-2"
                >
                  <IoChevronBack className="text-lg" />
                  {t("back")}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={loading || selectedFieldsIds.length <= 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-600 text-white hover:from-cyan-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("updating")}
                    </>
                  ) : (
                    <>
                      <MdOutlineCloudUpload className="text-xl" />
                      {t("update_fields")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;