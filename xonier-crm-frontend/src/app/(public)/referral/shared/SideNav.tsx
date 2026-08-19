"use client";
import { AppMode, Panel } from "@/src/types/referral/referral.type";
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  Banknote,
  FileText,
  Settings,
  Building2,
  SlidersHorizontal,
  ListChecks,
  Layers,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  panel: Panel;
  label: string;
  icon: React.ElementType;
  phase?: 1 | 2 | 3; // reference to Table 10.1 rollout plan
}

const partnerNav: NavItem[] = [
  { panel: "p-dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { panel: "p-leads", label: "Leads", icon: Users, phase: 1 },
  { panel: "p-commissions", label: "Commissions", icon: Wallet, phase: 1 },
  { panel: "p-payouts", label: "Payouts", icon: Banknote, phase: 2 },
  { panel: "p-forecast", label: "Forecast", icon: TrendingUp, phase: 3 },
  { panel: "p-documents", label: "Documents", icon: FileText, phase: 2 },
  { panel: "p-settings", label: "Settings", icon: Settings, phase: 1 },
];

const adminNav: NavItem[] = [
  { panel: "a-dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { panel: "a-partners", label: "Partners", icon: Building2, phase: 1 },
  { panel: "a-queue", label: "Lead Queue", icon: ListChecks, phase: 1 },
  { panel: "a-tiers", label: "Commission Rules", icon: SlidersHorizontal, phase: 1 },
  { panel: "a-batches", label: "Payout Batches", icon: Layers, phase: 2 },
  { panel: "a-reports", label: "Reports", icon: BarChart3, phase: 2 },
  { panel: "a-compliance", label: "Compliance", icon: ShieldCheck, phase: 1 },
];

interface SideNavProps {
  mode: AppMode;
  activePanel: Panel;
  onSelect: (p: Panel) => void;
}

export default function SideNav({ mode, activePanel, onSelect }: SideNavProps) {
  const items = mode === "partner" ? partnerNav : adminNav;

  return (
    <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-300 bg-surface fixed top-[66px] h-full ">
      <nav className="flex sm:flex-col gap-1 p-3 overflow-x-auto sm:overflow-visible">
        {items.map(({ panel, label, icon: Icon }) => {
          const active = activePanel === panel;
          return (
            <button
              key={panel}
              onClick={() => onSelect(panel)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                active
                  ? "bg-cyan-500 text-white font-medium"
                  : "text-text-2 hover:bg-surface-hover"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}