import { User } from "@/src/types";
import Link from "next/link";
import React from "react";
import { IoCheckmarkCircle, IoPersonCircleOutline } from "react-icons/io5";
import PlanViewBadge from "./PlanViewBadge";
import PlanViewCard from "./PlanViewCard";
import PlanViewInfoItem from "./PlanViewInfoItem";
import { useTranslation } from "react-i18next";

interface PlanCreatorDetailsProps {
  createdBy: User;
  formatDate: (value?: string | Date | null) => string;
  formatLabel: (value?: string | null) => string;
}

const PlanCreatorDetails = ({ createdBy, formatDate, formatLabel }: PlanCreatorDetailsProps) => {
  const { t } = useTranslation();
  const fullName = `${createdBy.firstName ?? ""} ${createdBy.lastName ?? ""}`.trim() || "Unknown user";

  return (
    <PlanViewCard
      title={t("created_by")}
      description="Owner and account details"
      icon={<IoPersonCircleOutline className="text-xl" />}
      action={
        createdBy.id ? (
          <Link
            href={`/users/${createdBy.id}`}
            className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {t("view_user")}
          </Link>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <IoPersonCircleOutline className="text-2xl" />
        </div>
        <div>
          <h3 className="text-base font-semibold capitalize text-slate-900 dark:text-white">{fullName}</h3>
          
        </div>
        <PlanViewBadge variant={createdBy.status}>{formatLabel(createdBy.status)}</PlanViewBadge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanViewInfoItem label={t("account_status")} value={createdBy.isActive ? "Active" : "Inactive"} />
        <PlanViewInfoItem
          label={t("email_verified")}
          value={
            <span className="inline-flex items-center gap-2">
              {createdBy.isEmailVerified ? <IoCheckmarkCircle className="text-lg text-green-500" /> : null}
              {createdBy.isEmailVerified ? "Verified" : "Not verified"}
            </span>
          }
        />
        <PlanViewInfoItem label={t("last_login")} value={formatDate(createdBy.lastLogin)} />
        <PlanViewInfoItem label={t("user_created")} value={formatDate(createdBy.createdAt)} />
      </div>
    </PlanViewCard>
  );
};

export default PlanCreatorDetails;
