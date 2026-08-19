"use client";
import { AppMode, Panel } from "@/src/types/referral/referral.type";
import { useState } from "react";

// Partner-facing panels
import PartnerDashboard from "./partner/PartnerDashboard";
import PartnerLeads from "./partner/PartnerLeads"; // renamed from PartnerClients
import PartnerCommissions from "./partner/PartnerCommissions";
import PartnerForecast from "./partner/PartnerForecast";
import PartnerPayouts from "./partner/PartnerPayouts";
import PartnerDocuments from "./partner/PartnerDocuments"; // NEW
import PartnerSettings from "./partner/PartnerSettings";

// Admin panels
import AdminDashboard from "./dashboard/page";
import AdminPartners from "./admin/AdminPartners";
import AdminTiers from "./admin/AdminTiers";
import AdminQueue from "./admin/AdminQueue";
import AdminBatches from "./admin/AdminBatches";
import AdminReports from "./admin/AdminReports"; // NEW
import AdminCompliance from "./admin/AdminCompliance"; // NEW

import AppBar from "./shared/AppBar";
import SideNav from "./shared/SideNav";

export default function ReferralModule() {
  const [mode, setMode] = useState<AppMode>("partner");
  const [panel, setPanel] = useState<Panel>("p-dashboard");

  const handleModeChange = (next: AppMode) => {
    setMode(next);
    setPanel(next === "partner" ? "p-dashboard" : "a-dashboard");
  };

  const renderPanel = () => {
    switch (panel) {
      // Partner Portal — Section 5.1–5.7, 5.9
      case "p-dashboard":
        return <PartnerDashboard onNavigate={setPanel} />;
      case "p-leads":
        return <PartnerLeads />;
      case "p-commissions":
        return <PartnerCommissions />;
      case "p-forecast":
        return <PartnerForecast />;
      case "p-payouts":
        return <PartnerPayouts />;
      case "p-documents":
        return <PartnerDocuments />;
      case "p-settings":
        return <PartnerSettings />;

      // Admin Console — Section 5.1, 5.3, 5.6, 5.8, 5.10
      case "a-dashboard":
        return <AdminDashboard onNavigate={setPanel} />;
      case "a-partners":
        return <AdminPartners />;
      case "a-tiers":
        return <AdminTiers />;
      case "a-queue":
        return <AdminQueue />;
      case "a-batches":
        return <AdminBatches />;
      case "a-reports":
        return <AdminReports />;
      case "a-compliance":
        return <AdminCompliance />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-paper font-body text-text-1">
      <AppBar mode={mode} onModeChange={handleModeChange} />
      <div className="flex min-h-[calc(100vh-58px)] flex-col sm:flex-row relative">
        <SideNav mode={mode} activePanel={panel} onSelect={setPanel} />
        <div className="min-w-0 flex-1 px-5 py-6 sm:px-8 ml-65 mt-15">{renderPanel()}</div>
      </div>
    </div>
  );
}