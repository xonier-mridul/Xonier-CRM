import type { Metadata } from "next";

import "../../app/globals.css";
import SideBar from "@/src/components/layouts/SideBar";
import NavBar from "@/src/components/layouts/NavBar";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";



export const metadata: Metadata = {
  title: "Trackeroo CRM | Smart Sales, Leads & Customer Management",
  description:
    "Trackeroo is a modern CRM platform to manage leads, deals, quotations, invoices, and customer relationships with powerful analytics and team collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`mt-${MARGIN_TOP} p-6 bg-stone-50`}
      >

        <SideBar/>
        <NavBar/>
        {children}
        
      </body>
    </html>
  );
}