"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiSend } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { ContactFormData } from "@/src/types/support/support.type";
import { FormField, inputClass } from "../formField/page";


const initialData: ContactFormData = {
  name: "",
  email: "",
  subject: "",
  category: "general",
  message: "",
};

type FormErrors = Partial<Record<keyof ContactFormData, string>>;

export default function ContactSupport() {
  const { t } = useTranslation();
  const [data, setData] = useState<ContactFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!data.name.trim()) nextErrors.name = t("support.contact.errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = t("support.contact.errors.email");
    if (!data.subject.trim()) nextErrors.subject = t("support.contact.errors.subject");
    if (data.message.trim().length < 10) nextErrors.message = t("support.contact.errors.message");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // TODO: replace with real API call, e.g. POST /api/support/contact
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitted(true);
      setData(initialData);
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
          {t("support.contact.successTitle")}
        </h3>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          {t("support.contact.successMessage")}
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          {t("support.contact.sendAnother")}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label={t("support.contact.fields.name")} error={errors.name}>
        <input
          value={data.name}
          onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
          className={inputClass(!!errors.name)}
          placeholder={t("support.contact.placeholders.name") ?? ""}
        />
      </FormField>

      <FormField label={t("support.contact.fields.email")} error={errors.email}>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData((prev) => ({ ...prev, email: e.target.value }))}
          className={inputClass(!!errors.email)}
          placeholder={t("support.contact.placeholders.email") ?? ""}
        />
      </FormField>

      <FormField label={t("support.contact.fields.subject")} error={errors.subject}>
        <input
          value={data.subject}
          onChange={(e) => setData((prev) => ({ ...prev, subject: e.target.value }))}
          className={inputClass(!!errors.subject)}
          placeholder={t("support.contact.placeholders.subject") ?? ""}
        />
      </FormField>

      <FormField label={t("support.contact.fields.category")}>
        <select
          value={data.category}
          onChange={(e) => setData((prev) => ({ ...prev, category: e.target.value }))}
          className={inputClass(false)}
        >
          <option value="general">{t("support.contact.categories.general")}</option>
          <option value="billing">{t("support.contact.categories.billing")}</option>
          <option value="technical">{t("support.contact.categories.technical")}</option>
          <option value="account">{t("support.contact.categories.account")}</option>
        </select>
      </FormField>

      <FormField label={t("support.contact.fields.message")} error={errors.message}>
        <textarea
          value={data.message}
          onChange={(e) => setData((prev) => ({ ...prev, message: e.target.value }))}
          rows={4}
          className={inputClass(!!errors.message)}
          placeholder={t("support.contact.placeholders.message") ?? ""}
        />
      </FormField>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiSend className={submitting ? "animate-pulse" : ""} />
        {submitting ? t("support.common.sending") : t("support.contact.submit")}
      </button>
    </form>
  );
}