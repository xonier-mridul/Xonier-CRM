export enum CampaignDistributionMode {
  ON_DEMAND = "on_demand",
  EQUAL = "equal",
  CONDITIONAL = "conditional",
}

export enum CampaignStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

export enum CampaignLeadStatus {
  UNASSIGNED = "unassigned",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

export interface ICampaign {
  _id: string;
  name: string;
  description?: string;
  managers: any[]; 
  agents: any[];
  distributionMode: CampaignDistributionMode;
  distributionConfig?: Record<string, any>;
  status: CampaignStatus;
  company_id: string;
  totalLeads?: number;
  assignedLeads?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICampaignCreatePayload {
  name: string;
  description?: string;
  managers: string[];
  agents: string[];
  distributionMode: CampaignDistributionMode;
  distributionConfig?: Record<string, any>;
  status?: CampaignStatus;
}

export interface ICampaignUpdatePayload {
  name?: string;
  description?: string;
  managers?: string[];
  agents?: string[];
  distributionMode?: CampaignDistributionMode;
  distributionConfig?: Record<string, any>;
}

export interface ICampaignStatusUpdatePayload {
  status: CampaignStatus;
}
