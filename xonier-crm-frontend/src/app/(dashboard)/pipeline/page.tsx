"use client" 

import { Suspense } from "react";
import SalesPipeline from "@/src/components/pages/pipeline/SalesPipeline";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useFeatures } from "@/src/hooks/useFeatures";
import { FEATURES, PERMISSIONS } from "@/src/constants/enum";

const page = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { hasFeature } = useFeatures();

  if (!hasPermission(PERMISSIONS.readDeal) || !hasFeature(FEATURES.CRM)) {
    return <div className="p-6">{t("You do not have access to the pipeline.", { defaultValue: "You do not have access to the pipeline." })}</div>;
  }

  return (
    <Suspense fallback={<div>{t("loading") || "Loading..."}</div>}>
      <SalesPipeline />
    </Suspense>
  );
};

export default page;
