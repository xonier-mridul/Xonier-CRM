"use client"
import ConfirmPopup from '@/src/components/ui/ConfirmPopup'
import FormButton from '@/src/components/ui/FormButton'
import { SALES_STATUS } from '@/src/constants/enum'
import { requirementOptions } from '@/src/constants/referral'
import { ChangeEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiEdit2, FiTrash2, FiPlus, FiUploadCloud, FiSave, FiDownload, FiFileText } from 'react-icons/fi'
import { toast } from 'react-toastify'
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Lead capture form — PDD Section 5.2 "Lead Submission & Management"
// Includes: bulk CSV upload (parses file client-side and adds rows to the
// staging table — PDD 5.2 "Bulk lead upload via CSV"), CSV export,
// draft-save, duplicate hints.

const DRAFT_STORAGE_KEY = 'hrjee_referral_lead_draft'

interface FormData {
  fullName: string
  email: string
  phone: string
  jobTitle: string
  companyName: string
  companySize: string
  industry: string | null
  city: string
  country: string | null
  postalCode: string | null
  requirement: string
  dealType: string
  expectedDealValue: string
  priority: string
  source: string
  campaign: string | null
  status: SALES_STATUS.NEW
  notes: string | null
  partnerNotes: string | null
}

interface ReferralLead extends FormData {
  id: string
}

const emptyForm: FormData = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  companyName: "",
  companySize: "",
  industry: null,
  city: "",
  country: null,
  postalCode: null,
  requirement: "",
  dealType: "",
  expectedDealValue: "",
  priority: "",
  source: "",
  campaign: null,
  status: SALES_STATUS.NEW,
  notes: null,
  partnerNotes: null,
}

// Deal type options — must exactly match PDD Table 2.1 for commission engine mapping
const dealTypeOptions = [
  { value: "new_subscription", label: "new_subscription", commissionHint: "20% of first-year value" },
  { value: "renewal", label: "renewal", commissionHint: "10% of renewal value" },
  { value: "additional_license", label: "additional_license", commissionHint: "10% of incremental value" },
  { value: "upsell", label: "upsell", commissionHint: "20% of upsell value" },
  { value: "ai_addon", label: "ai_addon", commissionHint: "20% of add-on value" },
]

// Canonical column order for CSV import/export/template — keep these three
// (template, import parser, export) in sync if you ever add/remove a field.
const CSV_COLUMNS = [
  "fullName", "email", "phone", "jobTitle", "companyName", "companySize",
  "industry", "city", "country", "postalCode", "requirement", "dealType",
  "expectedDealValue", "priority", "source", "campaign", "notes", "partnerNotes",
] as const

type CsvColumn = typeof CSV_COLUMNS[number]

// ============================================================
// CSV Header Alias Map — makes import tolerant of both raw
// machine keys (fullName, dealType...) AND the friendly labels
// our own "Download CSV" export produces (Full Name, Deal Type...).
// This is what makes an exported file re-importable.
// ============================================================
const HEADER_ALIASES: Record<CsvColumn, string[]> = {
  fullName: ['fullName', 'full_name', 'full name', 'name', 'contact name', 's_no full name'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'contact number', 'mobile', 'mobile number'],
  jobTitle: ['jobTitle', 'job_title', 'job title', 'designation'],
  companyName: ['companyName', 'company_name', 'company name', 'company'],
  companySize: ['companySize', 'company_size', 'company size'],
  industry: ['industry'],
  city: ['city'],
  country: ['country'],
  postalCode: ['postalCode', 'postal_code', 'postal code', 'zip', 'zip code', 'zipcode'],
  requirement: ['requirement', 'requirements'],
  dealType: ['dealType', 'deal_type', 'deal type'],
  expectedDealValue: ['expectedDealValue', 'expected_deal_value', 'expected deal value', 'deal value', 'value'],
  priority: ['priority'],
  source: ['source', 'lead source'],
  campaign: ['campaign'],
  notes: ['notes', 'requirement_notes', 'requirement notes', 'requirementnotes', 'remarks', 'comments'],
  partnerNotes: ['partnerNotes', 'partner_notes', 'partner notes'],
}

// ============================================================
// CSV Parsing Utilities (RFC-4180-ish)
// ============================================================
function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(field)
        field = ''
      } else if (char === '\r' && nextChar === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i++
      } else if (char === '\n' || char === '\r') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += char
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully empty trailing rows
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

