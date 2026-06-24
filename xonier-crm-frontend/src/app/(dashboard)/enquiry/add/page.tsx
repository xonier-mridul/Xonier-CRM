"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { useState, useEffect, JSX, FormEvent, useRef } from "react";
import {
  PRIORITY,
  PROJECT_TYPES,
  SOURCE,
  DESIGNATION,
  NUMBER_OF_EMPLOYEES,
  INFO_TYPE,
} from "@/src/constants/enum";
import { User } from "@/src/types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { EnquiryService } from "@/src/services/enquiry.service";
import { useRouter } from "next/navigation";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { FaCheck } from "react-icons/fa";

// ── Shared styles ──────────────────────────────────────────────────────────
const selectClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-teal-400/20
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const textareaClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-teal-400/20
  placeholder-gray-400 dark:placeholder-gray-500 resize-none
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const inlineInputClass = `
  px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white text-sm
  border-gray-200 dark:border-gray-700
  focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-400/20
  placeholder-gray-400
`;

// ── Tag Input ──────────────────────────────────────────────────────────────
const TagInput = ({
  label,
  values,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  const [input, setInput] = useState("");

  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
  };

  const removeTag = (idx: number) =>
    onChange(values.filter((_, i) => i !== idx));





  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
        {label}
        {required && <span className="text-violet-500">*</span>}
      </label>
      <div
        className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          focus-within:outline-none focus-within:border-cyan-400 dark:focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-teal-400/20
           min-h-[44px] transition-all duration-200"
      >
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs px-2.5 py-1 rounded-full font-medium border border-violet-200 dark:border-violet-700"
          >
            {v}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:text-red-500 font-bold leading-none ml-0.5 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] px-1 py-0.5 text-sm bg-transparent outline-none text-black dark:text-white placeholder-gray-400"
          value={input}
          placeholder={placeholder ?? "Type and press Enter"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            } else if (e.key === "Backspace" && !input && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => input.trim() && addTag(input)}
        />
      </div>
    </div>
  );
};

