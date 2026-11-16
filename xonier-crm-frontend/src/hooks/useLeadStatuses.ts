"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { LeadStatus, LeadStatusService, DealStageSettingsService } from "@/src/services/leadStatus.service";

export function useLeadStatuses(entity: "lead" | "deal" = "lead") {
  const eventName = entity === "deal" ? "deal-stages" : "lead-statuses";
  const service = entity === "deal" ? DealStageSettingsService : LeadStatusService;
  const userId = useSelector((s: RootState) => s.auth.user?.id || s.auth.user?._id);
  const requestRef = useRef(0);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    if (!userId) { setStatuses([]); setLoading(false); return; }
    try {
      const res = await service.list();
      if (request !== requestRef.current) return;
      setStatuses(res.data.data); setError("");
    } catch { if (request === requestRef.current) setError(`Unable to load ${entity} stages. Please retry.`); }
    finally { if (request === requestRef.current) setLoading(false); }
  }, [userId, service, entity]);
  useEffect(() => {
    setStatuses([]); setError(""); setLoading(true); void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(`${eventName}-changed`, refresh);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(eventName) : null;
    if (channel) channel.onmessage = () => { void refresh(); };
    return () => { ++requestRef.current; window.removeEventListener("focus", refresh); window.removeEventListener(`${eventName}-changed`, refresh); channel?.close(); };
  }, [refresh, eventName]);
  const label = useCallback(
    (key: string) => statuses.find(s => s.key === (entity === "deal" && key === "closed_won" ? "won" : key))?.name || key?.replace(/_/g, " "),
    [statuses, entity]
  );
  return { statuses, loading, error, refresh,
    options: statuses.map(s => ({ label: s.name, value: s.key })),
    label,
  };
}
export function useDealStages() { return useLeadStatuses("deal"); }
