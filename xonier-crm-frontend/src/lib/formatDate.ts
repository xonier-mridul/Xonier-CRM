export function formatDate(date: string, language: string) {
  const locales: Record<string, string> = { en: "en-US", hi: "hi-IN", pt: "pt-PT" };
  return new Date(date).toLocaleDateString(locales[language] || "en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
