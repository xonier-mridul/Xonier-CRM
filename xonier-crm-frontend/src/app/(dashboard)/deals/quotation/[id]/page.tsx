"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { QuotationStatus } from '@/src/constants/enum'
import Input from '@/src/components/ui/Input'
import Select from '@/src/components/ui/Select'
import axios from 'axios'
import extractErrorMessages from '@/src/app/utils/error.utils'
import { QuotationCreatePayload, QuotationLineItemPayload } from '@/src/types/quotations/quote.types'
import { QuoteService } from '@/src/services/quote.service'
import { toast } from 'react-toastify'
import ErrorComponent from '@/src/components/ui/ErrorComponent'
import SuccessComponent from '@/src/components/ui/SuccessComponent'
import { useParams, useRouter } from 'next/navigation'
import {
  IoDocumentText,
  IoSaveOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoCheckmarkCircle,
  IoCalendarOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoBusinessOutline,
  IoCashOutline,
  IoInformationCircleOutline,
  IoAlertCircleOutline,
  IoAddOutline,
  IoTrashOutline,
  IoListOutline,
  IoReceiptOutline,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoLocationOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
} from 'react-icons/io5'
import dealService from '@/src/services/deal.service'
import { ParamValue } from 'next/dist/server/request/params'
import { QuotationPaymentStatus, QuotationCurrency  } from '@/src/constants/enum'
import { useTranslation } from "react-i18next";


const CURRENCY_OPTIONS = Object.values(QuotationCurrency).map(c => ({
  label: c,
  value: c,
}))
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

const DEFAULT_PAYLOAD: QuotationCreatePayload = {
  title: '',
  description: '',
  deal: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  companyName: '',
  companyAddress: '',
  companyWebsite: '',
  lineItems: [],
currency: QuotationCurrency.USD,
  subTotal: 0,
  discountAmount: null,
  discountPercent: null,
  taxAmount: null,
  taxPercent: null,
  shippingAmount: null,
  total: 0,
  quotationStatus: QuotationStatus.SENT,
  paymentTerms: '',
  paymentMethod: '',
  issueDate: new Date().toISOString().split('T')[0],
  valid: '',
  termsAndConditions: '',
  notes: '',
  internalNotes: '',
  attachments: [],
}

// ─── Section Collapse Helper ───────────────────────────────────────────────────

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
        <span className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          {icon}
          {title}
        </span>
        {open
          ? <IoChevronUpOutline className="w-5 h-5 text-gray-400" />
          : <IoChevronDownOutline className="w-5 h-5 text-gray-400" />
        }
      </button>
      {open && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  )
}

// ─── Line Item Row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  index,
  symbol,
  onChange,
  onRemove,
}: {
  item: QuotationLineItemPayload
  index: number
  symbol: string
  onChange: (index: number, field: keyof QuotationLineItemPayload, value: any) => void
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-12 gap-2 items-start bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 mb-2">
      {/* Description */}
      <div className="col-span-12 sm:col-span-4">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("description")}</label>
        <input
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder={t("service_or_product")}
          value={item.description}
          onChange={e => onChange(index, 'description', e.target.value)}
        />
      </div>

      {/* Qty */}
      <div className="col-span-4 sm:col-span-1">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("qty_2")}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={item.quantity}
          onChange={e => onChange(index, 'quantity', parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Unit */}
      <div className="col-span-4 sm:col-span-1">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("unit")}</label>
        <input
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder={t("pcs")}
          value={item.unit || ''}
          onChange={e => onChange(index, 'unit', e.target.value)}
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-4 sm:col-span-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("unit_price_2")}</label>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{symbol}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 pl-6 pr-2 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={item.unitPrice}
            onChange={e => onChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Discount % */}
      <div className="col-span-4 sm:col-span-1">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("disc")}</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="0"
          value={item.discount ?? ''}
          onChange={e => onChange(index, 'discount', e.target.value === '' ? null : parseFloat(e.target.value))}
        />
      </div>

      {/* Tax % */}
      <div className="col-span-4 sm:col-span-1">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("tax")}</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="0"
          value={item.taxRate ?? ''}
          onChange={e => onChange(index, 'taxRate', e.target.value === '' ? null : parseFloat(e.target.value))}
        />
      </div>

      {/* Total */}
      <div className="col-span-4 sm:col-span-1">
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("total_2")}</label>
        <div className="text-sm font-semibold text-gray-900 dark:text-white py-2 px-1">
          {symbol}{item.total.toFixed(2)}
        </div>
      </div>

      {/* Remove */}
      <div className="col-span-4 sm:col-span-1 flex items-end justify-end pb-1">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title={t("remove_item")}
        >
          <IoTrashOutline className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Financial Summary Card ────────────────────────────────────────────────────

