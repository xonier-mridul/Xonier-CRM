"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import React, { JSX, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FaUpload, FaTrash, FaFilePdf, FaFileWord } from "react-icons/fa";
import { FiUpload } from "react-icons/fi";
import { AlertCircle, X, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QuoteService } from "@/src/services/quote.service";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: "pdf" | "word";
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

interface QuotationFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  onUploadSuccess?: () => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const QuotationFileUploadModal = ({
  isOpen,
  onClose,
  quotationId,
  onUploadSuccess,
}: QuotationFileUploadModalProps): JSX.Element | null => {
  const { t } = useTranslation();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileInputKey, setFileInputKey] = useState<number>(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getFileType = (file: File): "pdf" | "word" | null => {
    const mimeType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (mimeType) return mimeType as "pdf" | "word";

    const ext = file.name.toLowerCase();
    if (ext.endsWith(".pdf")) return "pdf";
    if (ext.endsWith(".doc") || ext.endsWith(".docx")) return "word";

    return null;
  };

  const validateFile = (file: File): string | null => {
    const fileType = getFileType(file);
    if (!fileType) {
      return "Only PDF and Word (.doc, .docx) files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`;
    }
    return null;
  };

  const processFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        const isDuplicate = files.some(
          (f) => f.name === file.name && f.size === formatFileSize(file.size)
        );
        if (isDuplicate) {
          errors.push(`${file.name}: File already added`);
        } else {
          validFiles.push({
            id: generateId(),
            file,
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileType(file) as "pdf" | "word",
            status: "pending",
          });
        }
      }
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      toast.success(
        `${validFiles.length} file${validFiles.length > 1 ? "s" : ""} added`
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    e.target.value = "";
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.items?.length) setIsDragging(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      if (
        e.clientX <= r.left ||
        e.clientX >= r.right ||
        e.clientY <= r.top ||
        e.clientY >= r.bottom
      )
        setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [files]
  );

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const removeAllFiles = () => {
    setFiles([]);
    setFileInputKey((k) => k + 1);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("No files to upload");
      return;
    }

    setIsUploading(true);

    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading" as const }))
    );

    try {
      const formData = new FormData();

      files.forEach((f) => {
        formData.append("files", f.file);
      });

      formData.append("quotationId", quotationId);

      const result = await QuoteService.uploadFiles(quotationId, formData);

      if (result.status === 200 || result.status === 201) {
        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: "success" as const }))
        );
        toast.success(
          `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`
        );

        setTimeout(() => {
          removeAllFiles();
          onUploadSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          errorMessage: "Upload failed",
        }))
      );

      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Something went wrong during upload");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const FileIcon = ({ type }: { type: "pdf" | "word" }) => {
    if (type === "pdf") {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <FaFilePdf className="text-red-500 text-lg" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
        <FaFileWord className="text-blue-500 text-lg" />
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: UploadedFile["status"] }) => {
    const config = {
      pending: {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-600 dark:text-gray-400",
        label: "Pending",
      },
      uploading: {
        bg: "bg-cyan-50 dark:bg-cyan-900/20",
        text: "text-cyan-600 dark:text-cyan-400",
        label: "Uploading...",
      },
      success: {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        label: "Uploaded",
      },
      error: {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        label: "Failed",
      },
    };
    const c = config[status];
    return (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}
      >
        {c.label}
      </span>
    );
  };

  const handleClose = () => {
    if (!isUploading) {
      removeAllFiles();
      onClose();
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-991 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-992 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl  w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] dark:to-cyan-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
                📎
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t("upload_quotation_files")}
                </h2>
                <p className="text-xs text-cyan-200 mt-0.5">
                  {t("attach_pdf_or_word_documents")}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Info Banner */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4">
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                {t("supported_formats")}:{" "}
                <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  PDF
                </code>
                {" · "}
                <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  DOC
                </code>
                {" · "}
                <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  DOCX
                </code>
                {" · "}
                <span className="text-cyan-600 dark:text-cyan-400">
                  Max {formatFileSize(MAX_FILE_SIZE)} per file
                </span>
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl transition-all duration-200 p-8
                ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 scale-[1.01]"
                    : "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700"
                }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors
                    ${
                      isDragging
                        ? "bg-cyan-100 dark:bg-cyan-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                >
                  <FileText
                    className={`transition-colors
                      ${
                        isDragging
                          ? "text-cyan-500"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    size={28}
                  />
                </div>

                <div className="text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {isDragging
                      ? t("drop_your_files_here")
                      : t("drag_and_drop_files")}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t("or_click_below_to_browse")}
                  </p>
                </div>

                <input
                  key={fileInputKey}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  id="quotationFileUpload"
                  onChange={handleFileChange}
                  multiple
                />
                <label
                  htmlFor="quotationFileUpload"
                  className="cursor-pointer flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  <FaUpload /> {t("choose_files")}
                </label>

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("max_files")}: {MAX_FILES}
                </p>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {/* File List Header */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {t("selected_files")}
                    </h3>
                    <span className="text-xs text-gray-400 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-full">
                      {files.length} file{files.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={removeAllFiles}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                  >
                    {t("remove_all")}
                  </button>
                </div>

                {/* File Items */}
                <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-60 overflow-y-auto">
                  {files.map((uploadedFile, index) => (
                    <div
                      key={uploadedFile.id}
                      className={`px-4 py-3 flex items-center gap-3 transition-colors
                        ${
                          uploadedFile.status === "error"
                            ? "bg-red-50/60 dark:bg-red-900/10"
                            : uploadedFile.status === "success"
                            ? "bg-green-50/60 dark:bg-green-900/10"
                            : ""
                        }`}
                    >
                      <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">
                        {index + 1}
                      </span>

                      <FileIcon type={uploadedFile.type} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {uploadedFile.name}
                          </p>
                          <StatusBadge status={uploadedFile.status} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {uploadedFile.size}
                        </p>
                      </div>

                      {uploadedFile.status === "uploading" && (
                        <div className="w-20 flex-shrink-0">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div className="bg-cyan-500 h-1 rounded-full animate-pulse w-3/4"></div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(uploadedFile.id)}
                        disabled={uploadedFile.status === "uploading"}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">
                      {errorCount} file{errorCount > 1 ? "s" : ""} failed to upload
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {t("please_remove_failed_files")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {files.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("cancel")}
              </button>

              <button
                onClick={handleUpload}
                disabled={isUploading || pendingCount === 0}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiUpload />
                {isUploading
                  ? t("uploading")
                  : `${t("upload")} ${pendingCount} file${
                      pendingCount > 1 ? "s" : ""
                    }`}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default QuotationFileUploadModal;