// src/hooks/useAdvancedFilters.ts
"use client";
import { useState, useCallback } from "react";
import { SourceFilterValue } from "../types/advanceFilter/AdvanceFilter";

export function useAdvancedFilters() {
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [designationFilter, setDesignationFilter] = useState<string>("");
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>("all");

  const reset = useCallback(() => {
    setTeamFilter("");
    setDesignationFilter("");
    setSalesPersonFilter("");
    setSourceFilter("all");
  }, []);

  const activeCount = [
    teamFilter,
    designationFilter,
    salesPersonFilter,
  ].filter(Boolean).length;

  return {
    teamFilter,
    setTeamFilter,
    designationFilter,
    setDesignationFilter,
    salesPersonFilter,
    setSalesPersonFilter,
    sourceFilter,
    setSourceFilter,
    reset,
    activeCount,
  };
}