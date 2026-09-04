import i18n from "i18next";

const localeMap: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  pt: "pt-PT",
};

const getLocale = () => localeMap[i18n.language] || "en-US";

export const FormatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const FormatWeekday = (date: string | Date) => {
  return new Intl.DateTimeFormat(getLocale(), {
    weekday: "long",
  }).format(new Date(date));
};

export const FormatDateTime = (date: string | Date | null | undefined) => {
  if (!date) return "-";

  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
};