import React from "react";
import { Lead } from "@/src/types/leads/leads.types";
import { FiUser, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { MdOutlineSource } from "react-icons/md";
import { motion } from "framer-motion";
import { IoInformationCircleOutline } from "react-icons/io5";
import { MaskEmailField, MaskPhoneField } from "../../ui/LeadComponent";
import Link from "next/link";
import { useTranslation } from "react-i18next";


interface LeadInfoCardProps {
  lead: Lead | null;
  loading?: boolean;
}

const LeadInfoCard = ({ lead, loading = false }: LeadInfoCardProps) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="rounded-lg  bg-white dark:bg-gray-700 p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-600 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border  border-slate-200 dark:border-gray-600 
                 bg-white dark:bg-gray-700 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
           <IoInformationCircleOutline className="text-yellow-400"/>  {t("lead_information")}
          </h3>
          <Link href={`/leads/view/${lead.id}`} className="text-sm text-slate-500 hover:text-cyan-500 dark:text-gray-300 cursor-pointer">
            {lead.lead_id}
          </Link>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium capitalize
          ${
            lead.priority === "high"
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
              : lead.priority === "medium"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300"
          }`}
        >
          {lead.priority}
        </span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoItem icon={<FiUser />} label={t("name_2")} value={lead.fullName} />
 
        <MaskEmailField  label={t("email")} value={lead.email}/>
        
        <MaskPhoneField  label={t("phone")} value={lead.phone}/>
        <InfoItem
          icon={<HiOutlineBuildingOffice2 />}
          label={t("company")}
          value={lead.companyName || "—"}
        />
        <InfoItem
          icon={<MdOutlineSource />}
          label={t("source")}
          value={lead.source}
        />
        <InfoItem
          icon={<FiMapPin />}
          label={t("city")}
          value={lead.city || "—"}
        />
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-gray-600 text-xs text-slate-500 dark:text-gray-400">
        {t("created_on")}{" "}
        {new Date(lead.createdAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    </motion.div>
  );
};

export default LeadInfoCard;

/* ---------- Small Helper Component ---------- */

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) => {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-cyan-500 dark:text-cyan-400">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 dark:text-gray-400">
          {label}
        </span>
        <span className="font-medium text-slate-900 dark:text-white">
          {value || "—"}
        </span>
      </div>
    </div>
  );
};
