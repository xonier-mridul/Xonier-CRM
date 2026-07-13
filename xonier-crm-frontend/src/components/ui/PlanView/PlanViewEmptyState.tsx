import Link from "next/link";
import React from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";

const PlanViewEmptyState = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("plan_not_found")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-gray-400">
        {t("the_selected_plan_could_not_be")}
      </p>
      <Link
        href="/plans"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <IoArrowBackOutline className="text-base" />
        {t("back_to_plans")}
      </Link>
    </div>
  );
};

export default PlanViewEmptyState;
