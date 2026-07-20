"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { QuoteService } from "@/src/services/quote.service";
import { QuotationStatus, QuotationCurrency } from "@/src/constants/enum";
import { Quotation, QuotationUpdatePayload, QuotationLineItemPayload } from "@/src/types/quotations/quote.types";

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
  IoListOutline,
  IoAddOutline,
  IoTrashOutline,
  IoReceiptOutline,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
} from "react-icons/io5";
import { useTranslation } from "react-i18next";

const CURRENCY_SYMBOLS: Record<QuotationCurrency, string> = {
  [QuotationCurrency.USD]: '$',
  [QuotationCurrency.EUR]: '€',
  [QuotationCurrency.GBP]: '£',
  [QuotationCurrency.INR]: '₹',
  [QuotationCurrency.AED]: 'د.إ',
  [QuotationCurrency.SAR]: '﷼',
  [QuotationCurrency.PKR]: '₨',
  [QuotationCurrency.CAD]: 'CA$',
  [QuotationCurrency.AUD]: 'A$',
}

const EMPTY_LINE_ITEM: QuotationLineItemPayload = {
  description: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
  discount: null,
  taxRate: null,
  total: 0,
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          {icon}
          {title}
        </span>
        {open
          ? <IoChevronUpOutline className="w-4 h-4 text-gray-400" />
          : <IoChevronDownOutline className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  )
}

