"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  FiSave,
  FiAlertCircle,

  FiGlobe,
  FiBell,
  FiLock,
  FiRotateCcw,
  FiTrash2,
  FiCheck,
  FiChevronRight,
} from "react-icons/fi";
import { TbSettings, TbPalette, TbAccessible } from "react-icons/tb";
import ThemeToggle from "@/src/components/common/ThemeToggle";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

type ThemeMode = "light" | "dark" | "system";
type FontSize = "sm" | "md" | "lg";
type Density = "comfortable" | "compact";
type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
type TimeFormat = "12h" | "24h";
type ProfileVisibility = "everyone" | "team" | "private";

interface GeneralSettings {
  theme: ThemeMode;
  accentColor: string;
  fontSize: FontSize;
  density: Density;
  sidebarCollapsed: boolean;

  /* Language & Region */
  language: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
  currency: string;
  weekStart: "sunday" | "monday";

  /* Notifications */
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;

  /* Privacy & Security */
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  profileVisibility: ProfileVisibility;
  showOnlineStatus: boolean;

  /* Accessibility */
  reduceMotion: boolean;
  highContrast: boolean;
  underlineLinks: boolean;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  theme: "system",
  accentColor: "cyan",
  fontSize: "md",
  density: "comfortable",
  sidebarCollapsed: false,

  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  timezone: "Asia/Dubai",
  currency: "USD",
  weekStart: "monday",

  emailNotifications: true,
  pushNotifications: true,
  desktopNotifications: false,
  soundEnabled: true,
  weeklyDigest: true,
  marketingEmails: false,

  twoFactorEnabled: false,
  sessionTimeout: 30,
  profileVisibility: "team",
  showOnlineStatus: true,

  reduceMotion: false,
  highContrast: false,
  underlineLinks: false,
};

const STORAGE_KEY = "app_general_settings";

/* ------------------------------------------------------------------ */
/* STATIC OPTIONS                                                      */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
 { code: "pt", label: "Portuguese", native: "Português", flag: "🇵🇹", dir: "ltr" }
];

const ACCENT_COLORS = [
  { name: "cyan", hex: "#0891b2" },
  { name: "blue", hex: "#2563eb" },
  { name: "violet", hex: "#7c3aed" },
  { name: "rose", hex: "#e11d48" },
  { name: "emerald", hex: "#059669" },
  { name: "amber", hex: "#d97706" },
];

const TIMEZONES = [
  "UTC",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Riyadh",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "د.إ" },
  { code: "INR", symbol: "₹" },
  { code: "SAR", symbol: "﷼" },
];

const SESSION_TIMEOUTS = [15, 30, 60, 120, 240];

