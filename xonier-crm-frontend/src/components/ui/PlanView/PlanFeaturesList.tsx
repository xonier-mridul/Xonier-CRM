import { Feature, PlanFeature } from "@/src/types/plan/plan.types";
import React from "react";
import { IoCheckmarkCircle, IoCloseCircle, IoInfiniteOutline, IoListOutline } from "react-icons/io5";
import PlanViewBadge from "./PlanViewBadge";
import PlanViewCard from "./PlanViewCard";

interface PlanFeaturesListProps {
  features: PlanFeature[];
  formatLabel: (value?: string | null) => string;
}

const getFeature = (feature: string | Feature) => {
  if (typeof feature === "string") {
    return {
      id: feature,
      name: feature,
      sortDescription: "",
      description: "",
      feature_key: "",
      status: "",
      system: false,
    };
  }

  return feature;
};

const PlanFeaturesList = ({ features, formatLabel }: PlanFeaturesListProps) => {
  return (
    <PlanViewCard
      title="Features"
      description={`${features.length} feature${features.length === 1 ? "" : "s"} configured for this plan`}
      icon={<IoListOutline className="text-xl" />}
    >
      {features.length ? (
        <div className="grid gap-4">
          {features.map((item, index) => {
            const feature = getFeature(item.feature);
            const limitText = item.is_unlimited
              ? "Unlimited"
              : item.limit_override ?? item.limit ?? "No limit";

            return (
              <article
                key={`${feature.id}-${index}`}
                className="rounded-lg border border-slate-900/10 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold capitalize text-slate-900 dark:text-white">{feature.name}</h3>
                      {feature.status ? <PlanViewBadge variant={feature.status}>{feature.status}</PlanViewBadge> : null}
                      {feature.system ? <PlanViewBadge variant="neutral">System</PlanViewBadge> : null}
                    </div>
                    {feature.feature_key ? (
                      <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">{feature.feature_key}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-gray-400">
                      {feature.sortDescription || feature.description || "No feature description added"}
                    </p>
                  </div>
                  <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                      {item.is_enabled ? (
                        <IoCheckmarkCircle className="text-lg text-green-500" />
                      ) : (
                        <IoCloseCircle className="text-lg text-red-500" />
                      )}
                      <span>{item.is_enabled ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                      <IoInfiniteOutline className="text-lg text-blue-500" />
                      <span>{typeof limitText === "number" ? `${limitText} ${formatLabel(feature.name)}` : limitText}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          No features added to this plan
        </div>
      )}
    </PlanViewCard>
  );
};

export default PlanFeaturesList;
