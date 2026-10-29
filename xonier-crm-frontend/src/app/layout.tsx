import type { Metadata } from "next";
import localFont from "next/font/local";
import './globals.css'
import "../i18n/index";
import { Suspense, ReactNode } from "react";

import Providers from "../components/providers/theme/Providers";
import ReduxProvider from "../store/providers";
import ToastProvider from "../components/providers/TostProvider";
import ScrollToTop from "../components/common/ScrollToTop";


import { LoaderProvider } from "../context/LoaderContext";
import GlobalLoader from "../components/loader/GlobalLoader";
import RouteLoader from "../components/loader/RouteLoader";

import "react-toastify/dist/ReactToastify.css";
import "react-loading-skeleton/dist/skeleton.css";
import I18nProvider from "../components/providers/I18nProvider";
import Support from "../components/support/page";
import NormalizeNumberInputs from "../components/common/NormalizeNumberInputs";

const poppins = localFont({
  src: [
    { path: "../../public/fonts/poppins/poppins-100.woff2", weight: "100", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-200.woff2", weight: "200", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-300.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-800.woff2", weight: "800", style: "normal" },
    { path: "../../public/fonts/poppins/poppins-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trakeroo CRM | Smart Sales, Leads & Customer Management",
  description:
    "Trakeroo is a modern CRM platform to manage leads, deals, quotations, invoices, and customer relationships with powerful analytics and team collaboration.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} antialiased bg-stone-100 dark:bg-gray-800   min-h-screen custom-scrollbar `}
      >

        <Providers>
          <ReduxProvider>
            <LoaderProvider>
              <I18nProvider>

              <RouteLoader />

             
              <GlobalLoader />

             
              <Suspense fallback={null}>
                <ScrollToTop />
              </Suspense>

              <ToastProvider />
              <NormalizeNumberInputs />

              
              {children }
              <Support hasUnread/>
              </I18nProvider>
            </LoaderProvider>
          </ReduxProvider>
        </Providers>
      </body>
    </html>
  );
}
