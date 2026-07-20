"use client";
import "../../i18n/index"
import { useTranslation } from "react-i18next";
import { ReactNode } from "react";

export default function I18nProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { i18n } = useTranslation();

  if (!i18n.isInitialized) {
    return null;
  }

  return <>{children}</>;
}