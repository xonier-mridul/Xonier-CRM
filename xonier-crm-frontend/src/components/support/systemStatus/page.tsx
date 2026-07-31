"use client";

import { useMemo } from "react";
import type { IconType } from "react-icons";
import { motion } from "framer-motion";
import { FiServer, FiDatabase, FiLock, FiHardDrive, FiMail } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { ServiceStatus, ServiceStatusLevel } from "@/src/types/support/support.type";
import { StatusBadge } from "../statusBage/page";


const serviceIcons: Record<string, IconType> = {
  api: FiServer,
  database: FiDatabase,
  auth: FiLock,
  storage: FiHardDrive,
  email: FiMail,
};

// NOTE: swap this static map for a live status-page API integration.
const serviceStates: Record<string, ServiceStatusLevel> = {
  api: "operational",
  database: "operational",
  auth: "operational",
  storage: "maintenance",
  email: "operational",
};

export default function SystemStatus() {
  const { t } = useTranslation();

  const serviceNames = t("support.status.services", { returnObjects: true }) as Record<string, string>;
  const statusLabels = t("support.status.labels", { returnObjects: true }) as Record<
    ServiceStatusLevel,
    string
  >;

  const services: ServiceStatus[] = useMemo(
    () =>
      Object.entries(serviceNames).map(([id, name]) => ({
        id,
        name,
        status: serviceStates[id] ?? "operational",
      })),
    [serviceNames]
  );

  const allOperational = services.every((service) => service.status === "operational");

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium ${
          allOperational
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
        {allOperational ? t("support.status.allOperational") : t("support.status.partialOutage")}
      </div>

      <div className="space-y-2">
        {services.map(({ id, name, status }, index) => {
          const Icon = serviceIcons[id] ?? FiServer;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  <Icon />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</span>
              </div>
              <StatusBadge status={status} label={statusLabels[status]} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}