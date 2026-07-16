// page.tsx
"use client" 
import { Suspense } from "react";
import DealContent from "@/src/components/pages/deal/DealContent";
import { useTranslation } from "react-i18next";

const page = () => {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <DealContent />
    </Suspense>
  );
};

export default page;