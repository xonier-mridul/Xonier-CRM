import type { IconType } from "react-icons";

export type SupportView =
  | "menu"
  | "contact"
  | "chat"
  | "docs"
  | "bug"
  | "feature"
  | "status";

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

export type BugPriority = "low" | "medium" | "high" | "critical";

export interface BugReportFormData {
  subject: string;
  description: string;
  priority: BugPriority;
  screenshot: File | null;
  url: string;
  browser: string;
  os: string;
}

export type FeaturePriority = "low" | "medium" | "high";

export interface FeatureRequestFormData {
  title: string;
  description: string;
  businessImpact: string;
  priority: FeaturePriority;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

export type ServiceStatusLevel = "operational" | "maintenance" | "outage";

export interface ServiceStatus {
  id: string;
  name: string;
  status: ServiceStatusLevel;
}

export interface DocArticleTranslation {
  title: string;
  description: string;
  href: string;
}

export interface DocArticle extends DocArticleTranslation {
  id: string;
  icon: IconType;
}