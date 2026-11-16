"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { IoBusinessOutline, IoPersonOutline } from "react-icons/io5";
import { Pencil, X, Loader2, ExternalLink } from "lucide-react";
import {
  OrganizationPayload,
  OrganizationService,
  PersonPayload,
  PersonService,
} from "@/src/services/organization.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { COMPANY_SIZE_OPTIONS } from "@/src/constants/company";
import { INDUSTRIES } from "@/src/constants/enum";

type Organization = {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  notes?: string | null;
  cnpj?: string | null;
} | null;

type Person = {
  id: string;
  fullName: string;
  organizationId?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
} | null;

const Field = ({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value?: string | null;
  href?: string;
  external?: boolean;
}) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    {value && href ? (
      external ? (
        <a
          href={href.startsWith("http") ? href : `https://${href}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline break-all"
        >
          {value}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          {value}
        </Link>
      )
    ) : (
      <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
        {value || "—"}
      </p>
    )}
  </div>
);

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export default function CompanyContactCard({
  organization,
  person,
  onUpdated,
}: {
  organization?: Organization;
  person?: Person;
  onUpdated?: () => void;
}) {
  const [editingOrg, setEditingOrg] = useState(false);
  const [editingPerson, setEditingPerson] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);

  const [orgForm, setOrgForm] = useState<OrganizationPayload>({ name: "" });
  const [personForm, setPersonForm] = useState<PersonPayload>({ fullName: "" });

  if (!organization && !person) return null;

  const location = [organization?.city, organization?.country].filter(Boolean).join(", ");

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
    setEditingOrg(true);
  };

  const openEditPerson = () => {
    if (!person) return;
    setPersonForm({
      fullName: person.fullName || "",
      organizationId: person.organizationId || organization?.id || "",
      title: person.title || "",
      email: person.email || "",
      phone: person.phone || "",
      linkedin: person.linkedin || "",
      city: person.city || "",
      country: person.country || "",
      notes: person.notes || "",
    });
    setEditingPerson(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSavingOrg(true);
    try {
      const res = await OrganizationService.update(organization.id, orgForm);
      if (res.status === 200) {
        toast.success("Company updated successfully");
        setEditingOrg(false);
        onUpdated?.();
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to update company";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    setSavingPerson(true);
    try {
      const res = await PersonService.update(person.id, personForm);
      if (res.status === 200) {
        toast.success("Contact updated successfully");
        setEditingPerson(false);
        onUpdated?.();
      }
    } catch (error) {
      const msg = axios.isAxiosError(error) ? extractErrorMessages(error) : "Failed to update contact";
      toast.error(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingPerson(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {organization && (
        <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <IoBusinessOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Company</h3>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/organizations/${organization.id}`}
                className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                View 360°
              </Link>
              <button
                type="button"
                onClick={openEditOrg}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-gray-500 px-2 py-1 text-xs font-medium text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={organization.name} href={`/organizations/${organization.id}`} />
            <Field label="CNPJ" value={organization.cnpj} />
            <Field label="Industry" value={organization.industry} />
            <Field label="Size" value={organization.size} />
            <Field label="Location" value={location} />
            <Field label="Email" value={organization.email} />
            <Field label="Phone" value={organization.phone} />
            <Field label="Website" value={organization.website} href={organization.website ?? undefined} external />
          </div>
        </div>
      )}

      {person && (
        <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <IoPersonOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Contact Person</h3>
            </div>
            <button
              type="button"
              onClick={openEditPerson}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-gray-500 px-2 py-1 text-xs font-medium text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={person.fullName} />
            <Field label="Title" value={person.title} />
            <Field label="Email" value={person.email} />
            <Field label="Phone" value={person.phone} />
            <Field label="LinkedIn" value={person.linkedin} href={person.linkedin ?? undefined} external />
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {editingOrg &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleSaveOrg}
              className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Edit Company</h3>
                <button type="button" onClick={() => setEditingOrg(false)} className="text-slate-400 hover:text-slate-600">
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
                  onClick={() => setEditingOrg(false)}
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
                  Save Company
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Edit Person Modal */}
      {editingPerson &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleSavePerson}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Edit Contact Person</h3>
                <button type="button" onClick={() => setEditingPerson(false)} className="text-slate-400 hover:text-slate-600">
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
                  onClick={() => setEditingPerson(false)}
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
