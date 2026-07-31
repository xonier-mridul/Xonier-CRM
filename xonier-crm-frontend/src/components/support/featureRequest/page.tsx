"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FiCheckCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { FeaturePriority } from "@/src/types/support/support.type";
import { FormField, inputClass } from "../formField/page";


export default function FeatureRequest() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");
  const [priority, setPriority] = useState<FeaturePriority>("medium");
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const nextErrors: { title?: string; description?: string } = {};
    if (!title.trim()) nextErrors.title = t("support.feature.errors.title");
    if (description.trim().length < 10) nextErrors.description = t("support.feature.errors.description");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // TODO: send to /api/support/feature-request
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setBusinessImpact("");
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
          {t("support.feature.successTitle")}
        </h3>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          {t("support.feature.successMessage")}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          {t("support.feature.submitAnother")}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label={t("support.feature.fields.title")} error={errors.title}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass(!!errors.title)}
          placeholder={t("support.feature.placeholders.title") ?? ""}
        />
      </FormField>

      <FormField label={t("support.feature.fields.description")} error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass(!!errors.description)}
          placeholder={t("support.feature.placeholders.description") ?? ""}
        />
      </FormField>

      <FormField label={t("support.feature.fields.businessImpact")}>
        <textarea
          value={businessImpact}
          onChange={(e) => setBusinessImpact(e.target.value)}
          rows={3}
          className={inputClass(false)}
          placeholder={t("support.feature.placeholders.businessImpact") ?? ""}
        />
      </FormField>

      <FormField label={t("support.feature.fields.priority")}>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as FeaturePriority)}
          className={inputClass(false)}
        >
          <option value="low">{t("support.feature.priorities.low")}</option>
          <option value="medium">{t("support.feature.priorities.medium")}</option>
          <option value="high">{t("support.feature.priorities.high")}</option>
        </select>
      </FormField>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("support.common.sending") : t("support.feature.submit")}
      </button>
    </form>
  );
}