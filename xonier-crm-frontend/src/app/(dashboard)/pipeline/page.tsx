"use client" 

import { Suspense } from "react";
import PipelineContent from "@/src/components/pages/pipeline/PipelineContent";
import { useTranslation } from "react-i18next";

const page = () => {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t("loading") || "Loading..."}</div>}>
      <PipelineContent />
    </Suspense>
  );
};

export default page;
