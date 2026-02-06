"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { FormEvent, JSX, useState } from "react";
import { HiDownload } from "react-icons/hi";
import { FaUpload, FaFileCsv, FaTrash } from "react-icons/fa";
import { UpdateEnquiryPayload } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { EnquiryService } from "@/src/services/enquiry.service";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import SuccessComponent from "@/src/components/ui/SuccessComponent";
import FormButton from "@/src/components/ui/FormButton";
import { FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 10;

const page = (): JSX.Element => {
  const [data, setData] = useState<UpdateEnquiryPayload[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const router = useRouter()
  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const generateDummyCSV = () => {
    const rows = [
      [
        "fullName",
        "email",
        "phone",
        "companyName",
        "projectType",
        "priority",
        "source",
        "message",
      ],
      [
        "Rahul Sharma",
        "rahul@test.com",
        "9999999999",
        "ABC Pvt Ltd",
        "website",
        "high",
        "website",
        "Need business website",
      ],
      [
        "Neha Verma",
        "neha@test.com",
        "8888888888",
        "XYZ Corp",
        "mobile_app",
        "medium",
        "google_ads",
        "Mobile app enquiry",
      ],
      [
        "Amit Singh",
        "amit@test.com",
        "7777777777",
        "StartupX",
        "ai_ml",
        "high",
        "linkedin_ads",
        "AI solution",
      ],
      [
        "Priya Mehta",
        "priya@test.com",
        "6666666666",
        "",
        "crm",
        "low",
        "referral",
        "CRM requirement",
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
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = values[i] || null));
      return obj;
    });
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) return alert("Only CSV allowed");
    setSelectedFile(file);
    const parsed = await parseCSV(file);
    setData(parsed);
    setCurrentPage(1);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setData([]);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (data.length === 0) {
      toast.warn("No enquiries to upload");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        enquiries: data,
      };

      const result = await EnquiryService.bulkCreate(payload);

      if (result.status === 201) {
        toast.success("Bulk enquiries created successfully");
        resetUpload();
        setData([])
        router.push("/enquiry")
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
    <div className={`ml-72 mt-14 p-6 space-y-6`}>
      <div className="bg-white dark:bg-gray-700 rounded-xl p-6 flex justify-between items-center">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">Bulk Enquiries</h2>
          <p className="text-gray-500 dark:text-gray-200">
            Upload CSV to create enquiries in bulk, download the sample sheet and update it
          </p>
        </div>

        <button
          onClick={downloadCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md flex items-center gap-2"
        >
          <HiDownload /> Download Sample
        </button>
      </div>

      {err && <ErrorComponent error={err} />}
      {<SuccessComponent message="" />}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]);
        }}
        className={`bg-white dark:bg-gray-700 rounded-xl p-12 border-2 border-dashed transition
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
      >
        <div className="flex flex-col items-center gap-3">
          <FaFileCsv className="text-4xl text-gray-400 dark:text-gray-300" />
          <p className="text-gray-600 dark:text-gray-300">Drag & drop your CSV file here</p>

          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="csvUpload"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />

          <label
            htmlFor="csvUpload"
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
          >
            <FaUpload /> Choose File
          </label>

          {selectedFile && (
            <div className="flex items-center gap-3 mt-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-md">
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">{data.length} rows</span>
              <button onClick={resetUpload} className="text-red-500">
                <FaTrash />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      {data.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Project",
                  "Priority",
                  "Source",
                ].map((h) => (
                  <th key={h} className="p-3 text-left uppercase text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">{item.fullName}</td>
                  <td className="p-3">{item.email}</td>
                  <td className="p-3">{item.phone}</td>
                  <td className="p-3 capitalize">{item.projectType}</td>
                  <td className="p-3 capitalize">{item.priority}</td>
                  <td className="p-3 capitalize">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between items-center p-4">
            <span className="text-sm text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} of{" "}
              {data.length}
            </span>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          
        </div>
        
      )}
      {data.length > 0 && (
            <form onSubmit={handleSubmit} className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-fit flex items-center justify-center gap-2
        rounded-md px-4 py-2 font-medium
        bg-blue-600 text-white
        hover:bg-blue-700 hover:cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed"
              >
               <FiUpload /> {isLoading ? "Uploading..." : "Create Enquiries"}
              </button>
            </form>
          )}
    </div>
  );
};

export default page;
