"use client";

import React, { JSX, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Building2,
  ExternalLink,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import Pagination from "@/src/components/common/pagination";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import { COMPANY_SIZE_OPTIONS } from "@/src/constants/company";
import { INDUSTRIES } from "@/src/constants/enum";

type ActiveTab = "organizations" | "people";

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const emptyOrgForm: OrganizationPayload = {
  name: "",
  cnpj: "",
  industry: "",
  size: "",
  email: "",
  phone: "",
  website: "",
  city: "",
  country: "",
  address: "",
  notes: "",
};

const emptyPersonForm: PersonPayload = {
  fullName: "",
  organizationId: "",
  title: "",
  email: "",
  phone: "",
  linkedin: "",
  city: "",
  country: "",
  notes: "",
};

const ClientsMasterPage = (): JSX.Element => {
  const currency = useCompanyCurrency();
  const [activeTab, setActiveTab] = useState<ActiveTab>("organizations");

  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [orgPage, setOrgPage] = useState(1);
  const [orgTotalPages, setOrgTotalPages] = useState(1);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [summary, setSummary] = useState({
    totalOrganizations: 0,
    totalPeople: 0,
    linkedLeads: 0,
    linkedDeals: 0,
  });

  // People state
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personPage, setPersonPage] = useState(1);
  const [personTotalPages, setPersonTotalPages] = useState(1);
  const [loadingPeople, setLoadingPeople] = useState(false);

  // Filters & actions
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Company modal
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<OrganizationPayload>(emptyOrgForm);
  const [savingOrg, setSavingOrg] = useState(false);

  // Contact modal
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonPayload>(emptyPersonForm);
  const [savingPerson, setSavingPerson] = useState(false);
  const [allOrgOptions, setAllOrgOptions] = useState<OrganizationRecord[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setOrgPage(1);
      setPersonPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await OrganizationService.getAll(
        orgPage,
        10,
        searchQuery ? { search: searchQuery } : undefined
      );
      if (res.status === 200) {
        const payload = res.data.data;
        setOrganizations(payload.data ?? []);
        setOrgTotalPages(payload.pagination?.totalPages ?? 1);
        if (payload.summary) setSummary(payload.summary);
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to load companies";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setLoadingOrgs(false);
    }
  }, [orgPage, searchQuery]);

  const fetchPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const res = await PersonService.getAll(
        personPage,
        10,
        searchQuery ? { search: searchQuery } : undefined
      );
      if (res.status === 200) {
        const payload = res.data.data;
        setPeople(payload.data ?? []);
        setPersonTotalPages(payload.pagination?.totalPages ?? 1);
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to load contacts";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setLoadingPeople(false);
    }
  }, [personPage, searchQuery]);

  const loadOrgOptions = useCallback(async () => {
    try {
      const res = await OrganizationService.getAll(1, 100);
      if (res.status === 200) {
        setAllOrgOptions(res.data?.data?.data ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (activeTab === "people") {
      void fetchPeople();
    }
  }, [activeTab, fetchPeople]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await OrganizationService.sync();
      const data = res.data?.data;
      toast.success(
        `Synced ${data?.syncedLeads ?? 0} lead(s) and ${data?.syncedDeals ?? 0} deal(s)`
      );
      await fetchOrganizations();
      if (activeTab === "people") await fetchPeople();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Sync failed";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSyncing(false);
    }
  };

  const openCreateOrg = () => {
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
    setOrgModalOpen(true);
  };

  const openEditOrg = (org: OrganizationRecord) => {
    setEditingOrgId(org.id);
    setOrgForm({
      name: org.name || "",
      cnpj: org.cnpj || "",
      industry: org.industry || "",
      size: org.size || "",
      email: org.email || "",
      phone: org.phone || "",
      website: org.website || "",
      city: org.city || "",
      country: org.country || "",
      address: org.address || "",
      notes: org.notes || "",
    });
    setOrgModalOpen(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSavingOrg(true);
    try {
      if (editingOrgId) {
        const res = await OrganizationService.update(editingOrgId, orgForm);
        if (res.status === 200) toast.success("Company updated successfully");
      } else {
        const res = await OrganizationService.create(orgForm);
        if (res.status === 201) toast.success("Company created successfully");
      }
      setOrgModalOpen(false);
      await fetchOrganizations();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to save company";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingOrg(false);
    }
  };

  const handleDeleteOrg = async (org: OrganizationRecord) => {
    const { isConfirmed } = await ConfirmPopup({
      title: "Delete company?",
      text: `Are you sure you want to delete "${org.name}"? Linked leads and deals will keep their records without this company link.`,
      btnTxt: "Yes, delete",
    });
    if (!isConfirmed) return;
    try {
      const res = await OrganizationService.delete(org.id);
      if (res.status === 200) {
        toast.success("Company deleted successfully");
        await fetchOrganizations();
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to delete company";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    }
  };

  const openCreatePerson = async () => {
    await loadOrgOptions();
    setEditingPersonId(null);
    setPersonForm(emptyPersonForm);
    setPersonModalOpen(true);
  };

  const openEditPerson = async (person: PersonRecord) => {
    await loadOrgOptions();
    setEditingPersonId(person.id);
    setPersonForm({
      fullName: person.fullName || "",
      organizationId: person.organizationId || "",
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
    if (!personForm.fullName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setSavingPerson(true);
    try {
      if (editingPersonId) {
        const res = await PersonService.update(editingPersonId, personForm);
        if (res.status === 200) toast.success("Contact updated successfully");
      } else {
        const res = await PersonService.create(personForm);
        if (res.status === 201) toast.success("Contact created successfully");
      }
      setPersonModalOpen(false);
      await fetchPeople();
      await fetchOrganizations();
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
      text: `Are you sure you want to delete "${person.fullName}"?`,
      btnTxt: "Yes, delete",
    });
    if (!isConfirmed) return;
    try {
      const res = await PersonService.delete(person.id);
      if (res.status === 200) {
        toast.success("Contact deleted successfully");
        await fetchPeople();
        await fetchOrganizations();
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to delete contact";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            Companies & Contacts
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Master customer accounts (with CNPJ) and contact people linked across Leads and Deals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Leads"}
          </button>
          <button
            type="button"
            onClick={openCreatePerson}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
          >
            <Plus className="w-4 h-4" />
            New Contact
          </button>
          <button
            type="button"
            onClick={openCreateOrg}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" />
            New Company
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Companies", value: summary.totalOrganizations, color: "text-cyan-600 dark:text-cyan-400" },
          { label: "Total Contacts", value: summary.totalPeople, color: "text-violet-600 dark:text-violet-400" },
          { label: "Linked Leads", value: summary.linkedLeads, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Linked Deals", value: summary.linkedDeals, color: "text-amber-600 dark:text-amber-400" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
              {card.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("organizations")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "organizations"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Companies ({summary.totalOrganizations})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("people")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "people"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              Contacts ({summary.totalPeople})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                activeTab === "organizations"
                  ? "Search company, CNPJ, industry, city..."
                  : "Search contact name, email, phone, company..."
              }
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {activeTab === "organizations" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-gray-700 text-xs uppercase text-slate-500 dark:text-gray-400">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">CNPJ</th>
                    <th className="py-3 px-4">Industry</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Contacts</th>
                    <th className="py-3 px-4 text-center">Leads</th>
                    <th className="py-3 px-4 text-center">Deals</th>
                    <th className="py-3 px-4 text-right">Deal Value</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingOrgs ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Loading companies...
                      </td>
                    </tr>
                  ) : organizations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No companies found. Click &ldquo;New Company&rdquo; or &ldquo;Sync from Leads&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <Link
                            href={`/organizations/${org.id}`}
                            className="text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            {org.name}
                          </Link>
                          {org.email && (
                            <p className="text-xs font-normal text-slate-400">{org.email}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300 font-mono text-xs">
                          {org.cnpj || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300 capitalize">
                          {org.industry ? org.industry.replace(/_/g, " ") : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {[org.city, org.country].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-gray-200">
                          {org.peopleCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-gray-200">
                          {org.leadsCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-gray-200">
                          {org.dealsCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(org.totalDealAmount ?? 0, currency)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/organizations/${org.id}`}
                              title="View company 360°"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEditOrg(org)}
                              title="Edit company"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrg(org)}
                              title="Delete company"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={orgPage}
              totalPages={orgTotalPages}
              onPageChange={(p) => setOrgPage(p)}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-gray-700 text-xs uppercase text-slate-500 dark:text-gray-400">
                    <th className="py-3 px-4">Contact Name</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">LinkedIn</th>
                    <th className="py-3 px-4 text-center">Leads / Deals</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {loadingPeople ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading contacts...
                      </td>
                    </tr>
                  ) : people.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No contacts found. Click &ldquo;New Contact&rdquo; or &ldquo;Sync from Leads&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    people.map((person) => (
                      <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {person.fullName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {person.title || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          {person.organization ? (
                            <Link
                              href={`/organizations/${person.organization.id}`}
                              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                            >
                              {person.organization.name}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {person.email || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {person.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          {person.linkedin ? (
                            <a
                              href={person.linkedin.startsWith("http") ? person.linkedin : `https://${person.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              Profile
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-gray-200">
                          {person.leadsCount ?? 0} / {person.dealsCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openEditPerson(person)}
                              title="Edit contact"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePerson(person)}
                              title="Delete contact"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={personPage}
              totalPages={personTotalPages}
              onPageChange={(p) => setPersonPage(p)}
            />
          </>
        )}
      </div>

      {/* Create / Edit Company Modal */}
      {orgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveOrg}
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingOrgId ? "Edit Company" : "New Company"}
              </h3>
              <button
                type="button"
                onClick={() => setOrgModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Company Name *
                </label>
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
                  placeholder="00.000.000/0001-00"
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company Size</label>
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
                onClick={() => setOrgModalOpen(false)}
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
                {editingOrgId ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Contact Modal */}
      {personModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSavePerson}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingPersonId ? "Edit Contact" : "New Contact"}
              </h3>
              <button
                type="button"
                onClick={() => setPersonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={personForm.fullName}
                  onChange={(e) => setPersonForm({ ...personForm, fullName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company</label>
                <select
                  value={personForm.organizationId ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, organizationId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">No company linked</option>
                  {allOrgOptions.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
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
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">LinkedIn URL</label>
                <input
                  value={personForm.linkedin ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, linkedin: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">City</label>
                <input
                  value={personForm.city ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, city: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Country</label>
                <input
                  value={personForm.country ?? ""}
                  onChange={(e) => setPersonForm({ ...personForm, country: e.target.value })}
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
                {editingPersonId ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientsMasterPage;