const Page = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string[] | string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [original, setOriginal] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState<QuotationUpdatePayload>({});

  const fetchQuotation = async () => {
    setIsInitialLoading(true);
    try {
      const res = await QuoteService.get_by_id(String(id));
      const data: Quotation = res.data.data;
      setOriginal(data);
      setFormData({
        title: data.title,
        description: data.description ?? '',
        issueDate: data.issueDate,
        valid: data.valid ?? '',
        subTotal: data.subTotal,
        total: data.total,
        discountAmount: data.discountAmount ?? null,
        discountPercent: data.discountPercent ?? null,
        taxAmount: data.taxAmount ?? null,
        taxPercent: data.taxPercent ?? null,
        shippingAmount: data.shippingAmount ?? null,
        lineItems: data.lineItems ?? [],
        paymentTerms: data.paymentTerms ?? '',
        paymentMethod: data.paymentMethod ?? '',
        notes: data.notes ?? '',
        internalNotes: data.internalNotes ?? '',
        termsAndConditions: data.termsAndConditions ?? '',
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
      if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
        (payload as any)[key] = value;
      }
    });
    return payload;
  }, [formData, original]);

  const hasChanges = Object.keys(diffPayload).length > 0;

  const symbol = original ? (CURRENCY_SYMBOLS[original.currency] ?? '$') : '$';

  const setField = (name: keyof QuotationUpdatePayload, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setField(e.target.name as keyof QuotationUpdatePayload, e.target.value);
  };

  const handleNullableNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    setField(e.target.name as keyof QuotationUpdatePayload, val);
  };

  const computeLineItemTotal = (item: QuotationLineItemPayload): number => {
    let total = item.quantity * item.unitPrice;
    if (item.discount) total = total * (1 - item.discount / 100);
    if (item.taxRate) total = total * (1 + item.taxRate / 100);
    return Math.round(total * 100) / 100;
  };

  const updateLineItem = (index: number, field: keyof QuotationLineItemPayload, value: any) => {
    setFormData(prev => {
      const items = [...(prev.lineItems ?? [])];
      const updated = { ...items[index], [field]: value };
      updated.total = computeLineItemTotal(updated);
      items[index] = updated;
      const subTotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
      return { ...prev, lineItems: items, subTotal };
    });
  };

  const addLineItem = () => {
    setFormData(prev => ({ ...prev, lineItems: [...(prev.lineItems ?? []), { ...EMPTY_LINE_ITEM }] }));
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => {
      const items = (prev.lineItems ?? []).filter((_, i) => i !== index);
      const subTotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
      return { ...prev, lineItems: items, subTotal };
    });
  };

  useEffect(() => {
    let total = formData.subTotal ?? 0;
    if (formData.discountAmount) total -= formData.discountAmount;
    if (formData.discountPercent) total -= (formData.subTotal ?? 0) * formData.discountPercent / 100;
    if (formData.taxAmount) total += formData.taxAmount;
    if (formData.taxPercent) total += (formData.subTotal ?? 0) * formData.taxPercent / 100;
    if (formData.shippingAmount) total += formData.shippingAmount;
    setFormData(prev => ({ ...prev, total: Math.max(0, Math.round(total * 100) / 100) }));
  }, [
    formData.subTotal,
    formData.discountAmount,
    formData.discountPercent,
    formData.taxAmount,
    formData.taxPercent,
    formData.shippingAmount,
  ]);

  const handleUpdate = async () => {
    if (!hasChanges) { toast.info("No changes to update"); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await QuoteService.update(String(id), diffPayload);
      setSuccess("Quotation updated successfully!");
      toast.success("Quotation updated successfully");
      setTimeout(() => router.push(`/quotations/view/${id}`), 1500);
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

  const fmt = (n: number) =>
    `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // const formatDate = (s: string) =>
  //   s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const { i18n } = useTranslation();

const formatDate = (s: string) =>
  s
    ? new Date(s).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const getStatusColor = (status: QuotationStatus) => {
    const colors: Record<QuotationStatus, string> = {
      [QuotationStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      [QuotationStatus.SENT]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      [QuotationStatus.UPDATED]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      [QuotationStatus.RESEND]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      [QuotationStatus.VIEWED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [QuotationStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.DELETE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.EXPIRED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[status] || colors[QuotationStatus.DRAFT];
  };

  const validityDays = formData.issueDate && formData.valid
    ? Math.ceil((new Date(formData.valid).getTime() - new Date(formData.issueDate).getTime()) / 86400000)
    : null;

  const hasLineItems = (formData.lineItems ?? []).length > 0;

  if (isInitialLoading) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("loading_quotation")}</p>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("quotation_not_found")}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("the_quotation_you're_trying_to_edit")}
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              {t("go_back")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IoDocumentText className="w-6 h-6 text-cyan-500" />
            {t("update_quotation")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("editing")} <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{original.quoteId}</span>
           {" "} {original.currency} ({symbol})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showPreview
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
          }`}
        >
          <IoEyeOutline className="w-4 h-4" />
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      <div className="mb-4">
        <ErrorComponent error={error} />
        <SuccessComponent message={success} />
      </div>

      {hasChanges && (
        <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <IoAlertCircleOutline className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t("unsaved_changes")}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {Object.keys(diffPayload).length} {t("field")}{Object.keys(diffPayload).length > 1 ? 's' : ''} {t("modified_2")}{' '}
                {Object.keys(diffPayload).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-5 ${showPreview ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={showPreview ? 'xl:col-span-2' : ''}>

          <Section title={t("basic_information")} icon={<IoInformationCircleOutline className="w-4 h-4 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label={t("quotation_title")}
                  name="title"
                  value={formData.title ?? ''}
                  onChange={handleInput}
                  placeholder={t("enter_quotation_title")}
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  type="textarea"
                  label={t("description_2")}
                  name="description"
                  value={formData.description ?? ''}
                  onChange={handleInput}
                  placeholder={t("enter_description")}
                  className="w-full"
                />
              </div>
            </div>
          </Section>

          <Section title={t("customer_information")} icon={<IoPersonOutline className="w-4 h-4 text-cyan-500" />}>
            <p className="text-xs text-gray-400 mb-4 -mt-1">{t("customer_details_are_read_only_and")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("customer_name")} name="customerName" value={original.customerName} disabled className="w-full" />
              <Input label={t("company_name")} name="companyName" value={original.companyName ?? '—'} disabled className="w-full" />
              <Input label={t("email")} name="customerEmail" type="email" value={original.customerEmail} disabled className="w-full" />
              <Input label={t("phone")} name="customerPhone" type="tel" value={original.customerPhone ?? '—'} disabled className="w-full" />
            </div>
          </Section>

          <Section title={t("line_items")} icon={<IoListOutline className="w-4 h-4 text-cyan-500" />}>
            {(formData.lineItems ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t("no_line_items_add_items_to")}</p>
            ) : (
              (formData.lineItems ?? []).map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 mb-2">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("description")}</label>
                    <input
                      className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder={t("service_or_product")}
                      value={item.description}
                      onChange={e => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("qty")}</label>
                    <input type="number" min="0" step="0.01"
                      className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={item.quantity}
                      onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("unit")}</label>
                    <input
                      className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder={t("pcs")}
                      value={item.unit ?? ''}
                      onChange={e => updateLineItem(index, 'unit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("unit_price")}</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{symbol}</span>
                      <input type="number" min="0" step="0.01"
                        className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 pl-6 pr-2 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        value={item.unitPrice}
                        onChange={e => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("disc")}</label>
                    <input type="number" min="0" max="100" step="0.01" placeholder="0"
                      className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={item.discount ?? ''}
                      onChange={e => updateLineItem(index, 'discount', e.target.value === '' ? null : parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("tax")}</label>
                    <input type="number" min="0" max="100" step="0.01" placeholder="0"
                      className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={item.taxRate ?? ''}
                      onChange={e => updateLineItem(index, 'taxRate', e.target.value === '' ? null : parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("total_2")}</label>
                    <p className="text-sm font-bold text-gray-900 dark:text-white py-2 px-1">{fmt(item.total)}</p>
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex items-end justify-end pb-1">
                    <button type="button" onClick={() => removeLineItem(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <IoTrashOutline className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
            <button type="button" onClick={addLineItem}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-700 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors">
              <IoAddOutline className="w-4 h-4" />
              {t("add_line_item")}
            </button>
          </Section>

          <Section title={t("financial_details")} icon={<IoCashOutline className="w-4 h-4 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("subtotal")}
                  {hasLineItems && <span className="ml-2 text-xs font-normal text-gray-400">{t("auto_calculated")}</span>}
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{symbol}</span>
                  <input type="number" name="subTotal" step="0.01" min="0"
                    value={formData.subTotal ?? 0}
                    onChange={handleNullableNumber}
                    disabled={hasLineItems}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 pl-8 pr-4 py-2 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
             






              {[
                {label: `${t("discount_amount")} (${symbol})`, name: 'discountAmount', val: formData.discountAmount },
                {  label: `${t("discount")} (%)`, name: 'discountPercent', val: formData.discountPercent },
                {label: `${t("tax_amount")} (${symbol})`, name: 'taxAmount', val: formData.taxAmount },
                { label: `${t("tax_rate")} (%)`, name: 'taxPercent', val: formData.taxPercent },
                { label: `${t("shipping")} (${symbol})`, name: 'shippingAmount', val: formData.shippingAmount },
              ].map(({ label, name, val }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input type="number" name={name} min="0" step="0.01" placeholder="0"
                    value={val ?? ''}
                    onChange={handleNullableNumber}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ))}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-5 py-4">
                  <span className="font-semibold text-gray-900 dark:text-white">{t("grand_total")}</span>
                  <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{fmt(formData.total ?? 0)}</span>
                </div>
              </div>
            </div>
          </Section>

          <Section title={t("validity_period")} icon={<IoCalendarOutline className="w-4 h-4 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("issue_date")} name="issueDate" type="date" value={formData.issueDate ?? ''} onChange={handleInput} className="w-full" />
              <Input label={t("valid_until")} name="valid" type="date" value={formData.valid ?? ''} onChange={handleInput} min={formData.issueDate} className="w-full" />
              {validityDays !== null && validityDays > 0 && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                    <IoCalendarOutline className="w-4 h-4 text-cyan-500" />
                    {t("valid_for")} <span className="font-semibold text-gray-900 dark:text-white">{validityDays} {t("days")}</span>
                    {t("expires")} {formatDate(formData.valid ?? '')}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title={t("payment_details")} icon={<IoReceiptOutline className="w-4 h-4 text-cyan-500" />} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("payment_terms")} name="paymentTerms" value={formData.paymentTerms ?? ''} onChange={handleInput} placeholder={t("e_g_net_30")} className="w-full" />
              <Input label={t("payment_method")} name="paymentMethod" value={formData.paymentMethod ?? ''} onChange={handleInput} placeholder={t("e_g_bank_transfer")} className="w-full" />
            </div>
          </Section>

          <Section title={t("notes_terms")} icon={<IoDocumentTextOutline className="w-4 h-4 text-cyan-500" />} defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("customer_notes")}</label>
                <textarea name="notes" rows={3} value={formData.notes ?? ''}
                  onChange={handleInput}
                  placeholder={t("notes_visible_to_the_customer")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("internal_notes")}
                  <span className="ml-2 text-xs font-normal text-gray-400">{t("not_visible_to_customer")}</span>
                </label>
                <textarea name="internalNotes" rows={3} value={formData.internalNotes ?? ''}
                  onChange={handleInput}
                  placeholder={t("internal_notes_for_your_team")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("terms_conditions")}</label>
                <textarea name="termsAndConditions" rows={4} value={formData.termsAndConditions ?? ''}
                  onChange={handleInput}
                  placeholder={t("standard_terms_and_conditions")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>
          </Section>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-6 py-5">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button type="button" onClick={() => router.back()} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                {t("cancel")}
              </button>
              <button type="button" onClick={handleUpdate}
                disabled={!hasChanges || loading || original.quotationStatus === QuotationStatus.DELETE}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <IoSaveOutline className="w-4 h-4" />
                {loading ? t('updating') : t('update_quotation')}
              </button>
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="xl:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <IoEyeOutline className="w-4 h-4 text-cyan-500" />
                  {t("live_preview")}
                </h2>
                <button onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors xl:hidden">
                  <IoCloseOutline className="w-4 h-4" />
                </button>
              </div>

              <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-1 font-mono">{original.quoteId}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{formData.title || 'Untitled'}</p>
                <span className={`mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(formData.quotationStatus!)}`}>
                  {formData.quotationStatus}
                </span>
                {hasChanges && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <IoAlertCircleOutline className="w-3.5 h-3.5" />
                    {t("unsaved_changes")}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("customer")}</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{original.customerName}</p>
                {original.companyName && (
                  <p className="text-xs text-gray-500 flex items-center gap-1"><IoBusinessOutline className="w-3.5 h-3.5" />{original.companyName}</p>
                )}
                <p className="text-xs text-gray-500 flex items-center gap-1"><IoMailOutline className="w-3.5 h-3.5" />{original.customerEmail}</p>
                {original.customerPhone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1"><IoCallOutline className="w-3.5 h-3.5" />{original.customerPhone}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{t("issue_date_2")}</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(formData.issueDate ?? '')}</span>
                </div>
                {formData.valid && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{t("valid_until")}</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(formData.valid)}</span>
                  </div>
                )}
              </div>

              {hasLineItems && (
                <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("items")}</p>
                  {(formData.lineItems ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300 truncate max-w-[60%]">
                        {item.description || `Item ${i + 1}`}
                        <span className="text-gray-400 ml-1">×{item.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("summary")}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{t("subtotal")}</span>
                  <span className="text-gray-900 dark:text-white">{fmt(formData.subTotal ?? 0)}</span>
                </div>
                {formData.discountAmount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-500">{t("discount")}</span>
                    <span className="text-emerald-500">-{fmt(formData.discountAmount)}</span>
                  </div>
                )}
                {formData.taxAmount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{t("tax_2")}</span>
                    <span className="text-gray-900 dark:text-white">+{fmt(formData.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{t("total_2")}</span>
                  <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">{fmt(formData.total ?? 0)}</span>
                </div>
              </div>

              {hasChanges && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-100 dark:border-cyan-800">
                    <div className="flex items-start gap-2">
                      <IoCheckmarkCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-cyan-900 dark:text-cyan-100 mb-1">{t("modified")}</p>
                        <p className="text-xs text-cyan-700 dark:text-cyan-300">
                          {Object.keys(diffPayload).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;