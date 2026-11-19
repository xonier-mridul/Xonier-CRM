"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "@/src/lib/axios";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  RotateCw,
} from "lucide-react";

type SelectMenuOption = {
  index: number;
  value: string;
  text: string;
};

type BrowserFrame = {
  image: string;
  url: string;
  title: string;
  width: number;
  height: number;
  status: string;
  profileName?: string | null;
  handle?: string | null;
  streamTicket?: string;
  bridgeUrl?: string;
  selectMenu?: { value: string; options: SelectMenuOption[] } | null;
};

export type LiveLinkedInFrameMeta = {
  url: string;
  title: string;
  profileName?: string | null;
  handle?: string | null;
};

const errorMessage = (error: unknown) =>
  axios.isAxiosError(error)
    ? error.response?.data?.message || error.response?.data?.error?.message || "LinkedIn service is unavailable. Please try again."
    : "Unable to complete this action.";

const SPECIAL_KEYS = new Set([
  "Enter",
  "Backspace",
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowUp",
  "ArrowRight",
  "ArrowDown",
  "Delete",
  "Home",
  "End",
]);

export function LiveLinkedInBrowser({
  active,
  navigateTarget,
  onNavigateConsumed,
  onConnected,
  onSynced,
  isLoginMode = false,
  streamTicket,
  bridgeUrl,
  onFrameMeta,
}: {
  active: boolean;
  navigateTarget: string | null;
  onNavigateConsumed: () => void;
  onConnected: () => void;
  onSynced: () => void;
  isLoginMode?: boolean;
  streamTicket?: string;
  bridgeUrl?: string;
  onFrameMeta?: (meta: LiveLinkedInFrameMeta) => void;
}) {
  const [frame, setFrame] = useState<BrowserFrame | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [browserError, setBrowserError] = useState("");
  const [selectMenu, setSelectMenu] = useState<BrowserFrame["selectMenu"]>(null);
  const [clickMarker, setClickMarker] = useState<{ xPct: number; yPct: number } | null>(null);
  const actingRef = useRef(false);
  const lastInteractionAt = useRef(0);
  const lastWheelPos = useRef<{ x: number; y: number }>({ x: 640, y: 400 });
  const ticketRef = useRef(streamTicket || "");
  const bridgeUrlRef = useRef(bridgeUrl || "");
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const typingBuffer = useRef("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelDelta = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (streamTicket) ticketRef.current = streamTicket;
    if (bridgeUrl) bridgeUrlRef.current = bridgeUrl;
  }, [streamTicket, bridgeUrl]);

  const canDirectStream = () =>
    typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && Boolean(ticketRef.current && bridgeUrlRef.current);

  const applyFrameResponse = useCallback(
    (data: BrowserFrame & { synced?: unknown }) => {
      if (data.streamTicket) ticketRef.current = data.streamTicket;
      if (data.bridgeUrl) bridgeUrlRef.current = data.bridgeUrl;
      if ("selectMenu" in data) setSelectMenu(data.selectMenu || null);
      setFrame(data);
      setBrowserError("");
      onFrameMeta?.({
        url: data.url,
        title: data.title,
        profileName: data.profileName,
        handle: data.handle,
      });
      if (isLoginMode && data.status === "connected") {
        onConnected();
      }
      if (data.synced) {
        onSynced();
      }
    },
    [isLoginMode, onConnected, onSynced, onFrameMeta],
  );

  const fetchFrame = useCallback(
    async (targetUrl?: string | null, signal?: AbortSignal) => {
      try {
        let data: BrowserFrame | null = null;
        if (canDirectStream()) {
          try {
            const direct = await axios.get<BrowserFrame>(`${bridgeUrlRef.current}/browser/frame`, {
              headers: { Authorization: `Bearer ${ticketRef.current}` },
              params: targetUrl ? { url: targetUrl } : undefined,
              signal,
              timeout: 15000,
            });
            data = direct.data;
          } catch (directErr) {
            if (axios.isCancel(directErr)) throw directErr;
            if (!axios.isAxiosError(directErr) || !directErr.response || directErr.response.status === 401) {
              ticketRef.current = "";
            } else {
              throw directErr;
            }
          }
        }
        if (!data) {
          const res = await api.get<BrowserFrame>("/linkedin/browser/frame", {
            params: targetUrl ? { url: targetUrl } : undefined,
            signal,
          });
          data = res.data;
        }
        if (!signal?.aborted) {
          applyFrameResponse(data);
          setLoading(false);
        }
      } catch (err) {
        if (!signal?.aborted && !axios.isCancel(err)) {
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            setLoading(false);
            return;
          }
          setBrowserError(errorMessage(err));
          setLoading(false);
        }
      }
    },
    [applyFrameResponse],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let cancelled = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async (target?: string | null) => {
      if (pending) return;
      pending = true;
      await fetchFrame(target, controller.signal);
      pending = false;
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const recentlyActive = Date.now() - lastInteractionAt.current < 8000;
      const delay = recentlyActive ? 350 : 900;
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (document.visibilityState === "visible" && !actingRef.current) {
          await load(null);
        }
        scheduleNext();
      }, delay);
    };

    const boot = navigateTarget
      ? load(navigateTarget).then(() => onNavigateConsumed())
      : load(null);
    void boot.then(scheduleNext);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [active, fetchFrame, navigateTarget, onNavigateConsumed]);

  const sendAction = useCallback(
    async (payload: Record<string, unknown>) => {
      lastInteractionAt.current = Date.now();
      setActing(true);
      actingRef.current = true;
      try {
        let data: (BrowserFrame & { synced?: unknown }) | null = null;
        if (canDirectStream()) {
          try {
            const direct = await axios.post<BrowserFrame & { synced?: unknown }>(
              `${bridgeUrlRef.current}/browser/action`,
              payload,
              { headers: { Authorization: `Bearer ${ticketRef.current}` }, timeout: 25000 },
            );
            data = direct.data;
          } catch (directErr) {
            if (!axios.isAxiosError(directErr) || !directErr.response || directErr.response.status === 401) {
              ticketRef.current = "";
            } else {
              throw directErr;
            }
          }
        }
        if (!data) {
          const res = await api.post<BrowserFrame & { synced?: unknown }>("/linkedin/browser/action", payload);
          data = res.data;
        }
        applyFrameResponse(data);
      } catch (err) {
        setBrowserError(errorMessage(err));
      } finally {
        setActing(false);
        actingRef.current = false;
        setTimeout(() => {
          if (!actingRef.current) void fetchFrame(null);
        }, 150);
      }
    },
    [applyFrameResponse, fetchFrame],
  );

  const flushTyping = useCallback(() => {
    const text = typingBuffer.current;
    typingBuffer.current = "";
    if (text) {
      void sendAction({ type: "type", text });
    }
  }, [sendAction]);

  const handleViewportClick = (event: React.MouseEvent<HTMLImageElement>) => {
    lastInteractionAt.current = Date.now();
    viewportRef.current?.focus({ preventScroll: true });
    if (!imgRef.current || !frame) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    setClickMarker({ xPct, yPct });
    setTimeout(() => setClickMarker(null), 450);
    const x = Math.round(((event.clientX - rect.left) / rect.width) * (frame.width || 1280));
    const y = Math.round(((event.clientY - rect.top) / rect.height) * (frame.height || 800));
    void sendAction({ type: "click", x, y });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    lastInteractionAt.current = Date.now();
    const pasted = event.clipboardData?.getData("text");
    if (pasted) {
      event.preventDefault();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingBuffer.current) flushTyping();
      void sendAction({ type: "type", text: pasted });
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    lastInteractionAt.current = Date.now();
    if (imgRef.current && frame) {
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width && rect.height) {
        lastWheelPos.current = {
          x: Math.max(0, Math.min(frame.width || 1280, Math.round(((event.clientX - rect.left) / rect.width) * (frame.width || 1280)))),
          y: Math.max(0, Math.min(frame.height || 800, Math.round(((event.clientY - rect.top) / rect.height) * (frame.height || 800)))),
        };
      }
    }
    wheelDelta.current += event.deltaY;
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => {
      const dy = wheelDelta.current;
      wheelDelta.current = 0;
      if (Math.abs(dy) > 5) {
        void sendAction({
          type: "scroll",
          x: lastWheelPos.current.x,
          y: lastWheelPos.current.y,
          deltaX: 0,
          deltaY: Math.round(dy),
        });
      }
    }, 50);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    lastInteractionAt.current = Date.now();
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (SPECIAL_KEYS.has(event.key)) {
      event.preventDefault();
      if (typingBuffer.current) flushTyping();
      void sendAction({ type: "key", key: event.key });
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      typingBuffer.current += " ";
    } else if (event.key.length === 1) {
      event.preventDefault();
      typingBuffer.current += event.key;
    } else {
      return;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(flushTyping, 60);
  };

  const realLinkedInUrl =
    frame?.url && /^https:\/\/([a-z0-9-]+\.)?linkedin\.com(\/|$)/i.test(frame.url)
      ? frame.url
      : "https://www.linkedin.com/feed/";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={acting}
            onClick={() => void sendAction({ type: "back" })}
            title="Back"
            className="rounded p-1.5 hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => void sendAction({ type: "forward" })}
            title="Forward"
            className="rounded p-1.5 hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => void sendAction({ type: "reload" })}
            title="Reload"
            className="rounded p-1.5 hover:bg-slate-700 disabled:opacity-40"
          >
            <RotateCw size={14} className={acting ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="min-w-[180px] flex-1 truncate rounded-md bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] text-slate-300">
          {frame?.url || "https://www.linkedin.com/..."}
        </div>

        {!isLoginMode && (
          <div className="flex flex-wrap items-center gap-1">
            {[
              { label: "Feed", url: "https://www.linkedin.com/feed/" },
              { label: "Messaging", url: "https://www.linkedin.com/messaging/" },
              { label: "My Network", url: "https://www.linkedin.com/mynetwork/" },
              { label: "Notifications", url: "https://www.linkedin.com/notifications/" },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                disabled={acting}
                onClick={() => void sendAction({ type: "navigate", url: item.url })}
                className="rounded-md bg-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              disabled={acting}
              onClick={() => void sendAction({ type: "sync" })}
              className="rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Sync Inbox
            </button>
            <button
              type="button"
              onClick={() => window.open(realLinkedInUrl, "_blank", "noopener,noreferrer")}
              title="Open current LinkedIn page in a new browser tab"
              className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700/80 px-2.5 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-600"
            >
              <ExternalLink size={12} />
              Open in New Tab
            </button>
          </div>
        )}
      </div>

      {selectMenu && selectMenu.options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-sky-700/60 bg-sky-950/80 px-3 py-2 text-xs text-sky-100">
          <span className="font-semibold">Dropdown detected:</span>
          <select
            value={selectMenu.value}
            disabled={acting}
            onChange={e => {
              const val = e.target.value;
              setSelectMenu(null);
              void sendAction({ type: "type", key: "SELECT_OPTION", text: val });
            }}
            className="max-w-xs flex-1 rounded-md border border-sky-500 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
          >
            {selectMenu.options.map(opt => (
              <option key={`${opt.index}-${opt.value}`} value={opt.value}>
                {opt.text}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelectMenu(null)}
            className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {browserError && (
        <div className="border-b border-amber-500/40 bg-amber-950/70 px-3 py-2 text-xs text-amber-200">
          {browserError}
        </div>
      )}

      <div
        ref={viewportRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onWheel={handleWheel}
        className="relative flex min-h-[420px] items-center justify-center bg-slate-950 outline-none focus:ring-2 focus:ring-sky-500/60"
      >
        {loading && !frame ? (
          <div className="flex items-center gap-2 py-20 text-sm text-slate-300">
            <Loader2 className="animate-spin" size={20} /> Starting secure LinkedIn browser session…
          </div>
        ) : frame?.image ? (
          <div className="relative inline-block w-full max-w-[1280px]">
            <img
              ref={imgRef}
              src={frame.image}
              alt="Interactive LinkedIn Browser"
              onClick={handleViewportClick}
              draggable={false}
              className="h-auto w-full cursor-pointer select-none object-contain"
            />
            {clickMarker && (
              <span
                style={{ left: `${clickMarker.xPct}%`, top: `${clickMarker.yPct}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-sky-400 bg-sky-400/30 animate-ping"
              />
            )}
          </div>
        ) : (
          <div className="py-20 text-sm text-slate-400">Waiting for LinkedIn screen…</div>
        )}
      </div>
      <div className="bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400">
        Tip: Click inside LinkedIn fields on the screen above to focus them, then type or paste directly. Scroll with your mouse wheel.
      </div>
    </div>
  );
}
