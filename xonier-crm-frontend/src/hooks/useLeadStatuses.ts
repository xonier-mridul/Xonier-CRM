"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { LeadStatus, LeadStatusService } from "@/src/services/leadStatus.service";

export function useLeadStatuses() {
  const userId = useSelector((s: RootState) => s.auth.user?.id || s.auth.user?._id);
  const requestRef = useRef(0);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    if (!userId) { setStatuses([]); setLoading(false); return; }
    try {
      const res = await LeadStatusService.list();
      if (request !== requestRef.current) return;
      setStatuses(res.data.data); setError("");
    } catch { if (request === requestRef.current) setError("Unable to load lead statuses. Please retry."); }
    finally { if (request === requestRef.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    setStatuses([]); setError(""); setLoading(true); void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("lead-statuses-changed", refresh);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lead-statuses") : null;
    if (channel) channel.onmessage = () => { void refresh(); };
    return () => { ++requestRef.current; window.removeEventListener("focus", refresh); window.removeEventListener("lead-statuses-changed", refresh); channel?.close(); };
  }, [refresh]);
  const label = useCallback(
    (key: string) => statuses.find(s => s.key === key)?.name || key?.replace(/_/g, " "),
    [statuses]
  );
  return { statuses, loading, error, refresh,
    options: statuses.map(s => ({ label: s.name, value: s.key })),
    label,
  };
}
