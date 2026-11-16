"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  OrganizationPayload,
  OrganizationRecord,
  OrganizationService,
  PersonPayload,
  PersonRecord,
  PersonService,
} from "@/src/services/organization.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import { COMPANY_SIZE_OPTIONS } from "@/src/constants/company";
import { INDUSTRIES } from "@/src/constants/enum";

interface RelatedLead {
  id: string;
  lead_id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  source?: string | null;
  inDeal?: boolean;
  createdAt?: string | null;
}

interface RelatedDeal {
  id: string;
  deal_id: string;
  dealName: string;
  dealStage: string;
  amount: number;
  closeDate?: string | null;
  createdAt?: string | null;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currency = useCompanyCurrency();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [leads, setLeads] = useState<RelatedLead[]>([]);
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [activeTab, setActiveTab] = useState<"contacts" | "deals" | "leads">("contacts");

  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [orgForm, setOrgForm] = useState<OrganizationPayload>({ name: "" });
  const [savingOrg, setSavingOrg] = useState(false);

  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonPayload>({ fullName: "" });
  const [savingPerson, setSavingPerson] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await OrganizationService.getById(id);
      if (res.status === 200) {
        const data = res.data.data;
        setOrganization(data.organization);
        setPeople(data.people ?? []);
        setLeads(data.leads ?? []);
        setDeals(data.deals ?? []);
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to load company";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const openEditOrg = () => {
    if (!organization) return;
    setOrgForm({
      name: organization.name || "",
      cnpj: organization.cnpj || "",
      industry: organization.industry || "",
      size: organization.size || "",
      email: organization.email || "",
      phone: organization.phone || "",
      website: organization.website || "",
      city: organization.city || "",
      country: organization.country || "",
      address: organization.address || "",
      notes: organization.notes || "",
    });
    setEditOrgOpen(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSavingOrg(true);
    try {
      const res = await OrganizationService.update(organization.id, orgForm);
      if (res.status === 200) {
        toast.success("Company updated");
        setEditOrgOpen(false);
        await loadDetail();
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Update failed";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingOrg(false);
    }
  };

  const openAddContact = () => {
    setEditingPersonId(null);
    setPersonForm({
      fullName: "",
      organizationId: id,
      title: "",
      email: "",
      phone: "",
      linkedin: "",
      city: organization?.city || "",
      country: organization?.country || "",
      notes: "",
    });
    setPersonModalOpen(true);
  };

  const openEditContact = (person: PersonRecord) => {
    setEditingPersonId(person.id);
    setPersonForm({
      fullName: person.fullName || "",
      organizationId: id,
      title: person.title || "",
      email: person.email || "",
      phone: person.phone || "",
      linkedin: person.linkedin || "",
      city: person.city || "",
      country: person.country || "",
      notes: person.notes || "",
    });
    setPersonModalOpen(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerson(true);
    try {
      if (editingPersonId) {
        await PersonService.update(editingPersonId, personForm);
        toast.success("Contact updated");
      } else {
        await PersonService.create({ ...personForm, organizationId: id });
        toast.success("Contact added to company");
      }
      setPersonModalOpen(false);
      await loadDetail();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to save contact";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingPerson(false);
    }
  };

  const handleDeletePerson = async (person: PersonRecord) => {
    const { isConfirmed } = await ConfirmPopup({
      title: "Delete contact?",
      text: `Remove "${person.fullName}"?`,
      btnTxt: "Yes, delete",
    });
    if (!isConfirmed) return;
    try {
      await PersonService.delete(person.id);
      toast.success("Contact deleted");
      await loadDetail();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to delete contact";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-gray-400">
        Loading company details...
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600 dark:text-gray-300">Company not found.</p>
        <button
          type="button"
          onClick={() => router.push("/clients")}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  const totalPipeline = deals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-cyan-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Companies & Contacts
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {organization.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-gray-400 mt-1">
                {organization.cnpj && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 font-mono text-slate-700 dark:text-gray-200">
                    CNPJ: {organization.cnpj}
                  </span>
                )}
                {organization.industry && (
                  <span className="capitalize">{organization.industry.replace(/_/g, " ")}</span>
                )}
                {(organization.city || organization.country) && (
                  <span>· {[organization.city, organization.country].filter(Boolean).join(", ")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddContact}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
          <button
            type="button"
            onClick={openEditOrg}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
          >
            <Pencil className="w-4 h-4" />
            Edit Company
          </button>
        </div>
      </div>

      {/* Overview Metadata + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Company Profile
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
            <div>
              <p className="text-xs text-slate-400">CNPJ</p>
              <p className="font-medium text-slate-800 dark:text-white font-mono">{organization.cnpj || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Industry</p>
              <p className="font-medium text-slate-800 dark:text-white capitalize">
                {organization.industry ? organization.industry.replace(/_/g, " ") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Company Size</p>
              <p className="font-medium text-slate-800 dark:text-white">{organization.size || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="font-medium text-slate-800 dark:text-white break-all">{organization.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="font-medium text-slate-800 dark:text-white">{organization.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Website</p>
              {organization.website ? (
                <a
                  href={organization.website.startsWith("http") ? organization.website : `https://${organization.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-cyan-600 dark:text-cyan-400 hover:underline break-all"
                >
                  {organization.website}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <p className="font-medium text-slate-800 dark:text-white">—</p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-slate-400">Address</p>
              <p className="font-medium text-slate-800 dark:text-white">{organization.address || "—"}</p>
            </div>
            {organization.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-slate-400">Notes</p>
                <p className="font-medium text-slate-700 dark:text-gray-200 whitespace-pre-wrap">{organization.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Relationship Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-gray-700/60 p-3.5">
              <p className="text-xs text-slate-400">Contacts</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{people.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-gray-700/60 p-3.5">
              <p className="text-xs text-slate-400">Leads</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{leads.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-gray-700/60 p-3.5">
              <p className="text-xs text-slate-400">Deals</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{deals.length}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3.5">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Deal Value</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totalPipeline, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Contacts / Deals / Leads */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-gray-700 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "contacts"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Contacts ({people.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deals")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "deals"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Deals ({deals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "leads"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
            }`}
          >
            <Plus className="w-4 h-4" />
            Leads ({leads.length})
          </button>
        </div>

        {activeTab === "contacts" && (
          people.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No contacts linked to this company yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="rounded-xl border border-slate-200 dark:border-gray-700 p-4 flex flex-col justify-between gap-3 bg-slate-50/50 dark:bg-gray-700/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{person.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{person.title || "No title"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditContact(person)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePerson(person)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-gray-300 space-y-1">
                    <p>Email: {person.email || "—"}</p>
                    <p>Phone: {person.phone || "—"}</p>
                    {person.linkedin && (
                      <a
                        href={person.linkedin.startsWith("http") ? person.linkedin : `https://${person.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "deals" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-700 text-xs uppercase text-slate-500 dark:text-gray-400">
                  <th className="py-3 px-4">Deal ID</th>
                  <th className="py-3 px-4">Deal Name</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Close Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No deals linked to this company.
                    </td>
                  </tr>
                ) : (
                  deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{deal.deal_id}</td>
                      <td className="py-3 px-4 font-semibold">
                        <Link
                          href={`/deals/view/${deal.id}`}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {deal.dealName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 capitalize">{deal.dealStage.replace(/_/g, " ")}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(deal.amount || 0, currency)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-700 text-xs uppercase text-slate-500 dark:text-gray-400">
                  <th className="py-3 px-4">Lead ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No leads linked to this company.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{lead.lead_id}</td>
                      <td className="py-3 px-4 font-semibold">
                        <Link
                          href={`/leads/view/${lead.id}`}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {lead.fullName || lead.lead_id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 capitalize">{lead.status?.replace(/_/g, " ") || "—"}</td>
                      <td className="py-3 px-4 capitalize">{lead.source?.replace(/_/g, " ") || "—"}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-300">{lead.email || "—"}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-300">{lead.phone || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Company Modal */}
      {editOrgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveOrg}
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Edit Company</h3>
              <button type="button" onClick={() => setEditOrgOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company Name *</label>
                <input
                  required
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">CNPJ</label>
                <input
                  value={orgForm.cnpj ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, cnpj: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Industry</label>
                <select
                  value={orgForm.industry ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select industry</option>
                  {Object.values(INDUSTRIES).map((ind) => (
                    <option key={ind} value={ind}>
                      {ind.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Size</label>
                <select
                  value={orgForm.size ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, size: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select size</option>
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={orgForm.email ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                <input
                  value={orgForm.phone ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Website</label>
                <input
                  value={orgForm.website ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">City</label>
                <input
                  value={orgForm.city ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Country</label>
                <input
                  value={orgForm.country ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
                <input
                  value={orgForm.address ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={orgForm.notes ?? ""}
                  onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-900/30">
              <button
                type="button"
                onClick={() => setEditOrgOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingOrg}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60"
              >
                {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {personModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSavePerson}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingPersonId ? "Edit Contact" : "Add Contact to Company"}
              </h3>
              <button type="button" onClick={() => setPersonModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  required
                  value={personForm.fullName}
                  onChange={(e) => setPersonForm({ ...personForm, fullName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Job Title</label>
                <input
                  value={personForm.title ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={personForm.email ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                <input
                  value={personForm.phone ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">LinkedIn</label>
                <input
                  value={personForm.linkedin ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, linkedin: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={personForm.notes ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-900/30">
              <button
                type="button"
                onClick={() => setPersonModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPerson}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60"
              >
                {savingPerson && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPersonId ? "Save Changes" : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
