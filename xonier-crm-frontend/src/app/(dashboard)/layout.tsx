import type { Metadata } from "next";

import "../../app/globals.css";
import SideBar from "@/src/components/layouts/SideBar";
import NavBar from "@/src/components/layouts/NavBar";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";

export const metadata: Metadata = {
  title: "Trakeroo CRM | Smart Sales, Leads & Customer Management",
  description:
    "Trakeroo is a modern CRM platform to manage leads, deals, quotations, invoices, and customer relationships with powerful analytics and team collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-slate-950">
      {/* Fixed Sidebar */}
      <SideBar />

      {/* Main content area — offset by sidebar width */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        {/* Fixed Navbar */}
        <NavBar />

        {/* Page content — offset by navbar height (h-14 = 56px) + spacing */}
        <main className="flex-1 mt-16 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}