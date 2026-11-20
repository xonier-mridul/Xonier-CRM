"use client";

import ThemeToggle from "@/src/components/common/ThemeToggle";
import { ArrowDown, ArrowRight, LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleDashboard = () => {
    router.push(localStorage.getItem("token") ? "/dashboard" : "/login");
  };

  const features = [
    { title: t("role_based_access"), desc: t("role_based_access_desc"), icon: ShieldCheck },
    { title: t("lead_enquiry_tracking"), desc: t("lead_enquiry_tracking_desc"), icon: UsersRound },
    { title: t("modern_ui"), desc: t("modern_ui_desc"), icon: LayoutDashboard },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-900 transition-colors dark:bg-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" aria-label={t("logo")} className="inline-flex">
            <Image width={160} height={65} src="/images/trakeroo-light.png" alt={t("logo")} className="hidden h-auto w-36 dark:block sm:w-40" priority />
            <Image width={160} height={65} src="/images/trakeroo.png" alt={t("logo")} className="h-auto w-36 dark:hidden sm:w-40" priority />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col items-center px-6">
        <section className="w-full py-16 text-center sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center">
            <p className="mb-7 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              {t("smart_crm_for_modern_teams").replace(/^🚀\s*/, "")}
            </p>
            <h1 className="text-[clamp(1.5rem,4.5vw,4rem)] font-semibold leading-[1.12] tracking-[-0.04em] whitespace-nowrap">
              {t("welcome_to")} <span className="text-cyan-600 dark:text-cyan-400">{t("trakeroo_crm")}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-400">
              {t("manage_leads_roles_users_and_permissions_with_clarity_and")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button onClick={handleDashboard} className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-cyan-600 px-6 text-sm font-semibold text-white transition hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-600">
                {t("go_to_dashboard")} <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a href="#features" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-800">
                {t("learn_more")} <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="grid w-full max-w-5xl scroll-mt-8 grid-cols-1 gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, desc, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-7 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-colors hover:border-cyan-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-800">
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:ring-cyan-800/40">
                <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">{desc}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700">
        <div className="px-6 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} {t("trakeroo_crm_developed_by")}{" "}
          <Link className="font-medium text-cyan-600 hover:underline dark:text-cyan-400" href="https://xoniertechnologies.com" target="_blank" rel="noopener noreferrer">
            {t("xonier_technologies")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