/* ------------------------------------------------------------------ */
/* SMALL UI PRIMITIVES (same file)                                     */
/* ------------------------------------------------------------------ */

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
      focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2
      dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
      ${checked ? "bg-cyan-600" : "bg-slate-300 dark:bg-gray-600"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
        ${checked ? "translate-x-6" : "translate-x-1"}`}
    />
  </button>
);

const SettingRow = ({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) => (
  <div className="flex items-start justify-between gap-6 py-4 border-b border-slate-100 dark:border-gray-700/60 last:border-0">
    <div className="min-w-0">
      <p
        className={`text-sm font-medium ${
          danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
        }`}
      >
        {title}
      </p>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
          {description}
        </p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Section = ({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className="scroll-mt-28 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden"
  >
    <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="px-6 py-2">{children}</div>
  </section>
);

const selectCls =
  "px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 " +
  "text-sm text-slate-900 dark:text-white outline-none min-w-[170px] " +
  "focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all";

/* ------------------------------------------------------------------ */
/* MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */

const page = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [activeSection, setActiveSection] = useState("appearance");

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
      setSettings(parsed);
      setSavedSnapshot(parsed);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- DIRTY CHECK ---------------- */
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [settings, savedSnapshot]
  );

  /* ---------------- LIVE PREVIEW EFFECTS ---------------- */
  // Theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);

    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
    apply(settings.theme === "dark");
  }, [settings.theme]);

  // Font size / density / accessibility / accent
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize =
      settings.fontSize === "sm" ? "14px" : settings.fontSize === "lg" ? "18px" : "16px";
    root.dataset.density = settings.density;
    root.dataset.accent = settings.accentColor;
    root.classList.toggle("reduce-motion", settings.reduceMotion);
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("underline-links", settings.underlineLinks);
  }, [
    settings.fontSize,
    settings.density,
    settings.accentColor,
    settings.reduceMotion,
    settings.highContrast,
    settings.underlineLinks,
  ]);

  // Language + direction
  useEffect(() => {
    if (i18n.language !== settings.language) i18n.changeLanguage(settings.language);
    const dir = LANGUAGES.find((l) => l.code === settings.language)?.dir ?? "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = settings.language;
  }, [settings.language, i18n]);

  /* ---------------- BEFORE UNLOAD ---------------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ---------------- SCROLL SPY ---------------- */
  useEffect(() => {
    const ids = ["appearance", "language", "notifications", "privacy", "accessibility", "danger"];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActiveSection(e.target.id));
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [loading]);

  /* ---------------- HANDLERS ---------------- */
  const update = useCallback(<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // await api.put("/settings/general", settings);
      await new Promise((r) => setTimeout(r, 700));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedSnapshot(settings);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm(t("confirm_reset_settings"))) return;
    setSettings(DEFAULT_SETTINGS);
  };

  const handleDiscard = () => setSettings(savedSnapshot);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
          <p className="text-slate-600 dark:text-slate-400">{t("loading_settings")}</p>
        </div>
      </div>
    );
  }

  const NAV = [
    { id: "appearance", label: t("appearance"), icon: <TbPalette /> },
    { id: "language", label: t("language_and_region"), icon: <FiGlobe /> },
    { id: "notifications", label: t("notifications"), icon: <FiBell /> },
    { id: "privacy", label: t("privacy_and_security"), icon: <FiLock /> },
    { id: "accessibility", label: t("accessibility"), icon: <TbAccessible /> },
    { id: "danger", label: t("danger_zone"), icon: <FiTrash2 /> },
  ];

  return (
    <div className="px-4 py-6 mx-auto mt-10 max-w-7xl h-screen pb-32">
      {/* ============ HEADER ============ */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <TbSettings className="text-2xl text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t("general_settings")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {t("customize_your_experience_preferences")}
            </p>
          </div>
        </div>

        {savedFlash && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <FiCheck className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("settings_saved_successfully")}
            </span>
          </div>
        )}
      </header>

      {/* ============ UNSAVED BANNER ============ */}
      {isDirty && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {t("unsaved_changes")}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("you_have_unsaved_changes_save_them")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDiscard}
            className="text-sm font-medium text-amber-800 dark:text-amber-300 hover:underline"
          >
            {t("discard")}
          </button>
        </div>
      )}

      <div className="flex gap-8 items-start">
        {/* ============ STICKY SIDE NAV ============ */}
        <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-24 ">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      activeSection === item.id
                        ? "bg-cyan-50 dark:bg-cyan-900/25 text-cyan-700 dark:text-cyan-300 font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700/60"
                    }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {activeSection === item.id && <FiChevronRight className="ml-auto" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ============ FORM ============ */}
        <form onSubmit={handleSave} className="flex-1 space-y-6 min-w-0 ">
          {/* -------- 1. APPEARANCE -------- */}
          <Section
            id="appearance"
            icon={<TbPalette className="text-lg" />}
            title={t("appearance")}
            description={t("appearance_section_desc")}
          >
            {/* Theme */}
           <div className="py-4 border-b border-slate-100 dark:border-gray-700/60">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    {t("theme")}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {t("theme_desc")}
                </p>

                <ThemeToggle variant="cards" t={t} />
            </div>

            {/* Accent color */}
            {/* <SettingRow title={t("accent_color")} description={t("accent_color_desc")}>
              <div className="flex items-center gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={c.name}
                    onClick={() => update("accentColor", c.name)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110
                      ${
                        settings.accentColor === c.name
                          ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-gray-800"
                          : ""
                      }`}
                  >
                    {settings.accentColor === c.name && (
                      <FiCheck className="text-white text-xs" />
                    )}
                  </button>
                ))}
              </div>
            </SettingRow> */}

            {/* Font size */}
            <SettingRow title={t("font_size")} description={t("font_size_desc")}>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-gray-600 overflow-hidden">
                {(["sm", "md", "lg"] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("fontSize", s)}
                    className={`px-4 py-2 text-sm transition-colors
                      ${
                        settings.fontSize === s
                          ? "bg-cyan-600 text-white"
                          : "bg-white dark:bg-gray-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-600"
                      }`}
                  >
                    {t(`font_size_${s}`)}
                  </button>
                ))}
              </div>
            </SettingRow>

            {/* Density */}
            <SettingRow title={t("display_density")} description={t("display_density_desc")}>
              <select
                value={settings.density}
                onChange={(e) => update("density", e.target.value as Density)}
                className={selectCls}
              >
                <option value="comfortable">{t("comfortable")}</option>
                <option value="compact">{t("compact")}</option>
              </select>
            </SettingRow>

            {/* Sidebar */}
            <SettingRow title={t("collapse_sidebar")} description={t("collapse_sidebar_desc")}>
              <Toggle
                checked={settings.sidebarCollapsed}
                onChange={(v) => update("sidebarCollapsed", v)}
              />
            </SettingRow>
          </Section>

          {/* -------- 2. LANGUAGE & REGION -------- */}
          <Section
            id="language"
            icon={<FiGlobe className="text-lg" />}
            title={t("language_and_region")}
            description={t("language_section_desc")}
          >
            {/* Language grid */}
            <div className="py-4 border-b border-slate-100 dark:border-gray-700/60">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t("display_language")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t("display_language_desc")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => update("language", lang.code)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all
                      ${
                        settings.language === lang.code
                          ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                          : "border-slate-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-gray-500"
                      }`}
                  >
                    <span className="text-2xl leading-none">{lang.flag}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">
                        {lang.native}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                        {lang.label}
                      </span>
                    </span>
                    {settings.language === lang.code && (
                      <FiCheck className="ml-auto text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <SettingRow title={t("timezone")} description={t("timezone_desc")}>
              <select
                value={settings.timezone}
                onChange={(e) => update("timezone", e.target.value)}
                className={selectCls}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("_", " ")}
                  </option>
                ))}
              </select>
            </SettingRow>

            <SettingRow title={t("date_format")} description={t("date_format_desc")}>
              <select
                value={settings.dateFormat}
                onChange={(e) => update("dateFormat", e.target.value as DateFormat)}
                className={selectCls}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingRow>

            <SettingRow title={t("time_format")} description={t("time_format_desc")}>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-gray-600 overflow-hidden">
                {(["12h", "24h"] as TimeFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update("timeFormat", f)}
                    className={`px-4 py-2 text-sm transition-colors
                      ${
                        settings.timeFormat === f
                          ? "bg-cyan-600 text-white"
                          : "bg-white dark:bg-gray-700 text-slate-600 dark:text-slate-300"
                      }`}
                  >
                    {f === "12h" ? t("12_hour") : t("24_hour")}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow title={t("first_day_of_week")} description={t("first_day_of_week_desc")}>
              <select
                value={settings.weekStart}
                onChange={(e) => update("weekStart", e.target.value as "sunday" | "monday")}
                className={selectCls}
              >
                <option value="sunday">{t("sunday")}</option>
                <option value="monday">{t("monday")}</option>
              </select>
            </SettingRow>

            <SettingRow title={t("currency")} description={t("currency_desc")}>
              <select
                value={settings.currency}
                onChange={(e) => update("currency", e.target.value)}
                className={selectCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} — {c.code}
                  </option>
                ))}
              </select>
            </SettingRow>
          </Section>

          {/* -------- 3. NOTIFICATIONS -------- */}
          <Section
            id="notifications"
            icon={<FiBell className="text-lg" />}
            title={t("notifications")}
            description={t("notifications_section_desc")}
          >
            <SettingRow title={t("email_notifications")} description={t("email_notifications_desc")}>
              <Toggle
                checked={settings.emailNotifications}
                onChange={(v) => update("emailNotifications", v)}
              />
            </SettingRow>
            <SettingRow title={t("push_notifications")} description={t("push_notifications_desc")}>
              <Toggle
                checked={settings.pushNotifications}
                onChange={(v) => update("pushNotifications", v)}
              />
            </SettingRow>
            <SettingRow
              title={t("desktop_notifications")}
              description={t("desktop_notifications_desc")}
            >
              <Toggle
                checked={settings.desktopNotifications}
                onChange={(v) => update("desktopNotifications", v)}
              />
            </SettingRow>
            <SettingRow title={t("notification_sound")} description={t("notification_sound_desc")}>
              <Toggle checked={settings.soundEnabled} onChange={(v) => update("soundEnabled", v)} />
            </SettingRow>
            <SettingRow title={t("weekly_digest")} description={t("weekly_digest_desc")}>
              <Toggle checked={settings.weeklyDigest} onChange={(v) => update("weeklyDigest", v)} />
            </SettingRow>
            <SettingRow title={t("marketing_emails")} description={t("marketing_emails_desc")}>
              <Toggle
                checked={settings.marketingEmails}
                onChange={(v) => update("marketingEmails", v)}
              />
            </SettingRow>
          </Section>

          {/* -------- 4. PRIVACY & SECURITY -------- */}
          <Section
            id="privacy"
            icon={<FiLock className="text-lg" />}
            title={t("privacy_and_security")}
            description={t("privacy_section_desc")}
          >
            <SettingRow
              title={t("two_factor_authentication")}
              description={t("two_factor_authentication_desc")}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    settings.twoFactorEnabled
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {settings.twoFactorEnabled ? t("enabled") : t("disabled")}
                </span>
                <Toggle
                  checked={settings.twoFactorEnabled}
                  onChange={(v) => update("twoFactorEnabled", v)}
                />
              </div>
            </SettingRow>

            <SettingRow title={t("session_timeout")} description={t("session_timeout_desc")}>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => update("sessionTimeout", Number(e.target.value))}
                className={selectCls}
              >
                {SESSION_TIMEOUTS.map((m) => (
                  <option key={m} value={m}>
                    {m} {t("minutes")}
                  </option>
                ))}
              </select>
            </SettingRow>

            <SettingRow title={t("profile_visibility")} description={t("profile_visibility_desc")}>
              <select
                value={settings.profileVisibility}
                onChange={(e) => update("profileVisibility", e.target.value as ProfileVisibility)}
                className={selectCls}
              >
                <option value="everyone">{t("everyone")}</option>
                <option value="team">{t("team_only")}</option>
                <option value="private">{t("private")}</option>
              </select>
            </SettingRow>

            <SettingRow title={t("show_online_status")} description={t("show_online_status_desc")}>
              <Toggle
                checked={settings.showOnlineStatus}
                onChange={(v) => update("showOnlineStatus", v)}
              />
            </SettingRow>

            <SettingRow title={t("active_sessions")} description={t("active_sessions_desc")}>
              <button
                type="button"
                onClick={() => router.push("/settings/sessions")}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("manage")}
              </button>
            </SettingRow>
          </Section>

          {/* -------- 5. ACCESSIBILITY -------- */}
          <Section
            id="accessibility"
            icon={<TbAccessible className="text-lg" />}
            title={t("accessibility")}
            description={t("accessibility_section_desc")}
          >
            <SettingRow title={t("reduce_motion")} description={t("reduce_motion_desc")}>
              <Toggle checked={settings.reduceMotion} onChange={(v) => update("reduceMotion", v)} />
            </SettingRow>
            <SettingRow title={t("high_contrast")} description={t("high_contrast_desc")}>
              <Toggle checked={settings.highContrast} onChange={(v) => update("highContrast", v)} />
            </SettingRow>
            <SettingRow title={t("underline_links")} description={t("underline_links_desc")}>
              <Toggle
                checked={settings.underlineLinks}
                onChange={(v) => update("underlineLinks", v)}
              />
            </SettingRow>
          </Section>

          {/* -------- 6. DANGER ZONE -------- */}
          <section
            id="danger"
            className="scroll-mt-28 bg-red-50/40 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/50 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-red-200 dark:border-red-900/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <FiTrash2 className="text-lg" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
                  {t("danger_zone")}
                </h2>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                  {t("danger_zone_desc")}
                </p>
              </div>
            </div>
            <div className="px-6 py-2">
              <SettingRow danger title={t("reset_all_settings")} description={t("reset_all_settings_desc")}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <FiRotateCcw /> {t("reset")}
                </button>
              </SettingRow>
              <SettingRow danger title={t("clear_local_data")} description={t("clear_local_data_desc")}>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t("confirm_clear_local_data"))) {
                      localStorage.clear();
                      location.reload();
                    }
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {t("clear")}
                </button>
              </SettingRow>
            </div>
          </section>

          {/* -------- STICKY ACTION BAR -------- */}
          <div className="sticky bottom-0 -mx-1 px-1 pt-4 pb-4 bg-gradient-to-t from-slate-50 dark:from-gray-900 via-slate-50/95 dark:via-gray-900/95 to-transparent">
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-5 py-3 shadow-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {isDirty ? t("you_have_unsaved_changes") : t("all_changes_saved")}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!isDirty || saving}
                  className="px-5 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!isDirty || saving}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <FiSave /> {t("save_changes")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default page;