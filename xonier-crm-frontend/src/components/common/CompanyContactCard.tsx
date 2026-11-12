"use client";

import { IoBusinessOutline, IoPersonOutline } from "react-icons/io5";

type Organization = {
  id: string;
  name: string;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  cnpj?: string | null;
} | null;

type Person = {
  id: string;
  fullName: string;
  title?: string | null;
} | null;

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-900 dark:text-white">{value || "—"}</p>
  </div>
);

export default function CompanyContactCard({
  organization,
  person,
}: {
  organization?: Organization;
  person?: Person;
}) {
  if (!organization && !person) return null;

  const location = [organization?.city, organization?.country].filter(Boolean).join(", ");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {organization && (
        <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <IoBusinessOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Company</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={organization.name} />
            <Field label="Industry" value={organization.industry} />
            <Field label="Location" value={location} />
            <Field label="CNPJ" value={organization.cnpj} />
          </div>
        </div>
      )}
      {person && (
        <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <IoPersonOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Contact Person</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={person.fullName} />
            <Field label="Title" value={person.title} />
          </div>
        </div>
      )}
    </div>
  );
}

