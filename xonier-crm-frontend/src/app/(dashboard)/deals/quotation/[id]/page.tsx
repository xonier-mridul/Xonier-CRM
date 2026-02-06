"use client"
import React, { useState, useEffect } from 'react'
import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import { QuotationStatus } from '@/src/constants/enum'
import Input from '@/src/components/ui/Input'
import Select from '@/src/components/ui/Select'
import axios from 'axios'
import extractErrorMessages from '@/src/app/utils/error.utils'
import { QuotationCreatePayload } from '@/src/types/quotations/quote.types'
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
  IoArrowBack,
  IoAlertCircleOutline
} from 'react-icons/io5'
import dealService from '@/src/services/deal.service'
import { ParamValue } from 'next/dist/server/request/params'

const Page = () => {
  const router = useRouter()
  const { id } = useParams()
  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [err, setErr] = useState<string[] | string>("")
  const [success, setSuccess] = useState<string>("")
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [deals, setDeals] = useState<any[]>([])
  const [formData, setFormData] = useState<QuotationCreatePayload>({
    title: "",
    description: "",
    deal: Array.isArray(id) ? id[0] : id || "", 
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    subTotal: 0,
    total: 0,
    quotationStatus: QuotationStatus.DRAFT,
    issueDate: new Date().toISOString().split('T')[0],
    valid: null
  })

 
  useEffect(() => {
    if (id) {
      setFormData(prev => ({
        ...prev,
        deal: Array.isArray(id) ? id[0] : id
      }))
    }
  }, [id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (err) setErr("")
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }))
    if (err) setErr("")



  }

  const getDeal = async(id:ParamValue)=>{
    try {
      const result = await dealService.getById(id)

      if(result.status === 200){
        const data = result.data.data
        console.log("deal data: ", result.data.data)

        setFormData({...formData,
          customerName: data.lead_id.fullName ?? "",
           customerEmail: data.lead_id.email ?? "",
            customerPhone: data.lead_id.phone ?? "",
             companyName: data.lead_id.companyName ?? ""

        })
      }
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error)
        setErr(messages)
        toast.error(`${messages}`)
      } else {
        setErr(["Something went wrong"])
        toast.error("Something went wrong")
      }
      
    }
  }



  const validateForm = (): boolean => {
    const errors: string[] = []

    if (!formData.customerName.trim()) errors.push("Customer name is required")
    if (!formData.customerEmail.trim()) errors.push("Customer email is required")
    if (!formData.deal) errors.push("Deal selection is required")
    if (!formData.issueDate) errors.push("Issue date is required")
    if (formData.subTotal <= 0) errors.push("Subtotal must be greater than 0")
    if (formData.total <= 0) errors.push("Total must be greater than 0")


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.customerEmail && !emailRegex.test(formData.customerEmail)) {
      errors.push("Invalid email format")
    }


    if (formData.customerPhone && formData.customerPhone.length < 10) {
      errors.push("Phone number should be at least 10 digits")
    }

    if (errors.length > 0) {
      setErr(errors)
      return false
    }

    return true
  }

  const calculateTotal = () => {

    if (formData.subTotal > 0 && formData.total === 0) {
      setFormData(prev => ({
        ...prev,
        total: prev.subTotal
      }))
    }
  }

  useEffect(() => {
    calculateTotal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.subTotal])

  useEffect(() => {
    if(!id) return 

    getDeal(id)
  }, [])
  

  const handleSubmit = async (e: React.FormEvent, status?: QuotationStatus) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setIsLoading(true)
    setErr("")
    setSuccess("")

    try {
      const payload = {
        ...formData,
        valid: formData.valid || null,
        quotationStatus: status || formData.quotationStatus
      }

      const result = await QuoteService.create(payload)

      if (result.status === 200 || result.status === 201) {
        setSuccess("Quotation created successfully!")
        toast.success("Quotation created successfully!")
        setFormData({
          ...formData,
          title:"",
          description:"",
          subTotal: 0,
    total: 0,

    issueDate: new Date().toISOString().split('T')[0],
    valid: ""
        })
    
        setTimeout(() => {
          router.push(`/quotations/view/${result.data.data.id}`)
        }, 2000)
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error)
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error)
        setErr(messages)
        toast.error(`${messages}`)
      } else {
        setErr(["Something went wrong"])
        toast.error("Something went wrong")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAsDraft = (e: React.FormEvent) => {
    handleSubmit(e, QuotationStatus.DRAFT)
  }

  const handleSendQuotation = (e: React.FormEvent) => {
    handleSubmit(e, QuotationStatus.SENT)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: QuotationStatus) => {
    const colors = {
      [QuotationStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      [QuotationStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [QuotationStatus.RESEND]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [QuotationStatus.UPDATED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [QuotationStatus.VIEWED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [QuotationStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.EXPIRED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      [QuotationStatus.DELETE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || colors[QuotationStatus.DRAFT]
  }

  return (
    <div className={`ml-72 mt-14 p-6  min-h-screen`}>

      <div className="mb-6">
      

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <IoDocumentText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Create New Quotation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Fill in the details below to create a new quotation for your customer
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
        <ErrorComponent error={err} />
        <SuccessComponent message={success} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl  border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IoInformationCircleOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Quotation Title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Q4 2024 Marketing Campaign"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    type="textarea"
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter quotation description..."
                    className="w-full"
                  />
                </div>

                

                <Select
      label="Status"
      name="quotationStatus"
      value={formData.quotationStatus}
      onChange={handleInputChange}
      required
      placeholder="Select status"
      options={Object.values(QuotationStatus).map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status
      }))}
      className="w-full"
    />
  
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white dark:bg-gray-700 rounded-xl  border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IoPersonOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Customer Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Customer Name"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  disabled
                  required
                  placeholder="John Doe"
                  className="w-full"
                />

                <Input
                  label="Company Name"
                  name="companyName"
                  value={formData.companyName || ""}
                  onChange={handleInputChange}
                  placeholder="Acme Corporation"
                  className="w-full"
                  disabled
                />

                <Input
                  label="Email Address"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="john@example.com"
                  className="w-full"
                  disabled
                />

                <Input
                  label="Phone Number"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone || ""}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full"
                  disabled
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl  border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IoCashOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Financial Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Subtotal"
                  name="subTotal"
                  type="number"
                  value={formData.subTotal}
                  onChange={handleNumberChange}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full"
                />

                <Input
                  label="Total Amount"
                  name="total"
                  type="number"
                  value={formData.total}
                  onChange={handleNumberChange}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full"
                />

                {formData.total !== formData.subTotal && formData.subTotal > 0 && (
                  <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Tax/Adjustments: {formatCurrency(formData.total - formData.subTotal)}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          The difference between subtotal and total
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IoCalendarOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Validity Period
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Issue Date"
                  name="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />

                <Input
                  label="Valid Until"
                  name="valid"
                  type="date"
                  value={formData.valid || ""}
                  onChange={handleInputChange}
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
            </div>

            {/* Action Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl  border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  // disabled={isLoading}
                  disabled
                  title='Coming soon'
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <IoSaveOutline className="w-5 h-5" />
                  {isLoading ? 'Saving...' : 'Save as Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSendQuotation}
                  disabled={isLoading || formData.title.trim() === "" || formData.quotationStatus.trim() === "" || formData.total === 0 || formData.subTotal === 0}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <IoCheckmarkCircle className="w-5 h-5" />
                  {isLoading ? 'Creating...' : 'Create & Send'}
                </button>
              </div>
            </div>
          </form>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {formData.title || 'Untitled Quotation'}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.quotationStatus)}`}>
                    {formData.quotationStatus.charAt(0).toUpperCase() + formData.quotationStatus.slice(1)}
                  </span>
                </div>

                {/* Customer Info */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">CUSTOMER</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formData.customerName || 'Customer Name'}
                    </p>
                    {formData.companyName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IoBusinessOutline className="w-4 h-4" />
                        {formData.companyName}
                      </p>
                    )}
                    {formData.customerEmail && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IoMailOutline className="w-4 h-4" />
                        {formData.customerEmail}
                      </p>
                    )}
                    {formData.customerPhone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IoCallOutline className="w-4 h-4" />
                        {formData.customerPhone}
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
                        {formatDate(formData.issueDate)}
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
                        {formatCurrency(formData.subTotal)}
                      </span>
                    </div>
                    {formData.total !== formData.subTotal && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tax/Adjustments:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(formData.total - formData.subTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(formData.total)}
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

                {/* Validation Warning */}
                {(formData.subTotal <= 0 || formData.total <= 0 || !formData.customerName || !formData.customerEmail) && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-2">
                        <IoAlertCircleOutline className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          Please fill in all required fields to create the quotation
                        </p>
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
  )
}

export default Page