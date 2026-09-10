// src/components/common/AdvancedFilters/AdvancedFilters.types.ts

export type SourceFilterValue = "" | "all" | "company" | "referral";

export interface AdvancedFiltersValues {
  teamFilter: string;
  designationFilter: string;
  salesPersonFilter: string;
  sourceFilter: SourceFilterValue | string;
}

export interface AdvancedFiltersVisibility {
  showTeam?: boolean;
  showDesignation?: boolean;
  showSalesPerson?: boolean;
  showSource?: boolean;
}