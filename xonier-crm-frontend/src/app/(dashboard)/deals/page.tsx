// page.tsx

import { Suspense } from "react";
import DealContent from "@/src/components/pages/deal/DealContent";

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DealContent />
    </Suspense>
  );
};

export default page;