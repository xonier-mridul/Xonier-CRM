"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { QuoteService } from "@/src/services/quote.service";
import { QuotationStatus } from "@/src/constants/enum";
import { Quotation, QuotationUpdatePayload } from "@/src/types/quotations/quote.types";

import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import SuccessComponent from "@/src/components/ui/SuccessComponent";

import {
  IoSaveOutline,
  IoArrowBack,
  IoDocumentText,
  IoInformationCircleOutline,
  IoCashOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoMailOutline,
  IoCallOutline,
  IoBusinessOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircle,
} from "react-icons/io5";

const Page = () => {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string[] | string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const [original, setOriginal] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState<QuotationUpdatePayload>({});

  /* ---------------- FETCH QUOTATION ---------------- */
  const fetchQuotation = async () => {
    setIsInitialLoading(true);
    try {
      const res = await QuoteService.get_by_id(String(id));
      const data: Quotation = res.data.data;

      setOriginal(data);

      setFormData({
        title: data.title,
        description: data.description,
        issueDate: data.issueDate,
        valid: data.valid,
        subTotal: data.subTotal,
        total: data.total,
        quotationStatus: data.quotationStatus,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const messages = extractErrorMessages(err);
        setError(messages);
        toast.error(`${messages}`);
      } else {
        setError("Something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchQuotation();
    
  }, [id]);


  const diffPayload = useMemo(() => {
    if (!original) return {};

    const payload: QuotationUpdatePayload = {};

    Object.entries(formData).forEach(([key, value]) => {
      const originalValue = (original as any)[key];
      if (value !== originalValue) {
        (payload as any)[key] = value;
      }
    });

    return payload;
  }, [formData, original]);

  const hasChanges = Object.keys(diffPayload).length > 0;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    if (error) setError("");
  };

  const handleUpdate = async () => {
    if (!hasChanges) {
      toast.info("No changes to update");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await QuoteService.update(String(id), diffPayload);
      setSuccess("Quotation updated successfully!");
      toast.success("Quotation updated successfully");
      
      setTimeout(() => {
        router.push(`/quotations/view/${id}`);
      }, 1500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = extractErrorMessages(err);
        setError(msg);
        toast.error(`${msg}`);
      } else {
        setError("Something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

const getStatusColor = (status: QuotationStatus) => {
  const colors = {
    [QuotationStatus.DRAFT]:
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',

    [QuotationStatus.SENT]:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',

    [QuotationStatus.UPDATED]:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',

    [QuotationStatus.RESEND]:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',

    [QuotationStatus.VIEWED]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',

    [QuotationStatus.ACCEPTED]:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',

    [QuotationStatus.REJECTED]:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',

    [QuotationStatus.DELETE]:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',

    [QuotationStatus.EXPIRED]:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return colors[status] || colors[QuotationStatus.DRAFT];
};


  /* ---------------- LOADING STATE ---------------- */
  if (isInitialLoading) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading quotation...</p>
          </div>
        </div>
      </div>
    );
  }


  if (!original) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Quotation Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The quotation you're trying to edit doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

 
  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <IoDocumentText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Update Quotation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Editing quotation: <span className="font-semibold">{original.quoteId}</span>
            </p>
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showPreview
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <IoEyeOutline className="w-5 h-5" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Error and Success Messages */}
      <div className="mb-6">
        <ErrorComponent error={error} />
        <SuccessComponent message={success} />
      </div>

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="mb-6 p-4 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <IoAlertCircleOutline className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                You have unsaved changes
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {Object.keys(diffPayload).length} field{Object.keys(diffPayload).length > 1 ? 's' : ''} modified: {Object.keys(diffPayload).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <IoInformationCircleOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Quotation Title"
                  name="title"
                  value={formData.title || ""}
                  onChange={handleChange}
                  placeholder="Enter quotation title"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  type="textarea"
                  label="Description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder="Enter quotation description..."
                  className="w-full"
                />
              </div>

              {/* <Select
                label="Status"
                name="quotationStatus"
                value={formData.quotationStatus}
                onChange={handleChange}
                required
                placeholder="Select status"
                options={Object.values(QuotationStatus).map(s => ({
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                  value: s,
                }))}
                className="w-full"
              /> */}
            </div>
          </section>


          <section className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <IoPersonOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Customer Information
              <span className="ml-auto text-xs font-normal text-gray-500 dark:text-gray-400">(Read-only)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Customer Name"
                name="customerName"
                value={original.customerName}
                disabled
                className="w-full"
              />

              <Input
                label="Company Name"
                name="companyName"
                value={original.companyName || "N/A"}
                disabled
                className="w-full"
              />

              <Input
                label="Email Address"
                name="customerEmail"
                type="email"
                value={original.customerEmail}
                disabled
                className="w-full"
              />

              <Input
                label="Phone Number"
                name="customerPhone"
                type="tel"
                value={original.customerPhone || "N/A"}
                disabled
                className="w-full"
              />
            </div>
          </section>

          {/* Financial Information */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <IoCashOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Financial Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="number"
                label="Subtotal"
                name="subTotal"
                value={formData.subTotal ?? 0}
                onChange={handleNumberChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full"
              />

              <Input
                type="number"
                label="Total Amount"
                name="total"
                value={formData.total ?? 0}
                onChange={handleNumberChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full"
              />

              {(formData.total ?? 0) !== (formData.subTotal ?? 0) && (formData.subTotal ?? 0) > 0 && (
                <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Tax/Adjustments: {formatCurrency((formData.total ?? 0) - (formData.subTotal ?? 0))}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        The difference between subtotal and total
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Date Information */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <IoCalendarOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Validity Period
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="date"
                label="Issue Date"
                name="issueDate"
                value={formData.issueDate || ""}
                onChange={handleChange}
                required
                className="w-full"
              />

              <Input
                type="date"
                label="Valid Until"
                name="valid"
                value={formData.valid || ""}
                onChange={handleChange}
                min={formData.issueDate}
                className="w-full"
              />

              {formData.issueDate && formData.valid && (
                <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Validity Duration:</span>{' '}
                    {Math.ceil(
                      (new Date(formData.valid).getTime() - new Date(formData.issueDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={!hasChanges || loading || (original.quotationStatus === QuotationStatus.DELETE)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <IoSaveOutline className="w-5 h-5" />
                {loading ? 'Updating...' : 'Update Quotation'}
              </button>
            </div>
          </section>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <IoEyeOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Live Preview
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors lg:hidden"
                >
                  <IoCloseOutline className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Header */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">QUOTATION ID</p>
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-300 mb-3">
                    {original.quoteId}
                  </p>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {formData.title || 'Untitled Quotation'}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.quotationStatus!)}`}>
                    {formData.quotationStatus?.charAt(0).toUpperCase()}{formData.quotationStatus?.slice(1)}
                  </span>
                  
                  {hasChanges && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <IoAlertCircleOutline className="w-4 h-4" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">CUSTOMER</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {original.customerName}
                    </p>
                    {original.companyName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IoBusinessOutline className="w-4 h-4" />
                        {original.companyName}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <IoMailOutline className="w-4 h-4" />
                      {original.customerEmail}
                    </p>
                    {original.customerPhone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IoCallOutline className="w-4 h-4" />
                        {original.customerPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Issue Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(formData.issueDate || "")}
                      </span>
                    </div>
                    {formData.valid && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Valid Until:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(formData.valid)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">FINANCIAL SUMMARY</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(formData.subTotal ?? 0)}
                      </span>
                    </div>
                    {(formData.total ?? 0) !== (formData.subTotal ?? 0) && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tax/Adjustments:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency((formData.total ?? 0) - (formData.subTotal ?? 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(formData.total ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {formData.description && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">DESCRIPTION</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {formData.description}
                    </p>
                  </div>
                )}

                {/* Modified Fields Indicator */}
                {hasChanges && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <IoCheckmarkCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Modified Fields:
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {Object.keys(diffPayload).map(key => key.charAt(0).toUpperCase() + key.slice(1)).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
