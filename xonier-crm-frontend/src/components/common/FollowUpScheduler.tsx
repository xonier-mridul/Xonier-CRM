"use client";

import { useState } from "react";
import { parseFollowUpTime } from "@/src/app/utils/followUpTime.utils";
import { CalendarClock, Clock3, X } from "lucide-react";
import { toast } from "react-toastify";
import { FollowUpEntity, FollowUpService } from "@/src/services/follow-up.service";

type Props = {
  entity: FollowUpEntity;
  recordId: string;
  recordName: string;
  followUpAt?: string | null;
  onUpdated?: () => void | Promise<void>;
};

const toIstInput = (value?: string | null) => {
  if (!value) return "";
  return parseFollowUpTime(value)
    .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
    .replace(" ", "T")
    .slice(0, 16);
};

const formatIst = (value?: string | null) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(parseFollowUpTime(value)) + " IST";
};

export default function FollowUpScheduler({ entity, recordId, recordName, followUpAt, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [customTime, setCustomTime] = useState(() => toIstInput(followUpAt));
  const [saving, setSaving] = useState(false);

  const save = async (followUpIn: string | null) => {
    setSaving(true);
    try {
      await FollowUpService.update(entity, recordId, followUpIn);
      toast.success(followUpIn ? "Follow-up saved" : "Follow-up removed");
      setOpen(false);
      window.dispatchEvent(new Event("follow-up-updated"));
      await onUpdated?.();
    } catch {
      toast.error("Could not save follow-up. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setCustomTime(toIstInput(followUpAt)); setOpen(true); }}
        title={followUpAt ? `Follow-up: ${formatIst(followUpAt)}` : "Set follow-up"}
        className={`inline-flex min-w-8 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${followUpAt ? "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300" : "text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20"}`}
      >
        <CalendarClock size={16} />
        {followUpAt ? <span>{formatIst(followUpAt)}</span> : <span>Follow-up</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label={`Set follow-up for ${recordName}`} className="box-border max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Set follow-up</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{recordName}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"><X size={18} /></button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick schedule · IST</p>
            <div className="grid grid-cols-3 gap-2">
              {[ ["1 hour", "1h"], ["6 hours", "6h"], ["1 day", "1d"] ].map(([label, value]) => (
                <button key={value} type="button" disabled={saving} onClick={() => void save(value)} className="rounded-lg border border-cyan-200 px-3 py-2.5 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 dark:border-cyan-900 dark:text-cyan-300 dark:hover:bg-cyan-900/30">
                  <Clock3 size={14} className="mr-1 inline" />{label}
                </button>
              ))}
            </div>

            <label className="mt-5 block min-w-0 text-sm font-medium text-slate-700 dark:text-gray-200">
              <span className="mb-1.5 block">Custom date and time (IST)</span>
              <input type="datetime-local" value={customTime} onChange={(event) => setCustomTime(event.target.value)} className="box-border block w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-cyan-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </label>
            <div className="mt-5 flex items-center justify-between gap-3">
              {followUpAt ? <button type="button" disabled={saving} onClick={() => void save(null)} className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">Remove follow-up</button> : <span />}
              <button type="button" disabled={saving || !customTime} onClick={() => void save(customTime)} className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : "Save follow-up"}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">The calendar event is added automatically when Google Calendar is connected.</p>
          </section>
        </div>
      )}
    </>
  );
}
