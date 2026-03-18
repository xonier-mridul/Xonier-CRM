"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import LeadService from "@/src/services/lead.service";
import { UserFormService } from "@/src/services/userForm.service";
import { UserForm } from "@/src/types/userForm/userForm.types";
import { BulkLeadPayload, LeadPayload } from "@/src/types/leads/leads.types";
import {
  COUNTRY_CODE,
  EMPLOYEE_SENIORITY,
  INDUSTRIES,
  LANGUAGE_CODE,
  PRIORITY,
  SALES_STATUS,
  SOURCE,
} from "@/src/constants/enum";
import axios from "axios";
import React, { JSX, useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import Papa from "papaparse";
import {
  Upload,
  Download,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Trash2,
  Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ParsedLead {
  [key: string]: string | number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const BulkLeadUpload = (): JSX.Element => {
  const [userFormData, setUserFormData] = useState<UserForm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [dataTag, setDataTag] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);

  const router = useRouter();

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        setUserFormData(result.data.data);
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

  useEffect(() => {
    getFormFields();
  }, []);

  const downloadCSVTemplate = () => {
    if (!userFormData?.selectedFormFields) {
      toast.error("Form fields not loaded");
      return;
    }

    const headers = userFormData.selectedFormFields.map((field) => field.key);
    const csvContent = headers.join(",") + "\n";

    const exampleRow = userFormData.selectedFormFields
      .map((field) => {
        switch (field.type) {
          case "email":
            return "example@email.com";
          case "text":
            return field.key === "phone"
              ? "+919876543210"
              : `example_${field.key}`;
          case "number":
            return "12345";
          case "select":
            if (["priority", "source", "projectType"].includes(field.key)) {
              return field.options?.[0]?.value || "";
            }
            return field.options?.[0]?.value || "";
          default:
            return "";
        }
      })
      .join(",");

    const blob = new Blob([csvContent + exampleRow], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("CSV template downloaded successfully");
  };

  const validateLeadData = (
    data: ParsedLead[],
    startIndex: number = 0,
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!userFormData?.selectedFormFields) return errors;

    const optionalFields = new Set([
      "phone",
      "priority",
      "projectType",
      "country",
    ]);

    data.forEach((lead, index) => {
      const rowNumber = startIndex + index + 2;

      userFormData.selectedFormFields.forEach((field) => {
        const value = lead[field.key];
        const isBackendOptional = optionalFields.has(field.key);

        if (field.required && !isBackendOptional && (!value || value === "")) {
          errors.push({
            row: rowNumber,
            field: field.key,
            message: `${field.name} is required`,
          });
        }

        if (value && value !== "") {
          switch (field.type) {
            case "email":
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(String(value))) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: "Invalid email format",
                });
              }
              break;

            case "number":
              if (isNaN(Number(value))) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: "Must be a number",
                });
              }
              break;

            case "select":
              if (
                field.options &&
                !optionalFields.has(field.key) &&
                field.key !== "source"
              ) {
                const validValues = field.options.map((opt) => opt.value);
                if (!validValues.includes(String(value))) {
                  errors.push({
                    row: rowNumber,
                    field: field.key,
                    message: `Invalid value. Must be one of: ${validValues.join(", ")}`,
                  });
                }
              }
              break;

            case "text":
              if (field.key === "fullName" && String(value).trim().length < 1) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: "Full name must be at least 1 characters",
                });
              }
              break;
          }
        }
      });
    });

    return errors;
  };

  const parseCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as ParsedLead[];

        setCsvHeaders(headers);
        setParsedData(data);
        setCurrentPage(1);

        const errors = validateLeadData(data);
        setValidationErrors(errors);

        if (errors.length > 0) {
          toast.warning(`Found ${errors.length} validation errors`);
        } else {
          toast.success(`Successfully parsed ${data.length} leads`);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setFile(null);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      parseCSVFile(selectedFile);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (
        droppedFile.type !== "text/csv" &&
        !droppedFile.name.endsWith(".csv")
      ) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(droppedFile);
      parseCSVFile(droppedFile);
    }
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setCurrentPage(1);
    setDataTag("");
    setCsvHeaders([]);
  };

  const handleDeleteRow = (globalIndex: number) => {
    const updatedData = parsedData.filter((_, index) => index !== globalIndex);
    setParsedData(updatedData);

    const errors = validateLeadData(updatedData);
    setValidationErrors(errors);

    const newTotalPages = Math.ceil(updatedData.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }

    toast.success("Row deleted successfully");

    if (updatedData.length === 0) {
      handleRemoveFile();
    }
  };

  const handleDeleteAllRows = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all rows? This action cannot be undone.",
      )
    ) {
      handleRemoveFile();
      toast.success("All rows deleted");
    }
  };

  const handleDeleteInvalidRows = () => {
    const invalidRowNumbers = new Set(validationErrors.map((err) => err.row));
    const updatedData = parsedData.filter(
      (_, index) => !invalidRowNumbers.has(index + 2),
    );
    const deletedCount = parsedData.length - updatedData.length;

    setParsedData(updatedData);

    const errors = validateLeadData(updatedData);
    setValidationErrors(errors);

    const newTotalPages = Math.ceil(updatedData.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
    }

    toast.success(
      `${deletedCount} invalid row${deletedCount !== 1 ? "s" : ""} deleted`,
    );

    if (updatedData.length === 0) {
      handleRemoveFile();
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedData.length) {
      toast.error("No data to upload");
      return;
    }

    if (validationErrors.length > 0) {
      toast.error("Please fix validation errors before uploading");
      return;
    }

    setIsUploading(true);

    try {
      const coreFields = new Set([
        "fullName",
        "email",
        "phone",
        "priority",
        "source",
        "projectType",
        "status",
        "companyName",
        "city",
        "country",
        "postalCode",
        "language",
        "industry",
        "employeeRole",
        "employeeSeniority",
        "message",
        "membershipNotes",
      ]);

      const leadsPayload: LeadPayload[] = parsedData.map((row) => {
        const lead: LeadPayload = {
          fullName: String(row.fullName || ""),
          email: String(row.email || ""),
        };

        const extraFields: Record<string, string | number | boolean | null> = {};

        Object.entries(row).forEach(([key, value]) => {
          if (value === undefined || value === "") return;

          if (coreFields.has(key)) {
            switch (key) {
              case "phone":
                lead.phone = String(value);
                break;
              case "priority":
                lead.priority = value as PRIORITY;
                break;
              case "source":
                lead.source = String(value);
                break;
              case "projectType":
                lead.projectType = String(value);
                break;
              case "status":
                lead.status = value as SALES_STATUS;
                break;
              case "companyName":
              case "city":
              case "employeeRole":
              case "message":
              case "membershipNotes":
                (lead as any)[key] = String(value);
                break;
              case "postalCode":
                lead.postalCode = Number(value);
                break;
              case "country":
                lead.country = String(value);
                break;
              case "language":
                lead.language = value as LANGUAGE_CODE;
                break;
              case "industry":
                lead.industry = value as INDUSTRIES;
                break;
              case "employeeSeniority":
                lead.employeeSeniority = value as EMPLOYEE_SENIORITY;
                break;
            }
          } else {
            const parsedValue = String(value).trim();
            if (parsedValue === "") return;

            if (!isNaN(Number(parsedValue))) {
              extraFields[key] = Number(parsedValue);
            } else if (
              parsedValue.toLowerCase() === "true" ||
              parsedValue.toLowerCase() === "false"
            ) {
              extraFields[key] = parsedValue.toLowerCase() === "true";
            } else {
              extraFields[key] = parsedValue;
            }
          }
        });

        if (Object.keys(extraFields).length > 0) {
          lead.extraFields = extraFields;
        }

        return lead;
      });

      const payload: BulkLeadPayload = {
        leads: leadsPayload,
        ...(dataTag.trim() ? { dataTag: dataTag.trim() } : {}),
      };

      const result = await LeadService.bulkCreate(payload);

      if (result.status === 201) {
        toast.success(result.data.message);
        handleRemoveFile();
        router.push("/leads");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = parsedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(parsedData.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getErrorsForRow = (globalIndex: number): ValidationError[] => {
    const rowNumber = globalIndex + 2;
    return validationErrors.filter((err) => err.row === rowNumber);
  };

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bulk Lead Upload
          </h1>
          <p className="text-gray-600 dark:text-gray-500">
            Upload multiple leads at once using a CSV file
          </p>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg border border-slate-900/10 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Step 1: Download Template
              </h2>
              <p className="text-gray-600 dark:text-gray-500 mb-4">
                Download the CSV template with the correct column headers based
                on your form fields.
              </p>
            </div>
            <button
              onClick={downloadCSVTemplate}
              disabled={isLoading || !userFormData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              Download Template
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-900/10 dark:bg-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Step 2: Upload CSV File
          </h2>

          {!file ? (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <Upload className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-400 mb-2">
                please drag and drop your CSV file here
              </p>
              <p className="text-gray-500 mb-4">or</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block transition-colors">
                  Choose File
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Only CSV files are accepted
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="border border-gray-200 dark:border-gray-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" size={32} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-200">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB • {parsedData.length} rows
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0">
                    <Tag size={17} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="shrink-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Data Tag
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Optional — group this batch for easy filtering later
                    </p>
                  </div>
                  <div className="flex-1 ml-2 relative">
                    <input
                      type="text"
                      value={dataTag}
                      onChange={(e) => setDataTag(e.target.value)}
                      placeholder="e.g. Q2-Campaign, Mumbai-Expo-2025"
                      maxLength={60}
                      className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    {dataTag && (
                      <button
                        type="button"
                        onClick={() => setDataTag("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-gray-700 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">
                  Validation Errors ({validationErrors.length})
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-sm text-red-700 mb-1">
                      Row {error.row}, Column "{error.field}": {error.message}
                    </p>
                  ))}
                  {validationErrors.length > 10 && (
                    <p className="text-sm text-red-700 font-medium mt-2">
                      ... and {validationErrors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="bg-white dark:bg-gray-700 rounded-lg border border-slate-900/10 mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    Step 3: Review Data
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                    Review your data before uploading ({parsedData.length} total rows)
                    {dataTag.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        <Tag size={10} />
                        {dataTag.trim()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-3">
                  {validationErrors.length > 0 && (
                    <button
                      onClick={handleDeleteInvalidRows}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium border border-orange-300"
                    >
                      <AlertCircle size={18} />
                      Delete Invalid Rows (
                      {new Set(validationErrors.map((e) => e.row)).size})
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAllRows}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium border border-red-300"
                  >
                    <Trash2 size={18} />
                    Delete All
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={isUploading || validationErrors.length > 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Upload Leads
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-transparent border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                      Row
                    </th>
                    {csvHeaders.map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200">
                  {currentItems.map((lead, index) => {
                    const globalIndex = indexOfFirstItem + index;
                    const rowErrors = getErrorsForRow(globalIndex);
                    const hasError = rowErrors.length > 0;

                    return (
                      <tr
                        key={index}
                        className={
                          hasError
                            ? "bg-red-50 dark:bg-red-500"
                            : "hover:bg-gray-50 dark:hover:bg-gray-600"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteRow(globalIndex)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                            title="Delete this row"
                          >
                            <Trash2
                              size={16}
                              className="text-gray-400 group-hover:text-red-600"
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {globalIndex + 1}
                          {hasError && (
                            <AlertCircle
                              className="inline-block ml-2 text-red-500"
                              size={16}
                            />
                          )}
                        </td>
                        {csvHeaders.map((header) => {
                          const value = lead[header];
                          const fieldError = rowErrors.find(
                            (err) => err.field === header,
                          );

                          return (
                            <td
                              key={header}
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                fieldError
                                  ? "text-red-900 font-medium"
                                  : "text-gray-900 dark:text-white"
                              }`}
                              title={fieldError?.message}
                            >
                              {value || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, parsedData.length)} of{" "}
                  {parsedData.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => paginate(pageNum)}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkLeadUpload;