"use client"
import ConfirmPopup from '@/src/components/ui/ConfirmPopup'
import FormButton from '@/src/components/ui/FormButton'
import { SALES_STATUS } from '@/src/constants/enum'
import { ChangeEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi'
import { toast } from 'react-toastify'
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

interface FormData {
  fullName: string
  email: string
  phone: string
  priority: string
  source: string
  projectType: string
  status: SALES_STATUS.NEW
  companyName: string
  city: string
  country: string | null
  postalCode: string | null
  language: string | null
  industry: string | null
  employeeRole: string
  employeeSeniority: string | null
  message: string | null
  membershipNotes: string | null
}

interface ReferralLead extends FormData {
  id: string
}

const Page = () => {
  const { t } = useTranslation()
  const [showTable, setShowTable] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [referralLeads, setReferralLeads] = useState<ReferralLead[]>([])
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    priority: "",
    source: "",
    projectType: "",
    status: SALES_STATUS.NEW,
    companyName: "",
    city: "",
    country: null,
    postalCode: null,
    language: null,
    industry: null,
    employeeRole: "",

    employeeSeniority: null,
    message: null,
    membershipNotes: null,
  })

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      priority: "",
      source: "",
      projectType: "",
      status: SALES_STATUS.NEW,
      companyName: "",
      city: "",
      country: null,
      postalCode: null,
      language: null,
      industry: null,
      employeeRole: "",
      employeeSeniority: null,
      message: null,
      membershipNotes: null,
    })
    setEditingId(null)
  }

  const handleAddToTable = () => {
    if (isMissingRequiredFields) {
      toast.error(t("please_fill_required_fields"))
      return
    }

    if (editingId) {
      // Update existing lead
      setReferralLeads(prev =>
        prev.map(lead =>
          lead.id === editingId ? { ...formData, id: editingId } : lead
        )
      )
    } else {
      // Add new lead
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
      priority: lead.priority,
      source: lead.source,
      projectType: lead.projectType,
      status: lead.status,
      companyName: lead.companyName,
      city: lead.city,
      country: lead.country,
      postalCode: lead.postalCode,
      language: lead.language,
      industry: lead.industry,
      employeeRole: lead.employeeRole,
      employeeSeniority: lead.employeeSeniority,
      message: lead.message,
      membershipNotes: lead.membershipNotes,
    })
    setEditingId(lead.id)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async(id: string) => {
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
        if(confirm){
             console.log('Submitting all leads:', referralLeads)
      // await submitAllReferrals(referralLeads)
      
      // Reset everything on success
      setReferralLeads([])
      setShowTable(false)
      resetForm()
      alert(t("leads_submitted_successfully"))

        }
     
    } catch (error) {
      console.error('Error submitting leads:', error)
      alert(t("error_submitting_leads"))
    } finally {
      setIsLoading(false)
    }
  }
  const handleSubmit =async(e: React.FormEvent<HTMLFormElement>)=>{
       e.preventDefault()

        setIsLoading(true)
         const confirm = await ConfirmPopup({
        title: t("are_you_sure_?"), 
        text: t("confirm_submitting_leads"), 
        btnTxt: t("yes_submit")
      });
        try{
            if(confirm){
 console.log("FormData:",formData)
            resetForm()
            }
           
        }catch(error){
            console.error('Error submitting leads:', error)
        }finally {
        setIsLoading(false)
        }

  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value || null }))
  }

  const isMissingRequiredFields = 
    !formData.fullName ||
    !formData.email ||
    !formData.phone ||
    !formData.companyName ||
    !formData.projectType

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
          {referralLeads.length > 0 && (
            <div className='bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-2'>
              <p className='text-cyan-700 font-semibold'>
                {t("total_leads")}: {referralLeads.length}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Basic Details Section */}
          <div>
            <div className='py-3 mb-6 border-b-2 border-cyan-600'>
              <h2 className='text-xl font-semibold text-slate-800'>
                {t("basic_details")}
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
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_email")}
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
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
                  {t("employee_role")}
                </label>
                <input
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_employee_role")}
                  name="employeeRole"
                  value={formData.employeeRole}
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
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all'
                  placeholder={t("enter_company_name")}
                  required
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                />
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

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("employee_seniority")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="employeeSeniority"
                  value={formData.employeeSeniority || ''}
                  onChange={handleChange}
                >
                  <option value="">{t("select_seniority")}</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lead Information Section */}
          <div>
            <div className='py-3 mb-6 border-b-2 border-cyan-600'>
              <h2 className='text-xl font-semibold text-slate-800'>
                {t("lead_information")}
              </h2>
            </div>
            
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("project_type")} <span className='text-red-500'>*</span>
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  required
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                >
                  <option value="">{t("select_project_type")}</option>
                  <option value="web_development">Web Development</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="software_development">Software Development</option>
                  <option value="consulting">Consulting</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
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
                  <option value="other">Other</option>
                </select>
              </div>

              <div className='flex flex-col'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("language")}
                </label>
                <select
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all bg-white'
                  name="language"
                  value={formData.language || ''}
                  onChange={handleChange}
                >
                  <option value="">{t("select_language")}</option>
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="chinese">Chinese</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className='flex flex-col md:col-span-2'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("message")}
                </label>
                <textarea
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all resize-none'
                  placeholder={t("enter_message")}
                  rows={4}
                  name="message"
                  value={formData.message || ''}
                  onChange={handleChange}
                />
              </div>

              <div className='flex flex-col md:col-span-2'>
                <label className='text-sm font-medium text-slate-700 mb-2'>
                  {t("membership_notes")}
                </label>
                <textarea
                  className='w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all resize-none'
                  placeholder={t("enter_membership_notes")}
                  rows={3}
                  name="membershipNotes"
                  value={formData.membershipNotes || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end gap-4 pt-6 border-t border-slate-200'>
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
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-slate-800'>
                {t("referral_leads_list")}
              </h2>
              <div className='text-sm text-slate-600'>
                {referralLeads.length} {t("lead(s)_added")}
              </div>
            </div>

            <div className='overflow-x-auto rounded-xl border border-slate-300 shadow-md'>
              <table className='w-full'>
                <thead className='bg-gradient-to-r from-cyan-600 to-cyan-700 text-white'>
                  <tr>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("s_no")}
                    </th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("full_name")}
                    </th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("email")}
                    </th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("phone")}
                    </th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("company_name")}
                    </th>
                    <th className='px-4 py-4 text-left text-sm font-semibold'>
                      {t("project_type")}
                    </th>
                    <th className='px-4 py-4 text-center text-sm font-semibold'>
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-slate-200'>
                  {referralLeads.map((lead, index) => (
                    <tr 
                      key={lead.id} 
                      className='hover:bg-slate-50 transition-colors duration-150'
                    >
                      <td className='px-4 py-4 text-sm text-slate-700'>
                        {index + 1}
                      </td>
                      <td className='px-4 py-4 text-sm text-slate-900 font-medium'>
                        {lead.fullName}
                      </td>
                      <td className='px-4 py-4 text-sm text-slate-700'>
                        {lead.email}
                      </td>
                      <td className='px-4 py-4 text-sm text-slate-700'>
                        {lead.phone}
                      </td>
                      <td className='px-4 py-4 text-sm text-slate-700'>
                        {lead.companyName}
                      </td>
                      <td className='px-4 py-4 text-sm'>
                        <span className='inline-flex px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800'>
                          {lead.projectType.replace('_', ' ')}
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

            {/* Submit All Button */}
            <div className='flex justify-end mt-6'>
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