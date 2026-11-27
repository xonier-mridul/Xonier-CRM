"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "@/src/lib/axios";
import CompanyService from "@/src/services/company.service";

type EntityType = "lead" | "deal";
type Owner = { id: string; name: string };
type Action = {
  id: string;
  kind: string;
  title: string;
  dueAt: string;
  ownerName: string;
  completedAt: string | null;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object" || !("response" in error)) return fallback;
  const response = (error as { response?: { data?: { message?: unknown; detail?: unknown } } }).response;
  const apiMessage = response?.data?.message ?? response?.data?.detail;
  if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage;
  if (Array.isArray(apiMessage)) {
    const messages = apiMessage
      .map((item) => item && typeof item === "object" && "msg" in item ? String(item.msg) : "")
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

function formatDueDate(iso: string, tz: string): string {
  const date = new Date(iso);
  try {
    return date.toLocaleString(undefined, { timeZone: tz });
  } catch {
    return date.toLocaleString();
  }
}

export default function NextActions({ entityType, entityId, canEdit, defaultOwnerId, promptOnOpen, onActionCreated }: {
  entityType: EntityType;
  entityId: string;
  canEdit: boolean;
  defaultOwnerId?: string;
  promptOnOpen?: boolean;
  onActionCreated?: () => void;
}) {
  const [actions, setActions] = useState<Action[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [kind, setKind] = useState("call");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [timezone, setTimezone] = useState<string | null>(null);
  const [promptNext, setPromptNext] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (promptOnOpen && canEdit) {
      setPromptNext(true);
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [promptOnOpen, canEdit]);

  useEffect(() => { CompanyService.getCompanyDetails().then((company) => setTimezone(company.timezone || "UTC")).catch(() => setError("Could not load company timezone.")); }, []);

  const base = `/next-action/${entityType}/${entityId}`;
  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: Action[] }>(base);
      setActions(response.data.data);
      setError("");
    } catch {
      setError("Could not load next actions.");
    }
  }, [base]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!canEdit) return;
    api.get<{ data: Owner[] }>(`${base}/owners`)
      .then((response) => setOwners(response.data.data))
      .catch(() => setOwners([]));
  }, [base, canEdit]);
  useEffect(() => {
    if (owners.length && !ownerId) {
      setOwnerId(owners.find((owner) => owner.id === defaultOwnerId)?.id || owners[0].id);
    }
  }, [owners, ownerId, defaultOwnerId]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueAt || !ownerId || !timezone) return;
    setBusy(true);
    setError("");
    try {
      await api.post(base, { kind, title: title.trim(), localDueAt: dueAt, ownerId });
      setTitle("");
      setDueAt("");
      setPromptNext(false);
      toast.success("Next action scheduled");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("xonier:notifications-updated"));
      }
      onActionCreated?.();
      await load();
    } catch (error) {
      setError(apiErrorMessage(error, "Could not save this action. Check the date and owner."));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (actionId: string) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`${base}/${actionId}/complete`);
      await load();
      setPromptNext(true);
      requestAnimationFrame(() => titleRef.current?.focus());
    } catch {
      setError("Could not complete this action.");
    } finally {
      setBusy(false);
    }
  };

  const pending = actions.filter((action) => !action.completedAt);
  const completed = actions.filter((action) => action.completedAt);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Next actions</h3>
      <p className="mb-4 text-sm text-gray-500">Schedule work directly on this {entityType}. Time zone: {timezone || "loading…"}.</p>
      {canEdit && (
        <>
        {promptNext && <p role="status" className="mb-3 rounded border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Action completed. Schedule the next step below.</p>}
        <form onSubmit={create} className="mb-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm">Type
            <select aria-label="Action type" value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 w-full rounded border p-2 dark:bg-gray-700">
              {(["call", "email", "meeting", "task", "whatsapp", "other"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm">Owner
            <select aria-label="Action owner" value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required className="mt-1 w-full rounded border p-2 dark:bg-gray-700">
              <option value="">Select owner</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Action
            <input ref={titleRef} aria-label="Action title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required className="mt-1 w-full rounded border p-2 dark:bg-gray-700" placeholder="e.g. Call to confirm meeting" />
          </label>
          <label className="text-sm">Due date and time
            <input aria-label="Action due date" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required className="mt-1 w-full rounded border p-2 dark:bg-gray-700" />
          </label>
          <button type="submit" disabled={busy || !owners.length || !timezone} className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">Add next action</button>
        </form>
        </>
      )}
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {pending.length === 0 && <p className="text-sm text-gray-500">No pending actions.</p>}
        {pending.map((action) => {
          const overdue = new Date(action.dueAt).getTime() < Date.now();
          return <div key={action.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 p-3 dark:border-gray-700">
            <div><p className="font-medium">{action.title}</p><p className="text-sm text-gray-500">{action.kind} · {action.ownerName} · {timezone ? formatDueDate(action.dueAt, timezone) : "Loading…"}</p></div>
            <div className="flex items-center gap-2">{overdue && <span className="text-sm font-semibold text-red-600">Overdue</span>}{canEdit && <button type="button" disabled={busy} onClick={() => void complete(action.id)} className="rounded border px-3 py-1 text-sm">Complete</button>}</div>
          </div>;
        })}
      </div>
      {completed.length > 0 && <details className="mt-4 text-sm"><summary>Completed ({completed.length})</summary><ul className="mt-2 space-y-1">{completed.map((action) => <li key={action.id}>{action.title} · {action.ownerName}</li>)}</ul></details>}
    </section>
  );
}