function FinancialSummary({
  form,
  symbol,
}: {
  form: QuotationCreatePayload
  symbol: string
}) {
  const { t } = useTranslation();
  const rows = [
    { label: 'Subtotal', value: form.subTotal },
    form.discountAmount ? { label: `Discount`, value: -form.discountAmount } : null,
    form.discountPercent ? { label: `Discount (${form.discountPercent}%)`, value: -(form.subTotal * form.discountPercent / 100) } : null,
    form.taxAmount ? { label: 'Tax', value: form.taxAmount } : null,
    form.taxPercent ? { label: `Tax (${form.taxPercent}%)`, value: form.subTotal * form.taxPercent / 100 } : null,
    form.shippingAmount ? { label: 'Shipping', value: form.shippingAmount } : null,
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
          <span className={`font-medium ${row.value < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {row.value < 0 ? `-${symbol}${Math.abs(row.value).toFixed(2)}` : `${symbol}${row.value.toFixed(2)}`}
          </span>
        </div>
      ))}
      <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
        <span className="font-bold text-gray-900 dark:text-white">{t("total_2")}</span>
        <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
          {symbol}{form.total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Page = () => {
  const { t } = useTranslation();
  const router = useRouter()
  const { id } = useParams()

  const [isLoading, setIsLoading] = useState(false)
  const [err, setErr] = useState<string[] | string>('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [formData, setFormData] = useState<QuotationCreatePayload>({
    ...DEFAULT_PAYLOAD,
    deal: Array.isArray(id) ? id[0] : id || '',
  })

const symbol = CURRENCY_SYMBOLS[formData.currency ?? QuotationCurrency.USD]

  // ── Fetch deal to pre-fill customer info ──────────────────────────────────

  useEffect(() => {
    if (!id) return
    const dealId = Array.isArray(id) ? id[0] : id
    setFormData(prev => ({ ...prev, deal: dealId }))
    getDeal(dealId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getDeal = async (dealId: ParamValue) => {
    try {
      const result = await dealService.getById(dealId)
      if (result.status === 200) {
        const data = result.data.data
        setFormData(prev => ({
          ...prev,
          customerName: data.lead_id?.fullName ?? '',
          customerEmail: data.lead_id?.email ?? '',
          customerPhone: data.lead_id?.phone ?? '',
          companyName: data.lead_id?.companyName ?? '',
        }))
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`)
      }
    }
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  const setField = (name: keyof QuotationCreatePayload, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (err) setErr('')
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setField(e.target.name as keyof QuotationCreatePayload, e.target.value)
  }

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value)
    setField(e.target.name as keyof QuotationCreatePayload, val ?? 0)
  }

  const handleNullableNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value)
    setField(e.target.name as keyof QuotationCreatePayload, val)
  }

  // ── Line item helpers ─────────────────────────────────────────────────────

  const computeLineItemTotal = (item: QuotationLineItemPayload): number => {
    let total = item.quantity * item.unitPrice
    if (item.discount) total = total * (1 - item.discount / 100)
    if (item.taxRate) total = total * (1 + item.taxRate / 100)
    return Math.round(total * 100) / 100
  }

  const updateLineItem = (index: number, field: keyof QuotationLineItemPayload, value: any) => {
    setFormData(prev => {
      const items = [...(prev.lineItems ?? [])]
      const updated = { ...items[index], [field]: value }
      updated.total = computeLineItemTotal(updated)
      items[index] = updated

      // Recompute subTotal from line items
      const subTotal = Math.round(items.reduce((sum, i) => sum + i.total, 0) * 100) / 100
      return { ...prev, lineItems: items, subTotal }
    })
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems ?? []), { ...EMPTY_LINE_ITEM }],
    }))
  }

  const removeLineItem = (index: number) => {
    setFormData(prev => {
      const items = (prev.lineItems ?? []).filter((_, i) => i !== index)
      const subTotal = Math.round(items.reduce((sum, i) => sum + i.total, 0) * 100) / 100
      return { ...prev, lineItems: items, subTotal }
    })
  }

  // ── Auto-compute total ────────────────────────────────────────────────────

  useEffect(() => {
    let total = formData.subTotal
    if (formData.discountAmount) total -= formData.discountAmount
    if (formData.discountPercent) total -= formData.subTotal * formData.discountPercent / 100
    if (formData.taxAmount) total += formData.taxAmount
    if (formData.taxPercent) total += formData.subTotal * formData.taxPercent / 100
    if (formData.shippingAmount) total += formData.shippingAmount
    setFormData(prev => ({ ...prev, total: Math.max(0, Math.round(total * 100) / 100) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.subTotal,
    formData.discountAmount,
    formData.discountPercent,
    formData.taxAmount,
    formData.taxPercent,
    formData.shippingAmount,
  ])

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: string[] = []
    if (!formData.title.trim()) errors.push('Quotation title is required')
    if (!formData.customerName.trim()) errors.push('Customer name is required')
    if (!formData.customerEmail.trim()) errors.push('Customer email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) errors.push('Invalid email format')
    if (!formData.deal) errors.push('Deal is required')
    if (!formData.issueDate) errors.push('Issue date is required')
    if (formData.subTotal <= 0) errors.push('Subtotal must be greater than 0')
    if (formData.total <= 0) errors.push('Total must be greater than 0')
    if (formData.customerPhone && formData.customerPhone.length < 7) errors.push('Phone number too short')
    if (errors.length > 0) { setErr(errors); return false }
    return true
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (status: QuotationStatus) => {
    if (!validate()) { toast.error('Please fix the errors before submitting'); return }

    setIsLoading(true)
    setErr('')
    setSuccess('')

    try {
      const payload: QuotationCreatePayload = {
        ...formData,
        quotationStatus: status,
        valid: formData.valid || null,
        lineItems: (formData.lineItems ?? []).filter(i => i.description.trim()),
      }

      const result = await QuoteService.create(payload)

      if (result.status === 200 || result.status === 201) {
        setSuccess('Quotation created successfully!')
        toast.success('Quotation created successfully!')
        setTimeout(() => router.push(`/quotations/view/${result.data.data.id}`), 1800)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error)
        setErr(messages)
        toast.error(`${messages}`)
      } else {
        setErr(['Something went wrong'])
        toast.error('Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (n: number) =>
    `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (s: string) =>
    s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

  const validityDays =
    formData.issueDate && formData.valid
      ? Math.ceil((new Date(formData.valid).getTime() - new Date(formData.issueDate).getTime()) / 86400000)
      : null

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IoDocumentText className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
            {t("new_quotation")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("fill_in_the_details_to_create")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showPreview
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <IoEyeOutline className="w-4 h-4" />
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      {/* ── Alerts ── */}
      <div className="mb-4">
        <ErrorComponent error={err} />
        <SuccessComponent message={success} />
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>

        {/* ── Form ── */}
        <div className={showPreview ? 'xl:col-span-2' : ''}>

          {/* 1. Basic Info */}
          <Section title={t("basic_information")} icon={<IoInformationCircleOutline className="w-5 h-5 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label={t("quotation_title_2")}
                  name="title"
                  value={formData.title}
                  onChange={handleInput}
                  placeholder={t("e_g_q4_2024_marketing_campaign")}
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
                  placeholder={t("brief_description_of_this_quotation")}
                  className="w-full"
                />
              </div>
              <Select
                label={t("currency")}
                name="currency"
                value={formData.currency ?? 'USD'}
                onChange={handleInput}
                options={CURRENCY_OPTIONS}
                className="w-full"
              />
              <Select
                label={t("status")}
                name="quotationStatus"
                value={formData.quotationStatus ?? QuotationStatus.SENT}
                onChange={handleInput}
                options={[QuotationStatus.DRAFT, QuotationStatus.SENT].map(s => ({
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                  value: s,
                }))}
                className="w-full"
              />
            </div>
          </Section>

          {/* 2. Customer Info */}
          <Section title={t("customer_information")} icon={<IoPersonOutline className="w-5 h-5 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t("customer_name_2")}
                name="customerName"
                value={formData.customerName}
                onChange={handleInput}
                placeholder={t("john_doe")}
                disabled
                className="w-full"
              />
              <Input
                label={t("email_address_2")}
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleInput}
                placeholder={t("john_example_com")}
                disabled
                className="w-full"
              />
              <Input
                label={t("phone_number")}
                name="customerPhone"
                type="tel"
                value={formData.customerPhone ?? ''}
                onChange={handleInput}
                placeholder="+1 555 123 4567"
                disabled
                className="w-full"
              />
              <Input
                label={t("company_name")}
                name="companyName"
                value={formData.companyName ?? ''}
                onChange={handleInput}
                placeholder={t("acme_corp")}
                disabled
                className="w-full"
              />
              <div className="md:col-span-2">
                <Input
                  label={t("company_address")}
                  name="companyAddress"
                  value={formData.companyAddress ?? ''}
                  onChange={handleInput}
                  placeholder={t("123_business_street_city_country")}
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label={t("company_website")}
                  name="companyWebsite"
                  value={formData.companyWebsite ?? ''}
                  onChange={handleInput}
                  placeholder="https://example.com"
                  className="w-full"
                />
              </div>
            </div>
          </Section>

          {/* 3. Line Items */}
          <Section title={t("line_items")} icon={<IoListOutline className="w-5 h-5 text-cyan-500" />}>
            {(formData.lineItems ?? []).length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                {t("no_line_items_yet_add_items")}
              </div>
            ) : (
              <>
                {(formData.lineItems ?? []).map((item, index) => (
                  <LineItemRow
                    key={index}
                    item={item}
                    index={index}
                    symbol={symbol}
                    onChange={updateLineItem}
                    onRemove={removeLineItem}
                  />
                ))}
              </>
            )}
            <button
              type="button"
              onClick={addLineItem}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-700 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
            >
              <IoAddOutline className="w-4 h-4" />
              {t("add_line_item")}
            </button>
          </Section>

          {/* 4. Financial Details */}
          <Section title={t("financial_details")} icon={<IoCashOutline className="w-5 h-5 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Subtotal — editable only when no line items */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("subtotal_2")}
                  {(formData.lineItems ?? []).length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">{t("auto_calculated_from_line_items")}</span>
                  )}
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{symbol}</span>
                  <input
                    type="number"
                    name="subTotal"
                    value={formData.subTotal}
                    onChange={handleNumber}
                    disabled={(formData.lineItems ?? []).length > 0}
                    step="0.01"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 pl-8 pr-4 py-2 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("discount_amount")}{symbol})
                </label>
                <input
                  type="number"
                  name="discountAmount"
                  value={formData.discountAmount ?? ''}
                  onChange={handleNullableNumber}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("discount_2")}
                </label>
                <input
                  type="number"
                  name="discountPercent"
                  value={formData.discountPercent ?? ''}
                  onChange={handleNullableNumber}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Tax */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("tax_amount")}{symbol})
                </label>
                <input
                  type="number"
                  name="taxAmount"
                  value={formData.taxAmount ?? ''}
                  onChange={handleNullableNumber}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("tax_rate")}
                </label>
                <input
                  type="number"
                  name="taxPercent"
                  value={formData.taxPercent ?? ''}
                  onChange={handleNullableNumber}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Shipping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping_2")}{symbol})
                </label>
                <input
                  type="number"
                  name="shippingAmount"
                  value={formData.shippingAmount ?? ''}
                  onChange={handleNullableNumber}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Total (read-only, auto-computed) */}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-5 py-4">
                  <span className="font-semibold text-gray-900 dark:text-white">{t("grand_total")}</span>
                  <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatCurrency(formData.total)}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* 5. Dates */}
          <Section title={t("validity_period")} icon={<IoCalendarOutline className="w-5 h-5 text-cyan-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t("issue_date")}
                name="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={handleInput}
                className="w-full"
              />
              <Input
                label={t("valid_until")}
                name="valid"
                type="date"
                value={formData.valid ?? ''}
                onChange={handleInput}
                min={formData.issueDate}
                className="w-full"
              />
              {validityDays !== null && validityDays > 0 && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                    <IoCalendarOutline className="w-4 h-4 text-cyan-500" />
                    {t("valid_for")} <span className="font-semibold text-gray-900 dark:text-white">{validityDays} {t("days,")}</span>
                    {t("expires")} {formatDate(formData.valid ?? '')}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* 6. Payment */}
          <Section title={t("payment_details")} icon={<IoReceiptOutline className="w-5 h-5 text-cyan-500" />} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t("payment_terms")}
                name="paymentTerms"
                value={formData.paymentTerms ?? ''}
                onChange={handleInput}
                placeholder={t("e_g_net_30_50_upfront")}
                className="w-full"
              />
              <Input
                label={t("payment_method")}
                name="paymentMethod"
                value={formData.paymentMethod ?? ''}
                onChange={handleInput}
                placeholder={t("e_g_bank_transfer_paypal")}
                className="w-full"
              />
            </div>
          </Section>

          {/* 7. Notes & Terms */}
          <Section title={t("notes_terms")} icon={<IoDocumentTextOutline className="w-5 h-5 text-cyan-500" />} defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("customer_facing_notes")}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes ?? ''}
                  onChange={handleInput}
                  rows={3}
                  placeholder={t("notes_visible_to_the_customer")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("internal_notes")}
                  <span className="ml-2 text-xs font-normal text-gray-400">{t("not_visible_to_customer")}</span>
                </label>
                <textarea
                  name="internalNotes"
                  value={formData.internalNotes ?? ''}
                  onChange={handleInput}
                  rows={3}
                  placeholder={t("internal_notes_for_your_team")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("terms_conditions")}
                </label>
                <textarea
                  name="termsAndConditions"
                  value={formData.termsAndConditions ?? ''}
                  onChange={handleInput}
                  rows={4}
                  placeholder={t("standard_terms_and_conditions")}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>
          </Section>

            <div className="mb-4">
        <ErrorComponent error={err} />
        <SuccessComponent message={success} />
      </div>

          {/* ── Action Buttons ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-6 py-5">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(QuotationStatus.DRAFT)}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <IoSaveOutline className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(QuotationStatus.SENT)}
                disabled={
                  isLoading ||
                  !formData.title.trim() ||
                  formData.total <= 0 ||
                  formData.subTotal <= 0
                }
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <IoCheckmarkCircle className="w-4 h-4" />
                {isLoading ? 'Creating...' : 'Create & Send'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Preview Panel ── */}
        {showPreview && (
          <div className="xl:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <IoEyeOutline className="w-5 h-5 text-cyan-500" />
                  {t("live_preview")}
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors xl:hidden"
                >
                  <IoCloseOutline className="w-4 h-4" />
                </button>
              </div>

              {/* Title + Status */}
              <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {formData.title || 'Untitled Quotation'}
                </p>
                <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                  {formData.quotationStatus}
                </span>
              </div>

              {/* Customer */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("customer")}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formData.customerName || '—'}</p>
                {formData.companyName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IoBusinessOutline className="w-3.5 h-3.5" /> {formData.companyName}
                  </p>
                )}
                {formData.customerEmail && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IoMailOutline className="w-3.5 h-3.5" /> {formData.customerEmail}
                  </p>
                )}
                {formData.customerPhone && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IoCallOutline className="w-3.5 h-3.5" /> {formData.customerPhone}
                  </p>
                )}
                {formData.companyWebsite && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IoGlobeOutline className="w-3.5 h-3.5" /> {formData.companyWebsite}
                  </p>
                )}
                {formData.companyAddress && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IoLocationOutline className="w-3.5 h-3.5" /> {formData.companyAddress}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("dates")}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("issue_date_2")}</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(formData.issueDate)}</span>
                </div>
                {formData.valid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t("valid_until")}</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(formData.valid)}</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {(formData.lineItems ?? []).length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("items")}</p>
                  {(formData.lineItems ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300 truncate max-w-[65%]">
                        {item.description || `Item ${i + 1}`}
                        <span className="text-gray-400 ml-1">×{item.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {symbol}{item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Summary */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t("summary")}</p>
                <FinancialSummary form={formData} symbol={symbol} />
              </div>

              {/* Validation hint */}
              {(formData.subTotal <= 0 || !formData.customerName || !formData.customerEmail || !formData.title) && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <IoAlertCircleOutline className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      {t("fill_in_all_required_fields_to")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page