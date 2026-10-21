"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ChatDialog({ title, subtitle, children, close, busy = false, wide = false }: {
  title: string; subtitle?: string; children: React.ReactNode; close: () => void; busy?: boolean; wide?: boolean;
}) {
  const box = useRef<HTMLElement>(null);
  const id = useId();
  const state = useRef({ close, busy });
  useEffect(() => { state.current = { close, busy }; }, [close, busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (document.querySelector(".swal2-container")) return;
      if (event.key === "Escape" && !state.current.busy) state.current.close();
      if (event.key !== "Tab") return;
      const nodes = box.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === box.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !busy) close(); }}>
    <section ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white ${wide ? "max-w-2xl" : "max-w-xl"}`}>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700"><div><h2 id={id} className="text-lg font-semibold tracking-tight">{title}</h2>{subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button disabled={busy} aria-label="Close dialog" onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-600 disabled:opacity-40 dark:hover:bg-slate-800"><X size={20} /></button></header>
      {children}
    </section>
  </div>, document.body);
}

export function PersonAvatar({ name, online, size = "md" }: { name: string; online?: boolean; size?: "sm" | "md" }) {
  return <span className={`relative flex shrink-0 items-center justify-center rounded-xl bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200 ${size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs"}`}>
    {name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?"}
    {online !== undefined && <span role="img" aria-label={online ? "Recently active" : "Not recently active"} title={online ? "Active connection confirmed by a recent heartbeat" : "No recent active connection"} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${online ? "bg-emerald-500" : "bg-slate-400"}`} />}
  </span>;
}

// ConfirmPopup accepts HTML text; escape teammate/channel-controlled values.
export const dialogText = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
