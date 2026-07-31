"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FiUpload, FiCheckCircle, FiPaperclip } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { BugPriority } from "@/src/types/support/support.type";
import { FormField, inputClass } from "../formField/page";
import { useBrowserInfo } from "@/src/hooks/useBrowserInfo";


export default function ReportBug() {
  const { t } = useTranslation();
  const { browser, os, url } = useBrowserInfo();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<BugPriority>("medium");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const nextErrors: { subject?: string; description?: string } = {};
    if (!subject.trim()) nextErrors.subject = t("support.bug.errors.subject");
    if (description.trim().length < 10) nextErrors.description = t("support.bug.errors.description");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // TODO: send multipart/form-data (incl. screenshot) to /api/support/bug
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitted(true);
      setSubject("");
      setDescription("");
      setScreenshot(null);
      setPriority("medium");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      >
        <FiCheckCircle className="text-5xl text-emerald-500" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {t("support.bug.successTitle")}
        </h3>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          {t("support.bug.successMessage")}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          {t("support.bug.reportAnother")}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label={t("support.bug.fields.subject")} error={errors.subject}>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass(!!errors.subject)}
          placeholder={t("support.bug.placeholders.subject") ?? ""}
        />
      </FormField>

      <FormField label={t("support.bug.fields.description")} error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass(!!errors.description)}
          placeholder={t("support.bug.placeholders.description") ?? ""}
        />
      </FormField>

      <FormField label={t("support.bug.fields.priority")}>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as BugPriority)}
          className={inputClass(false)}
        >
          <option value="low">{t("support.bug.priorities.low")}</option>
          <option value="medium">{t("support.bug.priorities.medium")}</option>
          <option value="high">{t("support.bug.priorities.high")}</option>
          <option value="critical">{t("support.bug.priorities.critical")}</option>
        </select>
      </FormField>

      <FormField label={t("support.bug.fields.screenshot")}>
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 transition-colors hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-2 truncate">
            {screenshot ? <FiPaperclip /> : <FiUpload />}
            {screenshot ? screenshot.name : t("support.bug.uploadPlaceholder")}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          />
        </label>
      </FormField>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 sm:grid-cols-3">
        <InfoItem label={t("support.bug.fields.url")} value={url} />
        <InfoItem label={t("support.bug.fields.browser")} value={browser} />
        <InfoItem label={t("support.bug.fields.os")} value={os} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("support.common.sending") : t("support.bug.submit")}
      </button>
    </form>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="truncate text-slate-600 dark:text-slate-300">{value || "—"}</p>
    </div>
  );
}