// ── Extra Field Row ────────────────────────────────────────────────────────
const ExtraFieldRow = ({
  label,
  value,
  onLabelChange,
  onValueChange,
  onRemove,
}: {
  label: string;
  value: string;
  onLabelChange: (v: string) => void;
  onValueChange: (v: string) => void;
  onRemove: () => void;
}) => (
  <div className="flex gap-2 items-center">
    <input
      placeholder="Label"
      maxLength={100}
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      className={`flex-1 ${inlineInputClass}`}
    />
    <input
      placeholder="Value"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex-1 ${inlineInputClass}`}
    />
    <button
      type="button"
      onClick={onRemove}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-lg font-bold"
    >
      ×
    </button>
  </div>
);

// ── Other Social Row ───────────────────────────────────────────────────────
const OtherSocialRow = ({
  platform,
  url,
  onPlatformChange,
  onUrlChange,
  onRemove,
}: {
  platform: string;
  url: string;
  onPlatformChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onRemove: () => void;
}) => (
  <div className="flex gap-2 items-center">
    <input
      placeholder="Platform"
      value={platform}
      onChange={(e) => onPlatformChange(e.target.value)}
      className={`w-1/3 ${inlineInputClass}`}
    />
    <input
      placeholder="https://"
      type="url"
      value={url}
      onChange={(e) => onUrlChange(e.target.value)}
      className={`flex-1 ${inlineInputClass}`}
    />
    <button
      type="button"
      onClick={onRemove}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-lg font-bold"
    >
      ×
    </button>
  </div>
);

// ── Section Heading ────────────────────────────────────────────────────────
const SectionHeading = ({ title, icon }: { title: string; icon?: string }) => (
  <div className="col-span-1 md:col-span-2 mt-4">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-base">{icon}</span>}
      <h3 className="text-xs font-bold bg-linear-to-br bg-clip-text text-transparent from-[#16c2cf] to-[#0fb8a5]    uppercase tracking-widest">
        {title}
      </h3>
    </div>
    <div className="h-px bg-gradient-to-r from-[#16c2cf] via-[#0fb8a5] to-transparent dark:from-cyan-400 dark:via-teal-900 dark:to-transparent" />
  </div>
);

// ── Field Label ────────────────────────────────────────────────────────────
const FieldLabel = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
    {children}
    {required && <span className="text-teal-600">*</span>}
  </label>
);

// ── Page ───────────────────────────────────────────────────────────────────
const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string | null>();
  const [usersData, setUsersData] = useState<User[]>([]);
  const [searchVal,setSearchVal]= useState('')
   const [openDropDown,setOpenDropDown] = useState(false)
   const [selectedUser, setSelectedUser] = useState(null);

 

   

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    designation: DESIGNATION.OTHER,
    infoType: INFO_TYPE.PEOPLE,
    priority: "" as PRIORITY | "",
    projectType: "" as PROJECT_TYPES | "",
    source: "" as SOURCE | "",
    message: "",
    assignTo: "",
    location: { country: "", state: "", city: "", zipcode: "" },
    numberOfEmployees: "" as NUMBER_OF_EMPLOYEES | "",
    industry: [] as string[],
    technologies: [] as string[],
    keywords: [] as string[],
    socialLinks: {
      linkedin: "",
      twitter: "",
      github: "",
      facebook: "",
      instagram: "",
      youtube: "",
      website: "",
      other: [] as { platform: string; url: string }[],
    },
    extra_fields: [] as { label: string; value: string }[],
  });

   

  const router = useRouter();

  // const getUsers = async () => {
  //   try {
  //     const result = await AuthService.getAllActiveWithoutPagination();
  //     if (result.status === 200) setUsersData(result.data.data);
  //   } catch (error) {
  //     process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
  //     if (axios.isAxiosError(error)) {
  //       const messages = extractErrorMessages(error);
  //       setErr(messages);
  //       toast.error(`${messages}`);
  //     } else {
  //       setErr(["Something went wrong"]);
  //     }
  //   }
  // };

   const handleSearch =(e:React.ChangeEvent<HTMLInputElement>)=>{
    setSearchVal(e.target.value)
  }

  const fetchUsers = async(search)=>{
    
    try{
      const result = await AuthService.getAllTeamUsers({
        search
      })
      if(result.status == 200){
       setUsersData(result.data.data)
      }
    }catch(error){
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
  // const filteredUser = usersData?.filter((user)=>
  // `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchVal.toLowerCase()))

  const searchRef = useRef(null)

  useEffect(() => {

    const handleOutClick = (e:MouseEvent)=>{
      if(searchRef.current && !searchRef.current.contains(e.target as Node)){
        setOpenDropDown(false)
      }
    }

    document.addEventListener("mousedown",handleOutClick)

  return ()=>{
    document.removeEventListener("mousedown",handleOutClick)
  }



  }, []);

  useEffect(() => {
    
  const timer = setTimeout(() => {
    fetchUsers(searchVal);
  }, 300); 

  return () => clearTimeout(timer);
}, [searchVal]);

  const set = (key: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setLocation = (key: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, [key]: value },
    }));

  const setSocialLink = (key: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));

 

  const addOtherSocial = () =>
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        other: [...prev.socialLinks.other, { platform: "", url: "" }],
      },
    }));

    const setAssignTo = (key: string) =>
  setFormData((prev) => ({
    ...prev,
    assignTo: key,
  }));

  const updateOtherSocial = (
    idx: number,
    field: "platform" | "url",
    value: string
  ) =>
    setFormData((prev) => {
      const updated = [...prev.socialLinks.other];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, socialLinks: { ...prev.socialLinks, other: updated } };
    });

  const removeOtherSocial = (idx: number) =>
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        other: prev.socialLinks.other.filter((_, i) => i !== idx),
      },
    }));

  const addExtraField = () =>
    setFormData((prev) => ({
      ...prev,
      extra_fields: [...prev.extra_fields, { label: "", value: "" }],
    }));

  const updateExtraField = (
    idx: number,
    field: "label" | "value",
    value: string
  ) =>
    setFormData((prev) => {
      const updated = [...prev.extra_fields];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, extra_fields: updated };
    });

  const removeExtraField = (idx: number) =>
    setFormData((prev) => ({
      ...prev,
      extra_fields: prev.extra_fields.filter((_, i) => i !== idx),
    }));

  const buildPayload = () => {
    const nullIfEmpty = (v: string) => v.trim() || null;
    const nullIfEmptyArr = (arr: string[]) => (arr.length ? arr : null);

    const socialLinks = {
      linkedin: nullIfEmpty(formData.socialLinks.linkedin),
      twitter: nullIfEmpty(formData.socialLinks.twitter),
      github: nullIfEmpty(formData.socialLinks.github),
      facebook: nullIfEmpty(formData.socialLinks.facebook),
      instagram: nullIfEmpty(formData.socialLinks.instagram),
      youtube: nullIfEmpty(formData.socialLinks.youtube),
      website: nullIfEmpty(formData.socialLinks.website),
      other: formData.socialLinks.other.length
        ? formData.socialLinks.other.filter((o) => o.platform && o.url)
        : null,
    };

    const hasSocialLinks = Object.values(socialLinks).some((v) => v !== null);

    return {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          companyName: nullIfEmpty(formData.companyName),
          designation: formData.designation,
          infoType: formData.infoType,
          socialLinks: hasSocialLinks ? socialLinks : null,
          location: {
            country: nullIfEmpty(formData.location.country),
            state: nullIfEmpty(formData.location.state),
            city: nullIfEmpty(formData.location.city),
            zipcode: nullIfEmpty(formData.location.zipcode),
          },
          numberOfEmployees: nullIfEmpty(formData.numberOfEmployees) || null,
          industry: formData.industry,
          technologies: nullIfEmptyArr(formData.technologies),
          keywords: nullIfEmptyArr(formData.keywords),
          projectType: formData.projectType as PROJECT_TYPES,
          priority: formData.priority as PRIORITY,
          source: formData.source as SOURCE,
          assignTo: nullIfEmpty(formData.assignTo),
          message: nullIfEmpty(formData.message),
          extra_fields: formData.extra_fields.length
            ? formData.extra_fields.filter((f) => f.label)
            : null,       
    };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);
    try {
      const payload = buildPayload();
      const result = await EnquiryService.create(payload);
      if (result.status === 201) {
        toast.success(`${formData.fullName}'s Enquiry registered successfully`);
        router.push("/enquiry");
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
  



  return (
    <div className="ml-72 mt-14 p-6">
      {/* ── Card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* ── Card Header ── */}
        <div className="bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700 px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-lg shadow-inner">
              📋
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Create Enquiry
              </h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                Fill in the details below to register a new enquiry
              </p>
            </div>
          </div>
        </div>

        {/* ── Form Body ── */}
        <div className="p-8">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
          >
            {/* ── BASIC INFO ───────────────────────────────────────────── */}
            <SectionHeading title="Basic Information" icon="👤" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Full Name</FieldLabel>
              <Input
                placeholder="Enter full name"
                required
                value={formData.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Email</FieldLabel>
              <Input
                type="email"
                placeholder="Enter email address"
                required
                value={formData.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Phone</FieldLabel>
              <Input
                placeholder="+919876543210"
                required
                value={formData.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            {/* Company Name — mandatory */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Company Name</FieldLabel>
              <Input
                placeholder="Enter company name"
                required
                value={formData.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </div>

            {/* Info Type — after company name */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Info Type</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.infoType}
                onChange={(e) => set("infoType", e.target.value as INFO_TYPE)}
              >
                {Object.values(INFO_TYPE).map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation — after info type */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Designation</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.designation}
                onChange={(e) =>
                  set("designation", e.target.value as DESIGNATION)
                }
              >
                {Object.values(DESIGNATION).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* ── LOCATION ─────────────────────────────────────────────── */}
            <SectionHeading title="Location" icon="📍" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Country</FieldLabel>
              <Input
                placeholder="e.g. India"
                value={formData.location.country}
                onChange={(e) => setLocation("country", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>State</FieldLabel>
              <Input
                placeholder="e.g. Delhi"
                value={formData.location.state}
                onChange={(e) => setLocation("state", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>City</FieldLabel>
              <Input
                placeholder="e.g. New Delhi"
                value={formData.location.city}
                onChange={(e) => setLocation("city", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Zipcode</FieldLabel>
              <Input
                placeholder="e.g. 110001"
                value={formData.location.zipcode}
                onChange={(e) => setLocation("zipcode", e.target.value)}
              />
            </div>

            {/* ── COMPANY INFO ─────────────────────────────────────────── */}
            <SectionHeading title="Company Information" icon="🏢" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Number of Employees</FieldLabel>
              <select
                className={selectClass(!!err)}
                value={formData.numberOfEmployees}
                onChange={(e) =>
                  set(
                    "numberOfEmployees",
                    e.target.value as NUMBER_OF_EMPLOYEES | ""
                  )
                }
              >
                <option value="">Select range</option>
                {[...new Set(Object.values(NUMBER_OF_EMPLOYEES))].map((n, i) => (
                  <option key={`${n}-${i}`} value={n}>
                    {n}
                  </option>
                ))}
                
              </select>
            </div>

            {/* spacer */}
            <div className="hidden md:block" />

            <div className="col-span-1 md:col-span-2">
              <TagInput
                label="Industry"
                values={formData.industry}
                onChange={(vals) => set("industry", vals)}
                placeholder="Type industry and press Enter"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <TagInput
                label="Technologies"
                values={formData.technologies}
                onChange={(vals) => set("technologies", vals)}
                placeholder="e.g. React, Node.js — press Enter to add"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <TagInput
                label="Keywords"
                values={formData.keywords}
                onChange={(vals) => set("keywords", vals)}
                placeholder="Add keywords and press Enter"
              />
            </div>

            {/* ── ENQUIRY DETAILS ──────────────────────────────────────── */}
            <SectionHeading title="Enquiry Details" icon="📝" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Priority</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.priority}
                onChange={(e) => set("priority", e.target.value as PRIORITY)}
              >
                <option value="">Select priority</option>
                {Object.values(PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Project Type</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.projectType}
                onChange={(e) =>
                  set("projectType", e.target.value as PROJECT_TYPES)
                }
              >
                <option value="">Select project type</option>
                {Object.values(PROJECT_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Source</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.source}
                onChange={(e) => set("source", e.target.value as SOURCE)}
              >
                <option value="">Select source</option>
                {Object.values(SOURCE).map((src) => (
                  <option key={src} value={src}>
                    {src.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Assign To</FieldLabel>
              {/* <select 
                className={selectClass(!!err)}
                value={formData.assignTo}
                onChange={(e) => set("assignTo", e.target.value)}
              >
                <option value="">Unassigned</option>
                {usersData?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select> */}
             <div ref={searchRef} className="relative w-full">
                  <button
                  
                    onClick={(e) =>{
                      e.preventDefault()
                      setOpenDropDown(!openDropDown)
                    }}
                    className=" w-full px-3 py-2 capitalize rounded-lg border transition-all duration-200
                          bg-white dark:bg-gray-800 text-black dark:text-white
                          border-gray-200 dark:border-gray-700
                          disabled:opacity-60 disabled:cursor-not-allowed
                          focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-teal-400/20 flex items-center justify-between text-[15px] "
                  >
                    <span>
                    {selectedUser
                      ? `${selectedUser.firstName} ${selectedUser.lastName}`
                      : "Unassigned"}
                      </span>
                      
                      <MdOutlineKeyboardArrowDown  className="text-gray-600 dark:text-white text-xl"/>

                  </button>

                  {openDropDown && (
                    <div className="absolute p-2 top-full left-0 mt-1 dark:border-gray-700 dark:bg-gray-700  bg-stone-50 w-full border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                      <div className="flex gap-2 mb-2 border dark:bg-slate-600 border-slate-200 dark:border-slate-500 w-full items-center dark:text-white/60 bg-white rounded-lg px-2">
                        <CiSearch  className="text-slate-400  text-2xl"/>

                      <input placeholder="Search user..."
                      value={searchVal} 
                      onChange={handleSearch}
                      className="outline-none p-2 w-full  text-slate-500 dark:text-white/60"/>
                      </div>

                      <div
                        className="px-4 py-2 cursor-pointer text-slate-600 dark:hover:slate-400  rounded-lg hover:bg-stone-100 dark:hover:bg-slate-600 dark:text-white/60"
                        onClick={() => {
                          setAssignTo('');
                          setSelectedUser(null);
                          setOpenDropDown(false);
                        }}
                      >
                        Unassigned
                      </div>

                      {/* {usersData?.map((i) => (
                        <div
                          key={i.id}
                          className="px-4 py-2 rounded-lg cursor-pointer capitalize hover:bg-gray-100"
                          onClick={() => {
                            setAssignTo(i.id);
                            setSelectedUser(i);
                            setOpenDropDown(false);
                          }}
                        >
                          {i.firstName} {i.lastName}
                        </div>
                      ))} */}
                      {
                      usersData?.length ? (
                      usersData.map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-2 rounded-lg cursor-pointer text-slate-600 capitalize  dark:hover:bg-slate-600 hover:bg-stone-100 flex justify-between items-center"
                          onClick={() => {
                            setAssignTo(user.id);
                            setSelectedUser(user);
                            setOpenDropDown(false);
                          }}
                        >
                          <span className="dark:text-white/60">
                            {user.firstName} {user.lastName}
                          </span>

                          {selectedUser?.id === user.id && (
                            <FaCheck className="text-green-500 text-sm" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No users found
                      </div>
                    )}
                    </div>
                  )}
              </div>
                  
              </div>
          

            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <FieldLabel>Message</FieldLabel>
              <textarea
                rows={4}
                placeholder="Describe the enquiry..."
                className={textareaClass(!!err)}
                value={formData.message}
                onChange={(e) => set("message", e.target.value)}
              />
            </div>

            {/* ── SOCIAL LINKS ─────────────────────────────────────────── */}
            <SectionHeading title="Social Links" icon="🔗" />

            {(
              [
                ["linkedin", "LinkedIn"],
                ["twitter", "Twitter / X"],
                ["github", "GitHub"],
                ["facebook", "Facebook"],
                ["instagram", "Instagram"],
                ["youtube", "YouTube"],
                ["website", "Website"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <FieldLabel>{label}</FieldLabel>
                <Input
                  type="url"
                  placeholder="https://"
                  value={formData.socialLinks[key]}
                  onChange={(e) => setSocialLink(key, e.target.value)}
                />
              </div>
            ))}

            {/* Other social links */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Other Social Links</FieldLabel>
                <button
                  type="button"
                  onClick={addOtherSocial}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 transition-all"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {formData.socialLinks.other.map((o, i) => (
                  <OtherSocialRow
                    key={i}
                    platform={o.platform}
                    url={o.url}
                    onPlatformChange={(v) => updateOtherSocial(i, "platform", v)}
                    onUrlChange={(v) => updateOtherSocial(i, "url", v)}
                    onRemove={() => removeOtherSocial(i)}
                  />
                ))}
                {!formData.socialLinks.other.length && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    No additional social links added.
                  </p>
                )}
              </div>
            </div>

            {/* ── EXTRA FIELDS ─────────────────────────────────────────── */}
            <SectionHeading title="Extra Fields" icon="✨" />

            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Custom Fields</FieldLabel>
                <button
                  type="button"
                  onClick={addExtraField}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 transition-all"
                >
                  + Add Field
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {formData.extra_fields.map((f, i) => (
                  <ExtraFieldRow
                    key={i}
                    label={f.label}
                    value={f.value}
                    onLabelChange={(v) => updateExtraField(i, "label", v)}
                    onValueChange={(v) => updateExtraField(i, "value", v)}
                    onRemove={() => removeExtraField(i)}
                  />
                ))}
                {!formData.extra_fields.length && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    No custom fields added.
                  </p>
                )}
              </div>
            </div>

            {/* ── ERROR ────────────────────────────────────────────────── */}
            {err && (
              <div className="col-span-1 md:col-span-2">
                <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <span className="mt-0.5 text-base">⚠️</span>
                  <div>
                    {Array.isArray(err) ? (
                      <ul className="list-disc pl-4 space-y-0.5">
                        {err.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      err
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <div className="col-span-1 md:col-span-2 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Fields marked{" "}
                <span className="text-violet-500 font-bold">*</span> are
                required
              </p>
              <FormButton isLoading={isLoading} type="submit">
                Create Enquiry
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default page;