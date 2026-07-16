"use client";
import React, { FormEvent, JSX, useState, useMemo } from "react";
import { HiDownload } from "react-icons/hi";
import { FaUpload, FaFileCsv, FaTrash } from "react-icons/fa";
import { UpdateEnquiryPayload } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import * as XLSX from "xlsx";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";

import ErrorComponent from "@/src/components/ui/ErrorComponent";
import { FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { DESIGNATION, NUMBER_OF_EMPLOYEES, PRIORITY, PROJECT_TYPES, SOURCE, INFO_TYPE } from "@/src/constants/enum";
// import DesignationModal from "./src/components/pages/enquiry/DesignationModal";
import { useTranslation } from "react-i18next";
import { EnquiryService } from "@/src/services/enquiry.service";

const ITEMS_PER_PAGE = 10;

const ARRAY_FIELDS = [
  "industry",
  "keywords",
  "technologies",
  "socialLinks",
  "extra_fields",
] as const;

interface RowError {
  field: string;
  message: string;
}

const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRow = (row: UpdateEnquiryPayload): RowError[] => {
  const errors: RowError[] = [];

  if (!row.fullName?.trim())
    errors.push({ field: "fullName", message: "Full name is required" });

  if (!row.email?.trim())
    errors.push({ field: "email", message: "Email is required" });
  else if (!EMAIL_REGEX.test(row.email.trim()))
    errors.push({ field: "email", message: "Invalid email format" });

  if (!row.phone?.trim())
    errors.push({ field: "phone", message: "Phone is required" });
  else if (!PHONE_REGEX.test(row.phone.trim()))
    errors.push({ field: "phone", message: "Phone must be 10–15 digits, optionally starting with +" });

  if (!row.designation)
    errors.push({ field: "designation", message: "Designation is required" });
  else if (!Object.values(DESIGNATION).includes(row.designation as DESIGNATION))
    errors.push({ field: "designation", message: `Invalid designation: "${row.designation}"` });

  if (!row.priority)
    errors.push({ field: "priority", message: "Priority is required" });
  else if (!Object.values(PRIORITY).includes(row.priority as PRIORITY))
    errors.push({ field: "priority", message: `Invalid priority: "${row.priority}"` });

  if (!row.projectType)
    errors.push({ field: "projectType", message: "Project type is required" });
  else if (!Object.values(PROJECT_TYPES).includes(row.projectType as PROJECT_TYPES))
    errors.push({ field: "projectType", message: `Invalid project type: "${row.projectType}"` });

  if (!row.source)
    errors.push({ field: "source", message: "Source is required" });
  else if (!Object.values(SOURCE).includes(row.source as SOURCE))
    errors.push({ field: "source", message: `Invalid source: "${row.source}"` });

  if (row.infoType && !Object.values(INFO_TYPE).includes(row.infoType as INFO_TYPE))
    errors.push({ field: "infoType", message: `Invalid infoType: "${row.infoType}"` });

  if (!Array.isArray(row.industry) || row.industry.length === 0)
    errors.push({ field: "industry", message: "At least one industry is required" });

  if (
    row.numberOfEmployees &&
    !Object.values(NUMBER_OF_EMPLOYEES).includes(row.numberOfEmployees as NUMBER_OF_EMPLOYEES)
  )
    errors.push({ field: "numberOfEmployees", message: `Invalid value: "${row.numberOfEmployees}"` });

  return errors;
};

const parseCellAsArray = (value: string | null | undefined): string[] => {
  if (!value || value.trim() === "") return [];
  return value.split(/[|;]/).map((v) => v.trim()).filter(Boolean);
};

const normaliseDesignation = (raw: string | null | undefined): DESIGNATION => {
  if (!raw) return DESIGNATION.OTHER;
  const match = Object.values(DESIGNATION).find(
    (d) => d.toLowerCase() === raw.trim().toLowerCase()
  );
  return match ?? (raw.trim() as DESIGNATION);
};

const normaliseNumberOfEmployees = (
  raw: string | null | undefined
): NUMBER_OF_EMPLOYEES | null => {
  if (!raw) return null;
  const match = Object.values(NUMBER_OF_EMPLOYEES).find((n) => n === raw.trim());
  return match ?? null;
};

const applyCommonTransforms = (obj: Record<string, unknown>): UpdateEnquiryPayload => {
  ARRAY_FIELDS.forEach((field) => {
    if (field in obj) obj[field] = parseCellAsArray(obj[field] as string);
  });

  obj.designation = normaliseDesignation(obj.designation as string);
  obj.numberOfEmployees = normaliseNumberOfEmployees(obj.numberOfEmployees as string);

  obj.location = {
    country: (obj.country as string) || null,
    state: (obj.state as string) || null,
    city: (obj.city as string) || null,
    zipcode: (obj.zipcode as string) || null,
  };
  delete obj.country;
  delete obj.state;
  delete obj.city;
  delete obj.zipcode;

  Object.keys(obj).forEach((k) => {
    if (obj[k] === "" || obj[k] === undefined) obj[k] = null;
  });

  return obj as unknown as UpdateEnquiryPayload;
};

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [data, setData] = useState<UpdateEnquiryPayload[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);

  const router = useRouter();

  const rowErrors = useMemo(() => data.map((row) => validateRow(row)), [data]);
  const invalidCount = rowErrors.filter((e) => e.length > 0).length;
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const paginatedErrors = rowErrors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const deleteRow = (globalIdx: number) => {
    setData((prev) => prev.filter((_, i) => i !== globalIdx));
    const newTotal = data.length - 1;
    const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0)
      setCurrentPage(newTotalPages);
  };

  const deleteInvalidRows = () => {
    setData((prev) => prev.filter((_, i) => rowErrors[i].length === 0));
    setCurrentPage(1);
  };

  const generateDummyCSV = () => {
    const rows = [
      [
        "fullName", "email", "phone", "companyName", "designation", "assignTo",
        "projectType", "priority", "source", "industry", "keywords", "technologies",
        "numberOfEmployees", "infoType", "country", "state", "city", "zipcode", "message",
      ],
      [
        "Mirdul", "mirdul@gmail.com", "7878787878", "Xonier", "CEO",
        "69a54cb1e753098c6aaddef3", "crm", "medium", "instagram_ads",
        "technology", "tech|crm", "react|node", "2000-5000", "people",
        "india", "punjab", "chandigarh", "160001", "",
      ],
      [
        "Rahul Sharma", "rahul@test.com", "9999999999", "ABC Pvt Ltd", "Director",
        "69a54cb1e753098c6aaddef3", "website", "high", "website",
        "it|consulting", "web|seo", "nextjs|tailwind", "50-100", "company",
        "india", "delhi", "new delhi", "110001", "Need business website",
      ],
      [
        "Neha Verma", "neha@test.com", "8888888888", "XYZ Corp", "CTO",
        "69a54cb1e753098c6aaddef3", "mobile_app", "medium", "google_ads",
        "software", "mobile|app", "flutter|dart", "100-200", "people",
        "india", "maharashtra", "mumbai", "400001", "Mobile app enquiry",
      ],
      [
        "Amit Singh", "amit@test.com", "7777777777", "StartupX", "Founder",
        "69a54cb1e753098c6aaddef3", "ai_ml", "high", "linkedin_ads",
        "ai|ml", "ml|ai", "python|tensorflow", "500-1000", "people",
        "india", "karnataka", "bangalore", "560001", "AI solution needed",
      ],
      [
        "Priya Mehta", "priya@test.com", "6666666666", "", "HR Manager",
        "69a54cb1e753098c6aaddef3", "crm", "low", "referral",
        "consulting", "crm|erp", "salesforce", "500-1000", "company",
        "india", "gujarat", "ahmedabad", "380001", "CRM requirement",
      ],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  };

  const downloadCSV = () => {
    const blob = new Blob([generateDummyCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-enquiry-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = async (file: File): Promise<UpdateEnquiryPayload[]> => {
    const text = await file.text();
    const [headerLine, ...lines] = text.split("\n").filter(Boolean);
    const headers = headerLine.split(",").map((h) => h.trim());

    return lines.map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
      return applyCommonTransforms(obj);
    });
  };

  const parseXLSX = async (file: File): Promise<UpdateEnquiryPayload[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
    });
    return rows.map((obj) => applyCommonTransforms(obj));
  };

  const handleFile = async (file: File) => {
    const isCSV = file.name.endsWith(".csv");
    const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCSV && !isXLSX) {
      return alert("Only CSV or XLSX files are allowed");
    }

    setSelectedFile(file);
    const parsed = isXLSX ? await parseXLSX(file) : await parseCSV(file);
    setData(parsed);
    setCurrentPage(1);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setData([]);
    setCurrentPage(1);
    setErr("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (data.length === 0) {
      toast.warn("No enquiries to upload");
      return;
    }

    if (invalidCount > 0) {
      toast.error(`Fix or remove ${invalidCount} invalid row(s) before submitting`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await EnquiryService.bulkCreate({ enquiries: data });
      if (result.status === 201) {
        toast.success("Bulk enquiries created successfully");
        resetUpload();
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
    <div className="lg:ml-72 mt-14 p-6 space-y-6">

      {/* ── Designation Modal ── */}
      {/* <DesignationModal
        isOpen={isDesignationModalOpen}
        onClose={() => setIsDesignationModalOpen(false)}
      /> */}

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700  px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center text-lg">
              📊
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t("bulk_enquiries")}
              </h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                {t("upload_a_csv_or_xlsx_to_create_multiple_enquiries_at_once")}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
            <p>{t("download_the_sample_sheet_fill_it")}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("array_fields_industry_keywords_technologies_use")}{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">|</code>{" "}
              {t("as_separator_e_g")}{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {t("react_nextjs_tailwind")}
              </code>
            </p>
          </div>

          {/* ── Buttons ── */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            <button
              onClick={() => setIsDesignationModalOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap"
            >
              <span className="text-violet-500">🏷️</span> {t("designations")}
            </button>

            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <HiDownload className="text-base" /> {t("download_sample")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]);
        }}
        className={`bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed transition-all duration-200 p-12
          ${isDragging
            ? "border-cyan-400 bg-violet-50 dark:bg-violet-900/10 scale-[1.01]"
            : "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700"
          }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragging ? "bg-violet-100 dark:bg-violet-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
            <FaFileCsv className={`text-3xl transition-colors
              ${isDragging ? "text-cyan-500" : "text-gray-400 dark:text-gray-500"}`} />
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              {isDragging ? "Drop your file here" : "Drag & drop your CSV or XLSX file"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t("or_click_the_button_below_to_browse")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t("supported_formats")} <span className="font-medium">{t("csv")}</span>{" "}<span className="font-medium">{t("xlsx")}</span> {" "} <span className="font-medium">{t("xls")}</span>
            </p>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            id="csvUpload"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />

          <label
            htmlFor="csvUpload"
            className="cursor-pointer flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <FaUpload /> {t("choose_file")}
          </label>

          {selectedFile && (
            <div className="flex items-center gap-3 mt-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-2.5 rounded-xl">
              <FaFileCsv className="text-cyan-500 text-lg" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {selectedFile.name}
              </span>
              <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                {data.length} {t("rows")}
              </span>
              <button
                onClick={resetUpload}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all ml-1"
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Preview table ── */}
      {data.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t("preview_2")}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                {data.length} {t("records")}
              </span>
              {invalidCount > 0 && (
                <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full font-medium">
                  ⚠ {invalidCount} {t("invalid")}
                </span>
              )}
              {invalidCount === 0 && data.length > 0 && (
                <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full font-medium">
                  {t("all_rows_valid")}
                </span>
              )}
            </div>

            {invalidCount > 0 && (
              <button
                type="button"
                onClick={deleteInvalidRows}
                className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg transition-all"
              >
                <FaTrash className="text-xs" />
                {t("delete")} {invalidCount} {t("invalid_row")}{invalidCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {["#", "Name", "Email", "Phone", "Designation", "Project", "Priority", "Source", "Industry", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedData.map((item, pageIdx) => {
  const { t } = useTranslation();
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + pageIdx;
                  const errors = paginatedErrors[pageIdx];
                  const isInvalid = errors.length > 0;
                  const fieldHasError = (field: string) => errors.some((e) => e.field === field);

                  return (
                    <tr
                      key={globalIdx}
                      onMouseEnter={() => setHoveredRow(globalIdx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-colors relative
                        ${isInvalid
                          ? "bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        }`}
                    >
                      <td className="px-4 py-3 relative">
                        <div className="flex items-center gap-1.5">
                          {isInvalid && (
                            <div className="relative group">
                              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center cursor-help flex-shrink-0">
                                !
                              </span>
                              <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-xl shadow-2xl p-3 space-y-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity border border-red-800">
                                <p className="font-bold text-red-400 mb-1.5 flex items-center gap-1">
                                  <span>⚠</span> {errors.length} {t("error")}{errors.length > 1 ? "s" : ""} {t("in_this_row")}
                                </p>
                                {errors.map((e, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                                    <span>
                                      <span className="font-semibold text-red-300">{e.field}:</span>{" "}
                                      <span className="text-gray-300">{e.message}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <span className={`text-xs ${isInvalid ? "text-red-400" : "text-gray-400"}`}>
                            {globalIdx + 1}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`font-medium ${fieldHasError("fullName") ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>
                          {item.fullName || <span className="italic text-red-400 text-xs">{t("missing")}</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`${fieldHasError("email") ? "text-red-500 dark:text-red-400 underline decoration-dotted" : "text-gray-500 dark:text-gray-400"}`}>
                          {item.email || <span className="italic text-red-400 text-xs">{t("missing")}</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`${fieldHasError("phone") ? "text-red-500 dark:text-red-400 underline decoration-dotted" : "text-gray-500 dark:text-gray-400"}`}>
                          {item.phone || <span className="italic text-red-400 text-xs">{t("missing")}</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                          ${fieldHasError("designation")
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                            : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800"
                          }`}>
                          {item.designation || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`capitalize text-xs ${fieldHasError("projectType") ? "text-red-500 dark:text-red-400 font-medium" : "text-gray-600 dark:text-gray-300"}`}>
                          {item.projectType || <span className="italic text-red-400">{t("missing")}</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {fieldHasError("priority") ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                            {item.priority || "missing"}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                            ${item.priority === "high"
                              ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                              : item.priority === "medium"
                                ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                : "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            }`}>
                            {item.priority}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`capitalize text-xs ${fieldHasError("source") ? "text-red-500 dark:text-red-400 font-medium" : "text-gray-600 dark:text-gray-300"}`}>
                          {item.source || <span className="italic text-red-400">{t("missing")}</span>}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.industry) && item.industry.length > 0
                            ? item.industry.filter(Boolean).map((ind, idx) => (
                              <span key={idx} className={`inline-flex px-2 py-0.5 rounded-full text-xs border
                                ${fieldHasError("industry")
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800"
                                  : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-300 border-violet-100 dark:border-cyan-800"
                                }`}>
                                {ind}
                              </span>
                            ))
                            : <span className="italic text-red-400 text-xs">{t("missing")}</span>
                          }
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteRow(globalIdx)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                            ${isInvalid
                              ? "bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/60"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                            }`}
                          title={t("delete_this_row")}
                        >
                          <FaTrash className="text-[10px]" />
                        </button>
                      </td>

                      {isInvalid && (
                        <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-l" />
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("showing")}{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>–
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {Math.min(currentPage * ITEMS_PER_PAGE, data.length)}
              </span>{" "}
              {t("of")}{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">{data.length}</span>
            </span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === i + 1 ? "bg-cyan-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {err && <ErrorComponent error={err} />}

      {data.length > 0 && (
        <form onSubmit={handleSubmit} className="flex justify-end items-center gap-3">
          {invalidCount > 0 && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {invalidCount} {t("invalid_row_2")}{invalidCount > 1 ? "s" : ""} {t("must_be_fixed_or_removed_before_submitting")}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || invalidCount > 0}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiUpload />
            {isLoading ? "Uploading..." : `Create ${data.length} Enquir${data.length > 1 ? "ies" : "y"}`}
          </button>
        </form>
      )}
    </div>
  );
};

export default page;