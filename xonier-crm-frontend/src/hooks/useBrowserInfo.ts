import { useEffect, useState } from "react";

interface BrowserInfo {
  browser: string;
  os: string;
  url: string;
}

function detectBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Google Chrome";
  if (ua.includes("Firefox/")) return "Mozilla Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Unknown Browser";
}

function detectOS(ua: string): string {
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac") && !ua.includes("like Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("like Mac")) return "iOS";
  return "Unknown OS";
}

export function useBrowserInfo(): BrowserInfo {
  const [info, setInfo] = useState<BrowserInfo>({
    browser: "Unknown Browser",
    os: "Unknown OS",
    url: "",
  });

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setInfo({
      browser: detectBrowser(ua),
      os: detectOS(ua),
      url: window.location.href,
    });
  }, []);

  return info;
}