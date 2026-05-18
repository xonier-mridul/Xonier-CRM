import { PlanViewHeaderProps } from "@/src/types/plan/plan.types";
import React from "react";
import { IoCalendarClearOutline, IoTrash } from "react-icons/io5";
import PlanViewBadge from "./PlanViewBadge";
import PrimaryBtn from "../btn/PrimaryBtn";
import { PLAN_STATUS } from "@/src/constants/enum";

const PlanViewHeader = ({ plan, createdAt, handleDelete }: PlanViewHeaderProps) => {
  const isDeleted = plan.status === PLAN_STATUS.DELETED;

  return (
    <div className="rounded-lg border border-slate-900/10 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-end gap-4">
        <div className="flex flex-wrap justify-end gap-2">
          <PlanViewBadge variant={plan.status}>{plan.status}</PlanViewBadge>
          <PlanViewBadge variant={plan.visibility}>{plan.visibility}</PlanViewBadge>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Plan Details</p>
          <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-white">{plan.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">{plan.description || "No description added"}</p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end lg:justify-between">
          <div className="flex items-center gap-2">
            <PrimaryBtn text="Delete" icon={<IoTrash />} event={handleDelete} disabled={isDeleted} variant="danger" />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-gray-900/40 dark:text-gray-300">
            <IoCalendarClearOutline className="text-base text-blue-500" />
            <span>Created at {createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanViewHeader;
