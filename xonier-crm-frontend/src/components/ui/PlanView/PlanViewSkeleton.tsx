import React from "react";
import Skeleton from "react-loading-skeleton";

const PlanViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-slate-900/10 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <Skeleton height={36} width={220} borderRadius={8} />
        <div className="mt-4 max-w-2xl">
          <Skeleton height={18} count={2} borderRadius={8} />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <Skeleton height={260} borderRadius={8} />
          <Skeleton height={320} borderRadius={8} />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton height={310} borderRadius={8} />
          <Skeleton height={280} borderRadius={8} />
        </div>
      </div>
    </div>
  );
};

export default PlanViewSkeleton;
