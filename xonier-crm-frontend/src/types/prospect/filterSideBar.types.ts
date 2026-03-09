import { IconType } from "react-icons";

export type FilterFieldType =
  | "text"
  | "checkbox_group"
  | "select"
  | "multi_select"
  | "range_slider"
  | "date_range"
  | "toggle_group";

export interface FilterOption {
  label: string;
  value: string;
  info?: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  step?: number;
  formatLabel?: (val: number) => string;
  defaultValue?: [number, number];
}

export interface DateRangeConfig {
  fromLabel?: string;
  toLabel?: string;
  options: string[];
}

export interface FilterSubSection {
  label: string;
  collapsible?: boolean;
  fields: FilterField[];
}

export interface FilterField {
  key: string;
  label?: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterOption[];
  sliderConfig?: SliderConfig;
  dateRangeConfig?: DateRangeConfig;
  info?: string;
}

export interface FilterSection {
  key: string;
  label: string;
  icon?: IconType;
  defaultOpen?: boolean;
  fields: FilterField[];
  type?: "company" | "people" | "both";
  subSections?: FilterSubSection[];
  aiEnrichment?: {
    label: string;
    description: string;
    ctaText: string;
  };
}

export interface FilterConfig {
  sections: FilterSection[];
}

export type FilterValues = Record<string, FilterValue>;

export type FilterValue =
  | string
  | string[]
  | { min: number; max: number }
  | { from: string; to: string };

export interface FilterSideBarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  onReset?: () => void;
}

export type CompanyPeopleToggleType = "company" | "people";