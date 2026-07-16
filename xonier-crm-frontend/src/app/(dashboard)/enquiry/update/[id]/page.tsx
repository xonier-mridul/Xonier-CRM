"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import {
  PRIORITY,
  PROJECT_TYPES,
  SOURCE,
  DESIGNATION,
  NUMBER_OF_EMPLOYEES,
  INFO_TYPE,
} from "@/src/constants/enum";
import { AuthService } from "@/src/services/auth.service";
import { EnquiryService } from "@/src/services/enquiry.service";
import { User } from "@/src/types";
import axios from "axios";
import { ParamValue } from "next/dist/server/request/params";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useState, useEffect, FormEvent } from "react";
import { toast } from "react-toastify";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { useTranslation } from "react-i18next";

// ── Shared styles ──────────────────────────────────────────────────────────
const selectClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const textareaClass = (hasErr?: boolean) => `
  w-full px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white
  border-gray-200 dark:border-gray-700
  disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
  placeholder-gray-400 dark:placeholder-gray-500 resize-none
  ${hasErr ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}
`;

const inlineInputClass = `
  px-3 py-2 rounded-lg border transition-all duration-200
  bg-white dark:bg-gray-800 text-black dark:text-white text-sm
  border-gray-200 dark:border-gray-700
  focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20
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
        {required && <span className="text-cyan-500">*</span>}
      </label>
      <div
        className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 focus-within:border-cyan-400 dark:focus-within:border-cyan-500
          focus-within:ring-2 focus-within:ring-cyan-400/20 min-h-[44px] transition-all duration-200"
      >
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs px-2.5 py-1 rounded-full font-medium border border-cyan-200 dark:border-cyan-700"
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
}) => {
  const { t } = useTranslation();
  return (
    (
  <div className="flex gap-2 items-center">
    <input
      placeholder={t("label")}
      maxLength={100}
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      className={`flex-1 ${inlineInputClass}`}
    />
    <input
      placeholder={t("value")}
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
)
  );
};

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
}) => {
  const { t } = useTranslation();
  return (
    (
  <div className="flex gap-2 items-center">
    <input
      placeholder={t("platform")}
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
)
  );
};

// ── Section Heading ────────────────────────────────────────────────────────
const SectionHeading = ({ title, icon }: { title: string; icon?: string }) => (
  <div className="col-span-1 md:col-span-2 mt-4">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-base">{icon}</span>}
      <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
        {title}
      </h3>
    </div>
    <div className="h-px bg-gradient-to-r from-cyan-300 via-cyan-100 to-transparent dark:from-cyan-700 dark:via-cyan-900 dark:to-transparent" />
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
    {required && <span className="text-cyan-500">*</span>}
  </label>
);

// ── Page ───────────────────────────────────────────────────────────────────
const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string | null>(null);
  const [usersData, setUsersData] = useState<User[]>([]);

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

  const { id } = useParams();
  const router = useRouter();

  // ── Fetch existing enquiry and pre-fill form ──
  const getEnquiryData = async (id: ParamValue): Promise<void> => {
    setErr(null);
    setLoading(true);
    try {
      const result = await EnquiryService.getById(id);
      if (result.status === 200) {
        const d = result.data.data;

        // Normalise "other" social links: API may return object map or array
        let otherSocials: { platform: string; url: string }[] = [];
        if (d.socialLinks?.other) {
          if (Array.isArray(d.socialLinks.other)) {
            otherSocials = d.socialLinks.other;
          } else if (typeof d.socialLinks.other === "object") {
            otherSocials = Object.entries(d.socialLinks.other).map(
              ([platform, url]) => ({ platform, url: url as string })
            );
          }
        }

        // Normalise extra_fields: API may return array of {key,value} or {label,value}
        let extraFields: { label: string; value: string }[] = [];
        if (Array.isArray(d.extra_fields)) {
          extraFields = d.extra_fields.map(
            (f: { label?: string; key?: string; value: string }) => ({
              label: f.label ?? f.key ?? "",
              value: f.value ?? "",
            })
          );
        }

        setFormData({
          fullName: d.fullName ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          companyName: d.companyName ?? "",
          designation: d.designation ?? DESIGNATION.OTHER,
          infoType: d.infoType ?? INFO_TYPE.PEOPLE,
          priority: d.priority ?? "",
          projectType: d.projectType ?? "",
          source: d.source ?? "",
          message: d.message ?? "",
          assignTo: d.assignTo?.id ?? "",
          location: {
            country: d.location?.country ?? "",
            state: d.location?.state ?? "",
            city: d.location?.city ?? "",
            zipcode: d.location?.zipcode ?? d.location?.postalCode ?? "",
          },
          numberOfEmployees: d.numberOfEmployees ?? "",
          industry: Array.isArray(d.industry) ? d.industry : [],
          technologies: Array.isArray(d.technologies) ? d.technologies : [],
          keywords: Array.isArray(d.keywords) ? d.keywords : [],
          socialLinks: {
            linkedin: d.socialLinks?.linkedin ?? "",
            twitter: d.socialLinks?.twitter ?? "",
            github: d.socialLinks?.github ?? "",
            facebook: d.socialLinks?.facebook ?? "",
            instagram: d.socialLinks?.instagram ?? "",
            youtube: d.socialLinks?.youtube ?? "",
            website: d.socialLinks?.website ?? "",
            other: otherSocials,
          },
          extra_fields: extraFields,
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
    } finally {
      setLoading(false);
    }
  };

  const getUsers = async () => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) setUsersData(result.data.data);
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

  useEffect(() => {
    getUsers();
    if (id) getEnquiryData(id);
  }, []);

  // ── Form state helpers ──
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

  // ── Build payload (same logic as create) ──
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);
    try {
      if (!id) {
        toast.error("Enquiry ID not found");
        return;
      }
      const payload = buildPayload();
      const result = await EnquiryService.update(id, payload);
      if (result.status === 200) {
        toast.success("Enquiry updated successfully");
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
        <div className="bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700   px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg shadow-inner">
              ✏️
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t("update_enquiry")}
              </h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                {t("edit_the_details_below_to_update")}
              </p>
            </div>
          </div>
        </div>

        {/* ── Loading overlay ── */}
        {loading && (
          <div className="px-8 py-4 bg-cyan-50 dark:bg-cyan-900/10 border-b border-cyan-100 dark:border-cyan-800/30">
            <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t("loading_enquiry_data")}
            </div>
          </div>
        )}

        {/* ── Form Body ── */}
        <div className="p-8">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
          >
            {/* ── BASIC INFO ───────────────────────────────────────────── */}
            <SectionHeading title={t("basic_information")} icon="👤" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("full_name")}</FieldLabel>
              <Input
                placeholder={t("enter_full_name")}
                required
                value={formData.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("enter_email_address")}
                required
                value={formData.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("phone")}</FieldLabel>
              <Input
                placeholder="+919876543210"
                required
                value={formData.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("company_name")}</FieldLabel>
              <Input
                placeholder={t("enter_company_name")}
                required
                value={formData.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("info_type")}</FieldLabel>
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

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("designation")}</FieldLabel>
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
            <SectionHeading title={t("location")} icon="📍" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("country")}</FieldLabel>
              <Input
                placeholder={t("e_g_india")}
                value={formData.location.country}
                onChange={(e) => setLocation("country", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("state")}</FieldLabel>
              <Input
                placeholder={t("e_g_delhi")}
                value={formData.location.state}
                onChange={(e) => setLocation("state", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("city")}</FieldLabel>
              <Input
                placeholder={t("e_g_new_delhi")}
                value={formData.location.city}
                onChange={(e) => setLocation("city", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("zipcode")}</FieldLabel>
              <Input
                placeholder={t("e_g_110001")}
                value={formData.location.zipcode}
                onChange={(e) => setLocation("zipcode", e.target.value)}
              />
            </div>

            {/* ── COMPANY INFO ─────────────────────────────────────────── */}
            <SectionHeading title={t("company_information")} icon="🏢" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("number_of_employees")}</FieldLabel>
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
                <option value="">{t("select_range")}</option>
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
                label={t("industry_2")}
                values={formData.industry}
                onChange={(vals) => set("industry", vals)}
                placeholder={t("type_industry_and_press_enter")}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <TagInput
                label={t("technologies")}
                values={formData.technologies}
                onChange={(vals) => set("technologies", vals)}
                placeholder={t("e_g_react_node_js_press")}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <TagInput
                label={t("keywords")}
                values={formData.keywords}
                onChange={(vals) => set("keywords", vals)}
                placeholder={t("add_keywords_and_press_enter")}
              />
            </div>

            {/* ── ENQUIRY DETAILS ──────────────────────────────────────── */}
            <SectionHeading title={t("enquiry_details")} icon="📝" />

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("priority")}</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.priority}
                onChange={(e) => set("priority", e.target.value as PRIORITY)}
              >
                <option value="">{t("select_priority")}</option>
                {Object.values(PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("project_type")}</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.projectType}
                onChange={(e) =>
                  set("projectType", e.target.value as PROJECT_TYPES)
                }
              >
                <option value="">{t("select_project_type")}</option>
                {Object.values(PROJECT_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel required>{t("source")}</FieldLabel>
              <select
                required
                className={selectClass(!!err)}
                value={formData.source}
                onChange={(e) => set("source", e.target.value as SOURCE)}
              >
                <option value="">{t("select_source")}</option>
                {Object.values(SOURCE).map((src) => (
                  <option key={src} value={src}>
                    {src.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t("assign_to_2")}</FieldLabel>
              <select
                className={selectClass(!!err)}
                value={formData.assignTo}
                onChange={(e) => set("assignTo", e.target.value)}
              >
                <option value="">{t("unassigned")}</option>
                {usersData?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <FieldLabel>{t("message")}</FieldLabel>
              <textarea
                rows={4}
                placeholder={t("describe_the_enquiry")}
                className={textareaClass(!!err)}
                value={formData.message}
                onChange={(e) => set("message", e.target.value)}
              />
            </div>

            {/* ── SOCIAL LINKS ─────────────────────────────────────────── */}
            <SectionHeading title={t("social_links")} icon="🔗" />

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
                <FieldLabel>{t("other_social_links")}</FieldLabel>
                <button
                  type="button"
                  onClick={addOtherSocial}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 transition-all"
                >
                  {t("add")}
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
                    {t("no_additional_social_links_added")}
                  </p>
                )}
              </div>
            </div>

            {/* ── EXTRA FIELDS ─────────────────────────────────────────── */}
            <SectionHeading title={t("extra_fields")} icon="✨" />

            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <FieldLabel>{t("custom_fields")}</FieldLabel>
                <button
                  type="button"
                  onClick={addExtraField}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 transition-all"
                >
                  {t("add_field")}
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
                    {t("no_custom_fields_added")}
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
                {t("fields_marked")}{" "}
                <span className="text-cyan-500 font-bold">*</span> {t("are_required")}
              </p>
              <FormButton isLoading={isLoading} type="submit">
                {t("update_enquiry")}
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default page;