"use client";

import { Suspense } from "react";
import PipelineContent from "@/src/components/pages/pipeline/PipelineContent";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useFeatures } from "@/src/hooks/useFeatures";
import { FEATURES, PERMISSIONS } from "@/src/constants/enum";

export default function CampaignsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { hasFeature } = useFeatures();
  if (!hasPermission(PERMISSIONS.readCampaign) || !hasFeature(FEATURES.CRM)) {
    return <div className="p-6">{t("campaigns_access_denied", { defaultValue: "You do not have access to campaigns." })}</div>;
  }
  return <Suspense fallback={<div>{t("loading")}</div>}><PipelineContent /></Suspense>;
}