// Normalizes any header text to a comparable slug: lowercase, strip
// everything except a-z0-9. "Expected Deal Value" -> "expecteddealvalue"
function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Resolves a raw CSV cell value (which may be a machine value like
// "new_subscription" OR a display label like "New Subscription", since
// our own export writes labels) back to the canonical option.value.
function resolveOptionValue(
  raw: string,
  options: Array<{ value: string; label: string }>
): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  const valueMatch = options.find((o) => o.value.toLowerCase() === trimmed.toLowerCase())
  if (valueMatch) return valueMatch.value

  const labelMatch = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())
  if (labelMatch) return labelMatch.value

  const rawSlug = slugify(trimmed)
  const slugMatch = options.find(
    (o) => slugify(o.value) === rawSlug || slugify(o.label) === rawSlug
  )
  if (slugMatch) return slugMatch.value

  return rawSlug // best-effort fallback — row still imports
}

interface CsvImportResult {
  leads: ReferralLead[]
  skipped: number
  duplicates: number
}

function buildLeadsFromCsv(
  csvText: string,
  existingLeads: ReferralLead[],
  requirementOptionsResolved: Array<{ value: string; label: string }>,
  dealTypeOptionsResolved: Array<{ value: string; label: string }>
): CsvImportResult {
  const rows = parseCsvText(csvText)
  if (rows.length === 0) {
    return { leads: [], skipped: 0, duplicates: 0 }
  }

  const headerRow = rows[0].map((h) => normalizeHeader(h))
  const columnIndex: Partial<Record<CsvColumn, number>> = {}

  CSV_COLUMNS.forEach((col) => {
    const aliases = HEADER_ALIASES[col].map(normalizeHeader)
    const idx = headerRow.findIndex((h) => aliases.includes(h))
    if (idx !== -1) columnIndex[col] = idx
  })

  const dataRows = rows.slice(1)
  const newLeads: ReferralLead[] = []
  const seenEmailsInBatch = new Set<string>()
  let skipped = 0
  let duplicates = 0

  dataRows.forEach((row) => {
    const get = (col: CsvColumn): string => {
      const idx = columnIndex[col]
      return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : ''
    }

    const fullName = get('fullName')
    const email = get('email')
    const phone = get('phone')
    const companyName = get('companyName')
    const requirementRaw = get('requirement')
    const expectedDealValue = get('expectedDealValue')

    const isValid =
      fullName && email && phone && companyName && requirementRaw && expectedDealValue &&
      !isNaN(Number(expectedDealValue))

    if (!isValid) {
      skipped++
      return
    }

    const emailKey = email.toLowerCase()
    const alreadyExists =
      existingLeads.some((l) => l.email.toLowerCase() === emailKey) ||
      seenEmailsInBatch.has(emailKey)

    if (alreadyExists) {
      duplicates++
      return
    }
    seenEmailsInBatch.add(emailKey)

    const lead: ReferralLead = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fullName,
      email,
      phone,
      jobTitle: get('jobTitle'),
      companyName,
      companySize: get('companySize'),
      industry: get('industry') || null,
      city: get('city'),
      country: get('country') || null,
      postalCode: get('postalCode') || null,
      requirement: resolveOptionValue(requirementRaw, requirementOptionsResolved),
      dealType: resolveOptionValue(get('dealType'), dealTypeOptionsResolved),
      expectedDealValue,
      priority: get('priority'),
      source: get('source') || 'referral',
      campaign: get('campaign') || null,
      status: SALES_STATUS.NEW,
      notes: get('notes') || null,
      partnerNotes: get('partnerNotes') || null,
    }

    newLeads.push(lead)
  })

  return { leads: newLeads, skipped, duplicates }
}

