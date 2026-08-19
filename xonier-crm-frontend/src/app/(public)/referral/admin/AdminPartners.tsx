"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Eyebrow,
  GhostButton,
  PrimaryButton,
  RowBetween,
} from "../shared/Primitives";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import AvatarSm from "../shared/AvatarSm";
import Badge from "../shared/Badge";
import { IoPersonAddSharp } from "react-icons/io5";
import { RxCross1 } from "react-icons/rx";
import { partnerRows } from "@/src/constants/referral";
import {
  PartnerRow,
  PartnerTier,
} from "@/src/types/referral/referral.type";
import { Search, Check, X, Eye } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

// Derive the tone type from the actual Badge status field instead of
// importing a separate (and previously missing) BadgeTone type.
type BadgeTone = PartnerRow["status"];

// Partner tiering & type tagging — doc §5.1
// type PartnerTier = "Referral" | "Reseller" | "Strategic";
type PartnerType = "Individual" | "Agency" | "Technology Partner";

// Local extension of PartnerRow — doesn't touch the shared contract,
// just layers on fields the doc calls for that the base type may lack.
type PartnerRowExt = PartnerRow & {
  id?: string;
  email?: string;
  partnerType?: PartnerType;
  commissionOverride?: string;
  details?: string;
  onboardingStatus?: "pending" | "approved" | "rejected";
};

interface PartnerForm {
  partner: string;
  client: string;
  email: string;
  revenue: string;
  commission: string;
  tier: PartnerTier;
  partnerType: PartnerType;
  status: "pending" | "approved" | "rejected";
  date: string;
  details: string;
}

const EMPTY_FORM: PartnerForm = {
  partner: "",
  client: "",
  email: "",
  revenue: "",
  commission: "",
  tier: "referral",
  partnerType: "Individual",
  status: "pending",
  date: "",
  details: "",
};

const TIER_OPTIONS: PartnerTier[] = ["referral", "reseller", "strategic"];
const TYPE_OPTIONS: PartnerType[] = ["Individual", "Agency", "Technology Partner"];

