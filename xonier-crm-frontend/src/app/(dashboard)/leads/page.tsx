

import { Suspense } from "react";
import LeadContent from "@/src/components/pages/lead/LeadContent";
import { useTranslation } from "react-i18next";

const page = () => {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <LeadContent />
    </Suspense>
  );
};

export default page;