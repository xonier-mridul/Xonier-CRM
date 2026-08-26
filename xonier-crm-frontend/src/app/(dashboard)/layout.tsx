import type { Metadata } from "next";

import "../../app/globals.css";
import SideBar from "@/src/components/layouts/SideBar";
import NavBar from "@/src/components/layouts/NavBar";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import ReduxProvider from "@/src/store/providers";



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
    <div
      className={`mt-${MARGIN_TOP} p-6 bg-stone-50 dark:bg-gray-800`}
    >
      {/* <ReduxProvider> */}
      <SideBar/>
      <NavBar/>
      {children}
      {/* </ReduxProvider> */}
      
    </div>
  );
}