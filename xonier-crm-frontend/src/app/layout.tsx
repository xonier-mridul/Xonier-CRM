import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/providers/theme/Providers";
import {DM_Sans} from "next/font/google"
import { Suspense } from "react";

import ReduxProvider from "../store/providers";
import "react-toastify/dist/ReactToastify.css"
import ToastProvider from "../components/providers/TostProvider";
import CheckAuth from "../components/common/CheckAuth";
import 'react-loading-skeleton/dist/skeleton.css'
import ScrollToTop from "../components/common/ScrollToTop";



const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"], 
  variable: "--font-dm-sans",    
  display: "swap",
});

export const metadata: Metadata = {
  title: "Xonier CRM",
  description: "Xonier Technologies CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable}  antialiased bg-stone-100 dark:bg-gray-800 min-h-screen `}
      >

        <Providers>
          <ReduxProvider>
            <Suspense fallback={null}>
            <ScrollToTop/>
            </Suspense>
            <ToastProvider/>
         {children}
        </ReduxProvider>
        
        </Providers>
      </body>
    </html>
  );
}