function getPartnerStatus(status: PartnerForm["status"]): BadgeTone {
  if (status === "approved") return "active" as BadgeTone;
  if (status === "rejected") return "churned" as BadgeTone;
  return "trial" as BadgeTone; // pending → shown as "onboarding" via label mapping below
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function AdminPartners() {
  const { t } = useTranslation();

  const [popup, setPopup] = useState(false);
  const [viewTarget, setViewTarget] = useState<PartnerRowExt | null>(null);
  const clickRef = useRef<HTMLDivElement | null>(null);

const [data, setData] = useState<PartnerRowExt[]>(
  partnerRows.map((p, i) => ({
    ...p,
    id: String(i),
    onboardingStatus: p.status === "trial" ? "pending" : "approved",
  }))
);

  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"All" | PartnerTier>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | BadgeTone>("All");

  /* -------------------------- Close on outside click -------------------------- */

  useEffect(() => {
    if (!popup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (clickRef.current && e.target instanceof Node && !clickRef.current.contains(e.target)) {
        setPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popup]);

  /* ------------------------------ Derived ------------------------------ */

  const summary = useMemo(() => {
    const total = data.length;
    const pending = data.filter((p) => p.onboardingStatus === "pending").length;
    const active = data.filter((p) => p.status === ("active" as BadgeTone)).length;
    return { total, pending, active };
  }, [data]);

const filteredData = useMemo(() => {
  return data.filter((p) => {
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q || p.name.toLowerCase().includes(q);

    const matchesTier =
      tierFilter === "All" || p.tier === tierFilter;

    const matchesStatus =
      statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesTier && matchesStatus;
  });
}, [data, search, tierFilter, statusFilter]);

  /* ------------------------------ Handlers ------------------------------ */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenPopup = () => {
    setForm(EMPTY_FORM);
    setPopup(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.partner.trim() || !form.client.trim()) return;

    const newPartner: PartnerRowExt = {
      id: `${Date.now()}`,
      name: form.partner,
      initials: getInitials(form.partner),
      email: form.email || undefined,
      clients: 1,
      referredMrr: form.revenue || "$0",
      agreement: form.date || "N/A",
      tier: form.tier,
      partnerType: form.partnerType,
      commissionOverride: form.commission || undefined,
      details: form.details || undefined,
      status: getPartnerStatus(form.status),
      onboardingStatus: form.status,
    };

    setData((prev) => [...prev, newPartner]);
    setPopup(false);
    setForm(EMPTY_FORM);
  };

  // Partner Manager approval action — doc §6.1 Onboarding Workflow / Table 4.1
  function approvePartner(id: string) {
    setData((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "active" as BadgeTone, onboardingStatus: "approved" } : p
      )
    );
  }

  function rejectPartner(id: string) {
    setData((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "churned" as BadgeTone, onboardingStatus: "rejected" } : p
      )
    );
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div>
      {/* ------------------------- Add Partner modal ------------------------- */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div ref={clickRef} className="relative z-10 w-[520px] max-w-[95%] rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{t("new_partner_details")}</h1>
                <p className="mt-1 text-sm text-gray-500">{t("add_new_partner_details")}</p>
              </div>
              <button
                type="button"
                onClick={() => setPopup(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <RxCross1 size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mt-5 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Partner Name</label>
                    <input
                      type="text"
                      name="partner"
                      value={form.partner}
                      onChange={handleChange}
                      placeholder="Enter partner name"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Primary Client</label>
                    <input
                      type="text"
                      name="client"
                      value={form.client}
                      onChange={handleChange}
                      placeholder="Enter client name"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Contact Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="partner@company.com"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Partner tiering & type — doc §5.1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Partner Tier</label>
                    <select
                      name="tier"
                      value={form.tier}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    >
                      {TIER_OPTIONS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Partner Type</label>
                    <select
                      name="partnerType"
                      value={form.partnerType}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    >
                      {TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Referred MRR</label>
                    <input
                      type="text"
                      name="revenue"
                      value={form.revenue}
                      onChange={handleChange}
                      placeholder="$0"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Commission Override</label>
                    <input
                      type="text"
                      name="commission"
                      value={form.commission}
                      onChange={handleChange}
                      placeholder="e.g. 25% (optional)"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Onboarding Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Agreement Date</label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Additional Details</label>
                  <textarea
                    rows={3}
                    name="details"
                    value={form.details}
                    onChange={handleChange}
                    placeholder="Enter additional details..."
                    className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setPopup(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------- View partner drawer ------------------------- */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewTarget(null)} />
          <div className="relative z-10 w-[440px] max-w-[95%] rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2.5">
                <AvatarSm initials={viewTarget.initials} />
                <div>
                  <p className="font-semibold text-gray-900">{viewTarget.name}</p>
                  {viewTarget.email && <p className="text-xs text-gray-500">{viewTarget.email}</p>}
                </div>
              </div>
              <button
                onClick={() => setViewTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <RxCross1 size={16} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <DetailRow label="Clients" value={String(viewTarget.clients)} />
              <DetailRow label="Referred MRR" value={viewTarget.referredMrr} />
              <DetailRow label="Agreement Expires" value={viewTarget.agreement} />
              <DetailRow label="Tier" value={viewTarget.tier ?? "—"} />
              <DetailRow label="Partner Type" value={viewTarget.partnerType ?? "—"} />
              <DetailRow label="Commission Override" value={viewTarget.commissionOverride ?? "Default rate"} />
              {viewTarget.details && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-gray-700">{viewTarget.details}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <RowBetween>
        <div>
          <Eyebrow>{t("admin.partners.eyebrow")}</Eyebrow>
          <h2 className="text-base text-slate-600">{t("nav.partners")}</h2>
        </div>
        <PrimaryButton onClick={handleOpenPopup}>
          <div className="flex gap-2">
            <IoPersonAddSharp className="text-lg" />
            {t("admin.partners.newPartner")}
          </div>
        </PrimaryButton>
      </RowBetween>

      {/* Summary strip */}
      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3.5">
          <p className="text-xs text-text-2">Total Partners</p>
          <p className="mt-1 text-xl font-semibold text-text-1">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-xs text-amber-700">Pending Approval</p>
          <p className="mt-1 text-xl font-semibold text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3.5">
          <p className="text-xs text-green-700">Active Partners</p>
          <p className="mt-1 text-xl font-semibold text-green-700">{summary.active}</p>
        </div>
      </div>

      <Card>
        {/* Filters */}
        <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["All", ...TIER_OPTIONS] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  tierFilter === tier
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partner..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-600 outline-none focus:border-slate-400 sm:w-56"
            />
          </div>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.partner")}</Th>
              <Th>Tier</Th>
              <Th num>{t("table.clients")}</Th>
              <Th num>{t("table.referredMrr")}</Th>
              <Th>{t("table.agreement")}</Th>
              <Th>{t("table.status")}</Th>
              <Th>{t("table.action")}</Th>
            </Tr>
          </Thead>

          <tbody>
            {filteredData.length === 0 && (
              <Tr>
                <Td colSpan={7}>
                  <div className="py-8 text-center text-sm text-slate-400">No partners match your filters.</div>
                </Td>
              </Tr>
            )}

            {filteredData.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <AvatarSm initials={p.initials} />
                    {p.name}
                  </div>
                </Td>
                <Td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {p.tier ?? "Referral"}
                  </span>
                </Td>
                <Td num>{p.clients}</Td>
                <Td num>{p.referredMrr}</Td>
                <Td>{t("admin.partners.expires", { date: p.agreement })}</Td>
                <Td>
                  <Badge tone={p.status}>
                    {t(`badge.${p.status === "trial" ? "onboarding" : p.status}`)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewTarget(p)}
                      className="flex items-center gap-1 text-xs text-text-2 border hover:bg-cyan-400 bg-cyan-500 text-white  px-[2px] py-[2px] rounded-sm"
                      title="View details"
                    >
                      <Eye size={13} />
                    </button>
                    {p.onboardingStatus === "pending" && (
                      <>
                        <button
                          onClick={() => approvePartner(p.id!)}
                          className="flex items-center gap-1 text-xs font-medium  border hover:bg-green-400 bg-green-500 text-white  px-[2px] py-[2px] rounded-sm"
                          title="Approve onboarding"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => rejectPartner(p.id!)}
                          className="flex items-center gap-1 text-xs font-medium  border hover:bg-red-400 bg-red-500 text-white  px-[2px] py-[2px] rounded-sm"
                          title="Reject onboarding"
                        >
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-xs text-text-2">{label}</span>
      <span className="text-sm font-medium text-text-1">{value}</span>
    </div>
  );
}