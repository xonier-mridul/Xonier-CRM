// ── Enums ─────────────────────────────────────────────────────────────────────

export enum TaskItemStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CARRIED_FORWARD = "carried_forward",
  BLOCKED = "blocked",
}

export enum TaskReportStatus {
  MORNING_PENDING = "morning_pending",
  MORNING_SUBMITTED = "morning_submitted",
  EVENING_PENDING = "evening_pending",
  EVENING_SUBMITTED = "evening_submitted",
  REVIEWED = "reviewed",
}

export enum WorkMood {
  EXCELLENT = "excellent",
  GOOD = "good",
  NEUTRAL = "neutral",
  TIRED = "tired",
  STRESSED = "stressed",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// ── Sub-models ────────────────────────────────────────────────────────────────

export interface TaskReportItem {
  title: string;
  description?: string;
  estimatedHours?: number;
  actualHours?: number;
  status: TaskItemStatus;
  priority?: TaskPriority | string;
  linkedTaskId?: string;
  blockerReason?: string;
  completionPercentage: number;
}

export interface MorningAgenda {
  items: TaskReportItem[];
  goals?: string;
  submittedAt?: string;
  isSubmitted: boolean;
}

export interface EveningReport {
  completedItems: TaskReportItem[];
  pendingItems: TaskReportItem[];
  blockers?: string;
  achievements?: string;
  tomorrowPlan?: string;
  overallMood?: WorkMood;
  submittedAt?: string;
  isSubmitted: boolean;
  totalCompletedHours?: number;
  totalPendingHours?: number;
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  status?: string;
}

// ── Main Model ────────────────────────────────────────────────────────────────

export interface TaskReport {
  id: string;
  reportDate: string;
  user: UserRef;
  morningAgenda: MorningAgenda;
  eveningReport: EveningReport;
  status: TaskReportStatus;
  managerComment?: string;
  managerReviewedAt?: string;
  reviewedBy?: UserRef;
  isReviewed: boolean;
  createdBy: UserRef;
  updatedBy?: UserRef;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ── Request / Response DTOs ───────────────────────────────────────────────────

export interface CreateMorningAgendaPayload {
  reportDate: string;
  morningAgenda: {
    items: Omit<TaskReportItem, "actualHours" | "status">[];
    goals?: string;
  };
}

export interface UpdateEveningReportPayload {
  eveningReport: {
    completedItems: TaskReportItem[];
    pendingItems: TaskReportItem[];
    blockers?: string;
    achievements?: string;
    tomorrowPlan?: string;
    overallMood?: WorkMood;
  };
}

export interface TaskReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskReportStatus;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTaskReports {
  data: TaskReport[];
  page: number;
  totalPages: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}