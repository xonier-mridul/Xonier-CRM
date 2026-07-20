"use client";

import React from "react";
import { MonthlyTrendItem } from "@/src/types";
import { IoTrendingUp } from "react-icons/io5";
import { useTranslation } from "react-i18next";

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
};

export const MonthlyTrendChart = ({ data }: { data: MonthlyTrendItem[] }) => {
  const { t } = useTranslation();
  const maxTasks = Math.max(...data.map((d) => d.tasksCompleted), 1);
  const totalCompleted = data.reduce((s, d) => s + d.tasksCompleted, 0);

  if (totalCompleted === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <IoTrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {t("monthly_performance") || "Monthly Performance"}
          </h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">
          {t("no_trend_data") || "No completed tasks in this period"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <IoTrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {t("monthly_performance") || "Monthly Performance"}
            </h3>
            <p className="text-xs text-gray-400">
              {t("last")} {data.length} {t("months") || "months"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-gray-400">≥80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-gray-400">50-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px] text-gray-400">&lt;50%</span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((item) => {
          const heightPct = (item.tasksCompleted / maxTasks) * 100;
          const barColor =
            item.tasksCompleted === 0
              ? "bg-slate-200 dark:bg-gray-700"
              : item.onTimeRate >= 80
              ? "bg-emerald-500"
              : item.onTimeRate >= 50
              ? "bg-amber-500"
              : "bg-rose-500";

          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex flex-col items-center justify-end h-32">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 bg-gray-900 dark:bg-gray-950 text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap z-20 pointer-events-none shadow-xl">
                  <p className="font-bold">{item.tasksCompleted} tasks completed</p>
                  {item.tasksCompleted > 0 && (
                    <>
                      <p className="text-gray-300">{item.onTimeRate}% on time</p>
                      {item.avgRating && (
                        <p className="text-gray-300">★ {item.avgRating} avg rating</p>
                      )}
                    </>
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-950 rotate-45" />
                </div>
                <div
                  className={`w-full max-w-[32px] rounded-t-lg ${barColor} transition-all duration-500 group-hover:opacity-80`}
                  style={{ height: `${Math.max(heightPct, 3)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-gray-400">
                {formatMonthLabel(item.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};