const Page = () => {
  const { t } = useTranslation()
  const [showTable, setShowTable] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isCsvProcessing, setIsCsvProcessing] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [referralLeads, setReferralLeads] = useState<ReferralLead[]>([])
  const [hasDraft, setHasDraft] = useState<boolean>(false)
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false)
  const [duplicateCompanyWarning, setDuplicateCompanyWarning] = useState<boolean>(false)

  const [formData, setFormData] = useState<FormData>(emptyForm)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) setHasDraft(true)
    } catch {
      // ignore storage access issues
    }
  }, [])

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setDuplicateWarning(false)
    setDuplicateCompanyWarning(false)
  }

  const handleAddToTable = () => {
    if (isMissingRequiredFields) {
      toast.error(t("please_fill_required_fields"))
      return
    }

    if (editingId) {
      setReferralLeads(prev =>
        prev.map(lead =>
          lead.id === editingId ? { ...formData, id: editingId } : lead
        )
      )
    } else {
      const newLead: ReferralLead = {
        ...formData,
        id: Date.now().toString()
      }
      setReferralLeads(prev => [...prev, newLead])
    }

    setShowTable(true)
    resetForm()
  }

  const handleEdit = (lead: ReferralLead) => {
    setFormData({
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      jobTitle: lead.jobTitle,
      companyName: lead.companyName,
      companySize: lead.companySize,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      postalCode: lead.postalCode,
      requirement: lead.requirement,
      dealType: lead.dealType,
      expectedDealValue: lead.expectedDealValue,
      priority: lead.priority,
      source: lead.source,
      campaign: lead.campaign,
      status: lead.status,
      notes: lead.notes,
      partnerNotes: lead.partnerNotes,
    })
    setEditingId(lead.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const confirm = await ConfirmPopup({
      title: t("are_you_sure_?"),
      text: t("confirm_delete_lead"),
      btnTxt: t("yes,delete")
    });

    if (confirm) {
      setReferralLeads(prev => prev.filter(lead => lead.id !== id))
      if (referralLeads.length === 1) {
        setShowTable(false)
      }
    }
  }

  const handleSubmitAll = async () => {
    if (referralLeads.length === 0) {
      toast.error(t("no_leads_to_submit"))
      return
    }
    const confirm = await ConfirmPopup({
      title: t("are_you_sure_?"),
      text: t("confirm_submitting_all_leads"),
      btnTxt: t("yes_submit_all")
    });

    setIsLoading(true)

    try {
      if (confirm) {
        console.log('Submitting all leads:', referralLeads)
        // await submitAllReferrals(referralLeads)

        setReferralLeads([])
        setShowTable(false)
        resetForm()
        clearDraft()
        alert(t("leads_submitted_successfully"))
      }
    } catch (error) {
      console.error('Error submitting leads:', error)
      alert(t("error_submitting_leads"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    const confirm = await ConfirmPopup({
      title: t("are_you_sure_?"),
      text: t("confirm_submitting_leads"),
      btnTxt: t("yes_submit")
    });
    try {
      if (confirm) {
        console.log("FormData:", formData)
        resetForm()
        clearDraft()
      }
    } catch (error) {
      console.error('Error submitting leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value || null } as FormData))

    if (name === 'email' && value) {
      const emailTaken = referralLeads.some(
        (lead) => lead.email.toLowerCase() === value.toLowerCase() && lead.id !== editingId
      )
      setDuplicateWarning(emailTaken)
    }

    if (name === 'companyName' && value) {
      const companyTaken = referralLeads.some(
        (lead) => lead.companyName.trim().toLowerCase() === value.trim().toLowerCase() && lead.id !== editingId
      )
      setDuplicateCompanyWarning(companyTaken)
    }
  }

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData))
      setHasDraft(true)
      toast.success(t("draft_saved"))
      setFormData(emptyForm)
    } catch {
      toast.error(t("draft_save_failed"))
    }
  }

  const handleResumeDraft = () => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        setFormData(JSON.parse(saved))
        toast.info(t("draft_restored"))
      }
    } catch {
      toast.error(t("draft_restore_failed"))
    }
  }

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
    } catch {
      // ignore
    }
  }

  // ============================================================
  // Bulk CSV Upload — PDD 5.2 "Bulk lead upload via CSV"
  // Parses file, maps columns (also handles friendly labels from our
  // own export), skips duplicates/invalid rows, appends to table.
  // ============================================================
  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error(t("invalid_csv_file"))
      e.target.value = ""
      return
    }

    setIsCsvProcessing(true)
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string

        // Resolve actual translated label text here — must match exactly
        // what handleDownloadCsv wrote using the same t() calls.
        const requirementOptionsResolved = requirementOptions.map((o) => ({
          value: o.value,
          label: o.label, // already display text
        }))
        const dealTypeOptionsResolved = dealTypeOptions.map((o) => ({
          value: o.value,
          label: t(o.label), // translation key → display text
        }))

        const { leads, skipped, duplicates } = buildLeadsFromCsv(
          text,
          referralLeads,
          requirementOptionsResolved,
          dealTypeOptionsResolved
        )

        if (leads.length === 0) {
          if (duplicates > 0 && skipped === 0) {
            // Every row parsed fine but all were already in the table
            toast.info(t("csv_import_all_duplicates", { count: duplicates }))
          } else {
            toast.error(t("csv_no_valid_leads"))
          }
          setIsCsvProcessing(false)
          e.target.value = ""
          return
        }

        setReferralLeads((prev) => [...prev, ...leads])
        setShowTable(true)

        const parts = [t("csv_import_added", { count: leads.length })]
        if (duplicates > 0) parts.push(t("csv_import_duplicates_skipped", { count: duplicates }))
        if (skipped > 0) parts.push(t("csv_import_invalid_skipped", { count: skipped }))
        toast.success(parts.join(' · '))
      } catch (error) {
        console.error('CSV parse error:', error)
        toast.error(t("csv_parse_failed"))
      } finally {
        setIsCsvProcessing(false)
        e.target.value = ""
      }
    }

    reader.onerror = () => {
      toast.error(t("csv_parse_failed"))
      setIsCsvProcessing(false)
      e.target.value = ""
    }

    reader.readAsText(file)
  }

  // Downloadable blank template
  const handleDownloadTemplate = () => {
    const headers = CSV_COLUMNS.join(',')
    const sampleRow = [
      "Jane Doe", "jane.doe@example.com", "+919876543210", "HR Manager",
      "Acme Corp", "51-200", "technology", "Mumbai", "India", "400001",
      "hrms", "new_subscription", "250000", "high", "referral", "Q3-Campaign",
      "Needs payroll + attendance modules", "Warm intro via existing client",
    ].join(',')

    const csvContent = `${headers}\n${sampleRow}`
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'hrjee_referral_leads_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.info(t("template_downloaded"))
  }

  // ============================================================
  // CSV Export of staged leads (must match import-friendly headers)
  // ============================================================
  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const getDealTypeLabel = (value: string) =>
    dealTypeOptions.find((d) => d.value === value)?.label
      ? t(dealTypeOptions.find((d) => d.value === value)!.label)
      : value

  const getRequirementLabel = (value: string) =>
    requirementOptions.find((r) => r.value === value)?.label || value

  const handleDownloadCsv = () => {
    if (referralLeads.length === 0) {
      toast.error(t("no_leads_to_export"))
      return
    }

    const headers = [
      t("s_no"), t("full_name"), t("email"), t("phone"), t("job_title"),
      t("company_name"), t("company_size"), t("industry"), t("city"),
      t("country"), t("postal_code"), t("requirement"), t("deal_type"),
      t("expected_deal_value"), t("priority"), t("source"), t("campaign"),
      t("stage"), t("requirement_notes"), t("partner_notes"),
    ]

    const rows = referralLeads.map((lead, index) => [
      index + 1, lead.fullName, lead.email, lead.phone, lead.jobTitle,
      lead.companyName, lead.companySize, lead.industry ?? '', lead.city,
      lead.country ?? '', lead.postalCode ?? '', getRequirementLabel(lead.requirement),
      getDealTypeLabel(lead.dealType), lead.expectedDealValue, lead.priority,
      lead.source, lead.campaign ?? '', t("new"), lead.notes ?? '',
      lead.partnerNotes ?? '',
    ])

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().split('T')[0]
    link.href = url
    link.setAttribute('download', `referral_leads_${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(t("csv_downloaded_successfully"))
  }

  const isMissingRequiredFields =
    !formData.fullName ||
    !formData.email ||
    !formData.phone ||
    !formData.companyName ||
    !formData.requirement ||
    !formData.expectedDealValue

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4'>
      <div className='max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-6 md:p-10'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-slate-800 mb-2'>
              {t("referral_leads_form")}
            </h1>
            <p className='text-slate-600 text-sm'>
              {editingId ? t("editing_referral_lead") : t("add_new_referral_lead")}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            {hasDraft && !editingId && (
              <button
                type='button'
                onClick={handleResumeDraft}
                className='text-sm font-medium text-cyan-700 hover:underline border border-slate-300 rounded-2xl px-4 py-2 outline-none'
              >
                {t("resume_draft")}
              </button>
            )}
            <button
              type='button'
              onClick={handleDownloadTemplate}
              className='flex items-center gap-2  text-sm text-slate-500 hover:text-cyan-700 transition-all  border border-slate-300 rounded-2xl px-4 py-2 outline-none'
              title={t("download_csv_template")}
            >
              <FiFileText className='text-base' />
              {t("download_csv_template")}
            </button>
            <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg text-sm cursor-pointer transition-all ${
              isCsvProcessing
                ? 'border-cyan-300 text-cyan-500 cursor-wait'
                : 'border-slate-300 text-slate-600 hover:border-cyan-400 hover:text-cyan-700'
            }`}>
              <FiUploadCloud className='text-lg' />
              {isCsvProcessing ? t("processing") : t("bulk_upload_csv")}
              <input
                type='file'
                accept='.csv'
                className='hidden'
                onChange={handleCsvUpload}
                disabled={isCsvProcessing}
              />
            </label>
          
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Contact Details Section */}
          <div>
            <div className='py-3 mb-6 border-b-2 border-cyan-600'>
              <h2 className='text-xl font-semibold text-slate-800'>
                {t("contact_details")}
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("full_name")} <span className='text-red-500'>*</span>
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_full_name")}
                  required
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("email")} <span className='text-red-500'>*</span>
                </label>
                <input
                  type="email"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all ${duplicateWarning ? 'border-amber-400' : 'border-slate-300'}`}
                  placeholder={t("enter_email")}
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {duplicateWarning && (
                  <p className='mt-1.5 text-xs text-amber-600'>
                    {t("duplicate_lead_warning")}
                  </p>
                )}
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("phone")} <span className='text-red-500'>*</span>
                </label>
                <PhoneInput
                  country="in"
                  enableSearch
                  value={formData.phone}
                  onChange={(phone) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone,
                    }))
                  }
                  containerStyle={{ width: "100%" }}
                  inputStyle={{
                    width: "100%",
                    height: "48px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    paddingLeft: "58px",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  buttonStyle={{
                    border: "1px solid #CBD5E1",
                    borderRight: "none",
                    borderTopLeftRadius: "8px",
                    borderBottomLeftRadius: "8px",
                    background: "#fff",
                  }}
                />
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("job_title")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_job_title")}
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Company Details Section */}
          <div>
            <div className='py-3 mb-6 border-b-2 border-cyan-600'>
              <h2 className='text-xl font-semibold text-slate-800'>
                {t("company_details")}
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("company_name")} <span className='text-red-500'>*</span>
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all ${duplicateCompanyWarning ? 'border-amber-400' : 'border-slate-300'}`}
                  placeholder={t("enter_company_name")}
                  required
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                />
                {duplicateCompanyWarning && (
                  <p className='mt-1.5 text-xs text-amber-600'>
                    {t("duplicate_company_warning")}
                  </p>
                )}
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("company_size")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                >
                  <option value="">{t("select_company_size")}</option>
                  <option value="1-50">1–50 {t("employees")}</option>
                  <option value="51-200">51–200 {t("employees")}</option>
                  <option value="201-500">201–500 {t("employees")}</option>
                  <option value="501-1000">501–1000 {t("employees")}</option>
                  <option value="1000+">1000+ {t("employees")}</option>
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("industry")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                >
                  <option value="">{t("select_industry")}</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("city")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_city")}
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("country")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_country")}
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("postal_code")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_postal_code")}
                  name="postalCode"
                  value={formData.postalCode || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Lead / Opportunity Details Section */}
          <div>
            <div className='py-3 mb-6 border-b-2 border-cyan-600'>
              <h2 className='text-xl font-semibold text-slate-800'>
                {t("lead_information")}
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("requirement")} <span className='text-red-500'>*</span>
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  required
                  name="requirement"
                  value={formData.requirement}
                  onChange={handleChange}
                >
                  <option value="">{t("select_requirement")}</option>
                  {requirementOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("expected_deal_value")} <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm'>$</span>
                  <input
                    type="number"
                    min="0"
                    className='w-full p-3 pl-7 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                    placeholder={t("enter_expected_deal_value")}
                    required
                    name="expectedDealValue"
                    value={formData.expectedDealValue}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("deal_type")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="dealType"
                  value={formData.dealType}
                  onChange={handleChange}
                >
                  <option value="">{t("select_deal_type")}</option>
                  {dealTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </option>
                  ))}
                </select>
                {formData.dealType && (
                  <p className='mt-1.5 text-xs text-slate-500'>
                    {t("commission_rate")}:{' '}
                    {dealTypeOptions.find((d) => d.value === formData.dealType)?.commissionHint}
                  </p>
                )}
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("priority")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="">{t("select_priority")}</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("source")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                >
                  <option value="">{t("select_source")}</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="social_media">Social Media</option>
                  <option value="email">Email</option>
                  <option value="event">Event</option>
                  <option value="cold_outreach">Cold Outreach</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("campaign")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_campaign")}
                  name="campaign"
                  value={formData.campaign || ''}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col md:col-span-2'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("requirement_notes")}
                </label>
                <textarea
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all resize-none'
                  placeholder={t("enter_requirement_notes")}
                  rows={4}
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col md:col-span-2'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("partner_notes")}
                </label>
                <textarea
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all resize-none'
                  placeholder={t("enter_partner_notes")}
                  rows={3}
                  name="partnerNotes"
                  value={formData.partnerNotes || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap justify-end gap-4 pt-6 border-t border-slate-200'>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className='px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all duration-200'
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className='flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-all duration-200'
            >
              <FiSave className='text-lg' />
              {t("save_draft")}
            </button>
            <button
              type="button"
              onClick={handleAddToTable}
              disabled={isMissingRequiredFields}
              className='flex items-center gap-2 px-6 py-3 border-2 border-cyan-600 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
            >
              <FiPlus className='text-lg' />
              {editingId ? t("update_in_table") : t("add_to_table")}
            </button>
            <FormButton
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              isLoading={isLoading}
              disabled={isLoading || isMissingRequiredFields}
            >
              {t("submit_leads")}
            </FormButton>
          </div>
        </form>

        {/* Referral Leads Table */}
        {showTable && referralLeads.length > 0 && (
          <div className='mt-10'>
            <div className='flex flex-wrap justify-between items-center mb-6 gap-3'>
              <h2 className='text-2xl font-bold text-slate-800'>
                {t("referral_leads_list")}
              </h2>
              <div className='flex items-center gap-4'>
                <div className='text-sm text-slate-600'>
                  {referralLeads.length} {t("lead(s)_added")}
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className='flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-cyan-400 hover:text-cyan-700 transition-all duration-200'
                  title={t("download_csv")}
                >
                  <FiDownload className='text-base' />
                  {t("download_csv")}
                </button>
              </div>
            </div>

            <div className='overflow-x-auto rounded-xl border border-slate-300 shadow-md'>
              <table className='w-full'>
                <thead className='bg-gradient-to-r from-cyan-600 to-cyan-700 text-white'>
                  <tr>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("s_no")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("full_name")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("email")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("phone")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("company_name")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("requirement")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("deal_type")}</th>
                    <th className='px-4 py-4 text-right text-sm font-semibold'>{t("expected_deal_value")}</th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>{t("stage")}</th>
                    <th className='px-4 py-4 text-center text-sm font-semibold'>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-slate-200'>
                  {referralLeads.map((lead, index) => (
                    <tr key={lead.id} className='hover:bg-slate-50 transition-colors duration-150'>
                      <td className='px-4 py-4 text-sm text-slate-700'>{index + 1}</td>
                      <td className='px-4 py-4 text-sm text-slate-900 font-medium'>{lead.fullName}</td>
                      <td className='px-4 py-4 text-sm text-slate-700'>{lead.email}</td>
                      <td className='px-4 py-4 text-sm text-slate-700'>{lead.phone}</td>
                      <td className='px-4 py-4 text-sm text-slate-700'>{lead.companyName}</td>
                      <td className='px-4 py-4 text-sm'>
                        <span className='inline-flex px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800'>
                          {getRequirementLabel(lead.requirement).replace('_', ' ')}
                        </span>
                      </td>
                      <td className='px-4 py-4 text-sm'>
                        <span className='inline-flex px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800'>
                          {getDealTypeLabel(lead.dealType)}
                        </span>
                      </td>
                      <td className='px-4 py-4 text-sm text-slate-700 text-right'>
                        {lead.expectedDealValue ? `$${Number(lead.expectedDealValue).toLocaleString()}` : '—'}
                      </td>
                      <td className='px-4 py-4 text-sm'>
                        <span className='inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700'>
                          {t("new")}
                        </span>
                      </td>
                      <td className='px-4 py-4'>
                        <div className='flex justify-center gap-2'>
                          <button
                            onClick={() => handleEdit(lead)}
                            className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150'
                            title={t("edit")}
                          >
                            <FiEdit2 className='text-lg' />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150'
                            title={t("delete")}
                          >
                            <FiTrash2 className='text-lg' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex flex-wrap justify-end gap-3 mt-6'>
           
              <FormButton
                onClick={handleSubmitAll}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {t("submit_all_leads")} ({referralLeads.length})
              </FormButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page