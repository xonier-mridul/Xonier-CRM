"use client";

import { useParams } from "next/navigation";
import LeadEditForm from "@/src/components/pages/lead/LeadEditForm";

export default function UpdateLeadPage() {
  const { id } = useParams<{ id: string }>();
  return <LeadEditForm id={id} />;
}
