import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Suspense, ReactNode } from "react";

import Providers from "../components/providers/theme/Providers";
import ReduxProvider from "../store/providers";
import ToastProvider from "../components/providers/TostProvider";
import ScrollToTop from "../components/common/ScrollToTop";

// ✅ Route-based loader
import { LoaderProvider } from "../context/LoaderContext";
import GlobalLoader from "../components/loader/GlobalLoader";
import RouteLoader from "../components/loader/RouteLoader";

import "react-toastify/dist/ReactToastify.css";
import "react-loading-skeleton/dist/skeleton.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trackeroo CRM | Smart Sales, Leads & Customer Management",
  description:
    "Trackeroo is a modern CRM platform to manage leads, deals, quotations, invoices, and customer relationships with powerful analytics and team collaboration.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} antialiased bg-stone-100 dark:bg-gray-800 min-h-screen`}
      >
        <Providers>
          <ReduxProvider>
            <LoaderProvider>
              {/* 🔥 Route change loader */}
              <RouteLoader />

              {/* Global loader UI */}
              <GlobalLoader />

              {/* Other global components */}
              <Suspense fallback={null}>
                <ScrollToTop />
              </Suspense>

              <ToastProvider />

              {/* App content */}
              {children}
            </LoaderProvider>
          </ReduxProvider>
        </Providers>
      </body>
    </html>
  );
}
