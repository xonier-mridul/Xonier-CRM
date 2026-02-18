

import { Suspense } from "react";
import LeadContent from "@/src/components/pages/lead/LeadContent";

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeadContent />
    </Suspense>
  );
};

export default page;