"use client";

import { useEffect, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { FollowUpService, type FollowUpCountEntity } from "@/src/services/follow-up.service";

type Props = {
  entity: FollowUpCountEntity;
  dateFilter: DateFilter;
};

export default function FollowUpCountCard({ entity, dateFilter }: Props) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refreshCount = () => {
      setLoading(true);
      FollowUpService.count(entity, dateFilter.fromDate, dateFilter.toDate)
        .then((response) => {
          if (!active) return;
          const payload = response.data?.data ?? response.data;
          setCount(Number(payload?.count ?? 0));
        })
        .catch(() => {
          if (active) setCount(0);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refreshCount();
    window.addEventListener("follow-up-updated", refreshCount);
    return () => {
      active = false;
      window.removeEventListener("follow-up-updated", refreshCount);
    };
  }, [entity, dateFilter.fromDate, dateFilter.toDate]);

  return (
    <div className="flex min-h-[76px] items-center gap-3 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-50 p-4 dark:border-cyan-800/40 dark:from-cyan-900/20 dark:to-sky-900/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/40">
        <FiCalendar className="text-cyan-600 dark:text-cyan-400" size={19} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Follow-ups</p>
        <p className="text-lg font-bold text-slate-800 dark:text-white" aria-live="polite">{loading ? "…" : count}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Due in selected date range</p>
      </div>
    </div>
  );
}
