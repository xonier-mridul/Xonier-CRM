"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, ChevronDown, Plus, Search, User, X, Loader2 } from "lucide-react";
import {
  OrganizationPayload,
  OrganizationRecord,
  OrganizationService,
  PersonPayload,
  PersonRecord,
  PersonService,
} from "@/src/services/organization.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { COMPANY_SIZE_OPTIONS } from "@/src/constants/company";
import { INDUSTRIES } from "@/src/constants/enum";

interface CommercialEntitySelectorsProps {
  organizationId?: string | null;
  personId?: string | null;
  onOrganizationChange: (orgId: string | null, org: OrganizationRecord | null) => void;
  onPersonChange: (personId: string | null, person: PersonRecord | null) => void;
  disabled?: boolean;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export default function CommercialEntitySelectors({
  organizationId,
  personId,
  onOrganizationChange,
  onPersonChange,
  disabled = false,
}: CommercialEntitySelectorsProps) {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);

  const [orgOpen, setOrgOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showNewPersonModal, setShowNewPersonModal] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);

  const [newOrg, setNewOrg] = useState<OrganizationPayload>({
    name: "",
    cnpj: "",
    industry: "",
    size: "",
    email: "",
    phone: "",
    city: "",
    country: "",
  });

  const [newPerson, setNewPerson] = useState<PersonPayload>({
    fullName: "",
    organizationId: organizationId || "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
  });

  const orgRef = useRef<HTMLDivElement>(null);
  const personRef = useRef<HTMLDivElement>(null);

  const loadOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await OrganizationService.getAll(1, 100);
      const list = res.data?.data?.data ?? [];
      setOrganizations(list);
    } catch {
      // Non-fatal: selector remains usable
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  const loadPeople = useCallback(async (orgIdFilter?: string | null) => {
    setLoadingPeople(true);
    try {
      const res = await PersonService.getAll(
        1,
        100,
        orgIdFilter ? { organizationId: orgIdFilter } : undefined
      );
      const list = res.data?.data?.data ?? [];
      setPeople(list);
    } catch {
      // Non-fatal
    } finally {
      setLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    void loadPeople(organizationId);
  }, [loadPeople, organizationId]);

  useEffect(() => {
    setNewPerson((prev) => ({ ...prev, organizationId: organizationId || "" }));
  }, [organizationId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setOrgOpen(false);
      }
      if (personRef.current && !personRef.current.contains(e.target as Node)) {
        setPersonOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOrg = organizations.find((o) => o.id === organizationId) || null;
  const selectedPerson = people.find((p) => p.id === personId) || null;

  const filteredOrgs = organizations.filter((o) => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return true;
    return [o.name, o.cnpj, o.industry, o.city]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const filteredPeople = people.filter((p) => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return true;
    return [p.fullName, p.title, p.email, p.phone, p.organizationName]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newOrg.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSavingOrg(true);
    try {
      const res = await OrganizationService.create({
        ...newOrg,
        name: newOrg.name.trim(),
      });
      if (res.status === 201) {
        const created: OrganizationRecord = res.data.data;
        setOrganizations((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
        onOrganizationChange(created.id, created);
        setShowNewOrgModal(false);
        setOrgOpen(false);
        setNewOrg({
          name: "",
          cnpj: "",
          industry: "",
          size: "",
          email: "",
          phone: "",
          city: "",
          country: "",
        });
        toast.success("Company created and linked");
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to create company";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newPerson.fullName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setSavingPerson(true);
    try {
      const res = await PersonService.create({
        ...newPerson,
        fullName: newPerson.fullName.trim(),
        organizationId: newPerson.organizationId || organizationId || null,
      });
      if (res.status === 201) {
        const created: PersonRecord = res.data.data;
        setPeople((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        onPersonChange(created.id, created);
        if (!organizationId && created.organizationId) {
          const matchingOrg = organizations.find((o) => o.id === created.organizationId) || null;
          if (matchingOrg) onOrganizationChange(matchingOrg.id, matchingOrg);
        }
        setShowNewPersonModal(false);
        setPersonOpen(false);
        setNewPerson({
          fullName: "",
          organizationId: organizationId || "",
          title: "",
          email: "",
          phone: "",
          linkedin: "",
        });
        toast.success("Contact created and linked");
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to create contact";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingPerson(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50/70 dark:bg-gray-800/40 p-4">
      {/* Company (Account) Selector */}
      <div className="relative flex flex-col gap-1.5" ref={orgRef}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Company (Account)
          </label>
          {!disabled && (
            <button
              type="button"
              onClick={() => setShowNewOrgModal(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              <Plus className="w-3.5 h-3.5" />
              New Company
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOrgOpen((prev) => !prev)}
            className="w-full px-3 py-2.5 text-left bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg flex items-center justify-between text-sm hover:border-cyan-500 disabled:opacity-60"
          >
            <span className={selectedOrg ? "text-slate-900 dark:text-white truncate pr-6" : "text-slate-400 truncate pr-6"}>
              {selectedOrg
                ? `${selectedOrg.name}${selectedOrg.cnpj ? ` (${selectedOrg.cnpj})` : ""}`
                : loadingOrgs
                  ? "Loading companies..."
                  : "Select or create a company..."}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${orgOpen ? "rotate-180" : ""}`} />
          </button>
          {selectedOrg && !disabled && (
            <button
              type="button"
              title="Clear company"
              onClick={(e) => {
                e.stopPropagation();
                onOrganizationChange(null, null);
              }}
              className="absolute right-8 p-1 text-slate-400 hover:text-rose-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {orgOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-gray-700">
              <div className="flex items-center gap-2 rounded-md bg-slate-50 dark:bg-gray-700 px-2.5 py-1.5">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search company or CNPJ..."
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-white outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredOrgs.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No matching companies found
                </div>
              ) : (
                filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      onOrganizationChange(org.id, org);
                      setOrgOpen(false);
                      setOrgSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-gray-700 flex flex-col ${
                      org.id === organizationId ? "bg-cyan-50/70 dark:bg-gray-700/80 font-medium text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-gray-200"
                    }`}
                  >
                    <span>{org.name}</span>
                    {(org.cnpj || org.industry || org.city) && (
                      <span className="text-[11px] text-slate-400">
                        {[org.cnpj, org.industry, org.city].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Person Selector */}
      <div className="relative flex flex-col gap-1.5" ref={personRef}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Contact Person
          </label>
          {!disabled && (
            <button
              type="button"
              onClick={() => setShowNewPersonModal(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              <Plus className="w-3.5 h-3.5" />
              New Contact
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPersonOpen((prev) => !prev)}
            className="w-full px-3 py-2.5 text-left bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg flex items-center justify-between text-sm hover:border-cyan-500 disabled:opacity-60"
          >
            <span className={selectedPerson ? "text-slate-900 dark:text-white truncate pr-6" : "text-slate-400 truncate pr-6"}>
              {selectedPerson
                ? `${selectedPerson.fullName}${selectedPerson.title ? ` · ${selectedPerson.title}` : ""}`
                : loadingPeople
                  ? "Loading contacts..."
                  : organizationId
                    ? "Select contact at this company..."
                    : "Select or create a contact..."}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${personOpen ? "rotate-180" : ""}`} />
          </button>
          {selectedPerson && !disabled && (
            <button
              type="button"
              title="Clear contact"
              onClick={(e) => {
                e.stopPropagation();
                onPersonChange(null, null);
              }}
              className="absolute right-8 p-1 text-slate-400 hover:text-rose-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {personOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-gray-700">
              <div className="flex items-center gap-2 rounded-md bg-slate-50 dark:bg-gray-700 px-2.5 py-1.5">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="Search contact name, email, phone..."
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-white outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredPeople.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No matching contacts found
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      onPersonChange(person.id, person);
                      if (!organizationId && person.organizationId) {
                        const matchingOrg = organizations.find((o) => o.id === person.organizationId) || null;
                        if (matchingOrg) onOrganizationChange(matchingOrg.id, matchingOrg);
                      }
                      setPersonOpen(false);
                      setPersonSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-gray-700 flex flex-col ${
                      person.id === personId ? "bg-cyan-50/70 dark:bg-gray-700/80 font-medium text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-gray-200"
                    }`}
                  >
                    <span>
                      {person.fullName}
                      {person.title ? <span className="text-xs text-slate-400 ml-1">({person.title})</span> : null}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {[person.organizationName, person.email, person.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Create Company Modal */}
      {showNewOrgModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleCreateOrg}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  New Company (Account)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    placeholder="e.g. HRJee Brasil Tecnologia Ltda"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">CNPJ</label>
                  <input
                    value={newOrg.cnpj ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Industry</label>
                  <select
                    value={newOrg.industry ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
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
                    value={newOrg.size ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, size: e.target.value })}
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
                    value={newOrg.email ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    value={newOrg.phone ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">City</label>
                  <input
                    value={newOrg.city ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                    placeholder="São Paulo"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Country</label>
                  <input
                    value={newOrg.country ?? ""}
                    onChange={(e) => setNewOrg({ ...newOrg, country: e.target.value })}
                    placeholder="Brazil"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-900/30">
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
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
                  {savingOrg ? "Saving..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Quick Create Person Modal */}
      {showNewPersonModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleCreatePerson}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-600" />
                  New Contact Person
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewPersonModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={newPerson.fullName}
                    onChange={(e) => setNewPerson({ ...newPerson, fullName: e.target.value })}
                    placeholder="e.g. Gustavo Silva"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company</label>
                  <select
                    value={newPerson.organizationId ?? ""}
                    onChange={(e) => setNewPerson({ ...newPerson, organizationId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">No company linked</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Job Title</label>
                  <input
                    value={newPerson.title ?? ""}
                    onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
                    placeholder="HR Director"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newPerson.email ?? ""}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    placeholder="gustavo@empresa.com.br"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    value={newPerson.phone ?? ""}
                    onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">LinkedIn URL</label>
                  <input
                    value={newPerson.linkedin ?? ""}
                    onChange={(e) => setNewPerson({ ...newPerson, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-900/30">
                <button
                  type="button"
                  onClick={() => setShowNewPersonModal(false)}
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
                  {savingPerson ? "Saving..." : "Create Contact"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
