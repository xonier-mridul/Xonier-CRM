"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import api from "@/src/lib/axios";
import { FaLinkedin } from "react-icons/fa";
import {
  LiveLinkedInBrowser,
  type LiveLinkedInFrameMeta,
} from "@/src/components/linkedin/LiveLinkedInBrowser";
import {
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Unplug,
  Users,
  Zap,
} from "lucide-react";

const COOKIE_EDITOR_WEBSTORE_URL =
  "https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm";

function parseLinkedInClipboard(raw: string): {
  liAt: string;
  jsessionId?: string;
  cookies?: Record<string, unknown>[];
} | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  // 1. Cookie-Editor / EditThisCookie JSON export
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const cookies: Record<string, unknown>[] = [];
      let liAt = "";
      let jsessionId = "";

      for (const item of list) {
        if (!item || typeof item.name !== "string" || typeof item.value !== "string") continue;
        const sameSiteRaw = String(item.sameSite || "").toLowerCase();
        const sameSite =
          sameSiteRaw === "no_restriction" || sameSiteRaw === "none"
            ? "None"
            : sameSiteRaw === "lax"
              ? "Lax"
              : sameSiteRaw === "strict"
                ? "Strict"
                : undefined;
        const exp = item.expirationDate ?? item.expires;
        cookies.push({
          name: item.name,
          value: item.value,
          domain: typeof item.domain === "string" && item.domain ? item.domain : ".linkedin.com",
          path: typeof item.path === "string" && item.path ? item.path : "/",
          secure: item.secure !== false,
          httpOnly: Boolean(item.httpOnly),
          ...(sameSite ? { sameSite } : {}),
          ...(typeof exp === "number" && Number.isFinite(exp) ? { expires: Math.floor(exp) } : {}),
        });
        if (item.name === "li_at" && item.value) liAt = item.value.trim();
        if (item.name === "JSESSIONID" && item.value) jsessionId = item.value.trim().replace(/^"|"$/g, "");
      }
      if (liAt.length >= 20) {
        return { liAt, jsessionId: jsessionId || undefined, cookies };
      }
    } catch {
      // Fall through to other formats
    }
  }

  // 2. Header string format (e.g. "bcookie=...; li_at=...; JSESSIONID=...")
  const headerLiAt = trimmed.match(/(?:^|[;\s])li_at=([^;\r\n]+)/);
  if (headerLiAt?.[1]) {
    const liAt = headerLiAt[1].trim().replace(/^"|"$/g, "");
    const headerJsession = trimmed.match(/(?:^|[;\s])JSESSIONID=([^;\r\n]+)/);
    const jsessionId = headerJsession?.[1]?.trim().replace(/^"|"$/g, "");
    if (liAt.length >= 20) return { liAt, jsessionId: jsessionId || undefined };
  }

  // 3. Netscape cookie file format (tab-separated)
  const netscapeLiAt = trimmed.match(/\tli_at\t([^\r\n\t]+)/);
  if (netscapeLiAt?.[1]) {
    const liAt = netscapeLiAt[1].trim();
    const netscapeJsession = trimmed.match(/\tJSESSIONID\t([^\r\n\t]+)/);
    const jsessionId = netscapeJsession?.[1]?.trim().replace(/^"|"$/g, "");
    if (liAt.length >= 20) return { liAt, jsessionId: jsessionId || undefined };
  }

  // 4. Raw li_at token
  const cleanToken = trimmed.replace(/^"|"$/g, "");
  if (cleanToken.length >= 20 && !/\s/.test(cleanToken)) {
    return { liAt: cleanToken };
  }

  return null;
}

type Connection = {
  owner?: string;
  ownerName?: string;
  profileName?: string | null;
  headline?: string | null;
  handle?: string | null;
  profileUrl?: string | null;
  status: string;
  browserActive?: boolean;
  lastSyncedAt?: string | null;
  error?: string | null;
  streamTicket?: string;
  bridgeUrl?: string;
};

type Chat = {
  threadId: string;
  conversationUrn?: string;
  name: string;
  headline?: string;
  handle?: string | null;
  profileUrl?: string | null;
  preview?: string;
  timestamp: number;
};

type Contact = {
  contactId: string;
  name: string;
  headline?: string;
  handle?: string | null;
  profileUrl?: string | null;
};

type Message = {
  messageId: string;
  text: string;
  fromMe: boolean;
  senderName?: string;
  timestamp: number;
  status: number;
};

type Overview = {
  admin: boolean;
  currentUser: string;
  connections: Connection[];
};

const errorMessage = (error: unknown) =>
  axios.isAxiosError(error)
    ? error.response?.data?.message || error.response?.data?.error?.message || "LinkedIn service is unavailable. Please try again."
    : "Unable to complete this action.";

const formatTime = (value: number) =>
  value ? new Date(value * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const statusLabel: Record<string, string> = {
  login_browser: "Sign in via LinkedIn browser below",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Session needs attention",
};

export default function LinkedInPage() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  return <LinkedInWorkspace key={userId || "anonymous"} />;
}

function LinkedInWorkspace() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connection, setConnection] = useState<Connection>({ status: "disconnected" });
  const [owner, setOwner] = useState("");
  const [tab, setTab] = useState<"chats" | "contacts" | "browser">("chats");
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [showCookieForm, setShowCookieForm] = useState(false);
  const [extInstalled, setExtInstalled] = useState(false);
  const [showExtensionSetup, setShowExtensionSetup] = useState(false);
  const [waitingForExtLogin, setWaitingForExtLogin] = useState(false);
  const [liAt, setLiAt] = useState("");
  const [jsessionId, setJsessionId] = useState("");
  const [navigateTarget, setNavigateTarget] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState("https://www.linkedin.com/feed/");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const sendLock = useRef(false);
  const sendAttempt = useRef<{ threadId: string; text: string; requestId: string } | null>(null);
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const pasteInputRef = useRef<HTMLInputElement>(null);

  const own = !owner || owner === overview?.currentUser;
  const viewedConnection = own ? connection : overview?.connections.find(item => item.owner === owner);
  const params = owner ? { owner } : {};

  const handleFrameMeta = useCallback((meta: LiveLinkedInFrameMeta) => {
    if (meta.url && /^https:\/\/([a-z0-9-]+\.)?linkedin\.com(\/|$)/i.test(meta.url)) {
      setLiveUrl(meta.url);
    }
  }, []);

  const refreshConnection = useCallback(async (signal?: AbortSignal) => {
    const [summary, current] = await Promise.all([
      api.get<Overview>("/linkedin/connections", { signal }),
      api.get<Connection>("/linkedin/connection", { signal }),
    ]);
    if (signal?.aborted) return;
    setOverview(summary.data);
    setConnection(current.data);
    setConnectionError("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        await refreshConnection(controller.signal);
      } catch (err) {
        if (active && !axios.isCancel(err)) setConnectionError(errorMessage(err));
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void run();
    const intervalMs = connection.status === "login_browser" ? 5000 : 15000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, intervalMs);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [refreshConnection, userId, refreshCount, connection.status]);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<Chat[]>("/linkedin/chats", {
          params: owner ? { owner } : {},
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setChats(result.data);
          setChatsLoaded(true);
          setChatError("");
        }
      } catch (err) {
        if (!controller.signal.aborted && !axios.isCancel(err)) setChatError(errorMessage(err));
      } finally {
        pending = false;
      }
    };
    void run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 12000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [owner, userId, refreshCount]);

  useEffect(() => {
    if (tab !== "contacts") return;
    const controller = new AbortController();
    setContactsLoaded(false);
    const run = async () => {
      try {
        const result = await api.get<Contact[]>("/linkedin/contacts", {
          params: owner ? { owner } : {},
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setContacts(result.data);
          setContactsLoaded(true);
        }
      } catch {
        if (!controller.signal.aborted) setContactsLoaded(true);
      }
    };
    void run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [tab, owner, refreshCount]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let pending = false;
    let initial = true;
    const run = async () => {
      if (pending) return;
      pending = true;
      if (initial) setMessagesLoading(true);
      try {
        const result = await api.get<Message[]>("/linkedin/messages", {
          params: { ...(owner ? { owner } : {}), threadId: selected.threadId },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setMessages(result.data);
          setMessageError("");
        }
      } catch (err) {
        if (!controller.signal.aborted && !axios.isCancel(err)) setMessageError(errorMessage(err));
      } finally {
        pending = false;
        if (initial && !controller.signal.aborted) {
          setMessagesLoading(false);
          initial = false;
        }
      }
    };
    void run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 8000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [selected, owner, refreshCount]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  useEffect(() => {
    const checkExt = () => {
      if (document.documentElement.getAttribute("data-xonier-linkedin-ext") === "1") {
        setExtInstalled(true);
        setShowExtensionSetup(false);
        return true;
      }
      return false;
    };
    checkExt();
    window.postMessage({ type: "XONIER_PING_EXT" }, "*");

    const onReady = () => {
      setExtInstalled(true);
      setShowExtensionSetup(false);
    };
    const onMessage = async (event: MessageEvent) => {
      if (event.source !== window || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "XONIER_EXT_PONG" && event.data.installed) {
        setExtInstalled(true);
        setShowExtensionSetup(false);
        return;
      }
      if (event.data.type === "XONIER_LINKEDIN_SESSION_RESPONSE") {
        const payload = event.data as {
          ok?: boolean;
          waitingForLogin?: boolean;
          liAt?: string;
          jsessionId?: string;
          cookies?: unknown[];
          error?: string;
        };
        if (payload.waitingForLogin) {
          setWaitingForExtLogin(true);
          setBusy(false);
          return;
        }
        if (payload.ok && payload.liAt) {
          setWaitingForExtLogin(false);
          setBusy(true);
          setError("");
          try {
            await api.post("/linkedin/connect", {
              consent: true,
              mode: "cookie",
              liAt: payload.liAt,
              jsessionId: payload.jsessionId || undefined,
              cookies: Array.isArray(payload.cookies) ? payload.cookies : undefined,
            });
            await refreshConnection();
            setRefreshCount(c => c + 1);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
          return;
        }
        setWaitingForExtLogin(false);
        setBusy(false);
        if (payload.error) setError(payload.error);
      }
    };

    window.addEventListener("xonier-linkedin-ext-ready", onReady);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("xonier-linkedin-ext-ready", onReady);
      window.removeEventListener("message", onMessage);
    };
  }, [refreshConnection]);

  const submitParsedCookieSession = async (rawInput: string) => {
    const parsed = parseLinkedInClipboard(rawInput);
    if (!parsed?.liAt) {
      setShowCookieForm(true);
      setTimeout(() => pasteInputRef.current?.focus(), 50);
      setError(
        "No exported LinkedIn cookies found in clipboard. On linkedin.com, open Cookie-Editor → click Export, then click Paste & Connect (or press Ctrl+V / Cmd+V in the box).",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/linkedin/connect", {
        consent: true,
        mode: "cookie",
        liAt: parsed.liAt,
        jsessionId: parsed.jsessionId || jsessionId.trim() || undefined,
        cookies: parsed.cookies,
      });
      setLiAt("");
      setJsessionId("");
      setShowCookieForm(false);
      await refreshConnection();
      setRefreshCount(c => c + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const connectWithClipboardOrExtension = async () => {
    const installed = extInstalled || document.documentElement.getAttribute("data-xonier-linkedin-ext") === "1";
    if (installed) {
      setExtInstalled(true);
      setShowExtensionSetup(false);
      setBusy(true);
      setError("");
      window.postMessage({ type: "XONIER_REQUEST_LINKEDIN_SESSION", openTabIfMissing: true }, "*");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && parseLinkedInClipboard(clipText)) {
          await submitParsedCookieSession(clipText);
          return;
        }
      } catch {
        // Browser blocked direct clipboard read (e.g. non-HTTPS origin); open and focus paste box.
      }
    }
    setShowCookieForm(true);
    setTimeout(() => pasteInputRef.current?.focus(), 50);
  };

  const connectWithBrowser = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/linkedin/connect", { consent: true, mode: "browser" });
      await refreshConnection();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const connectWithCookie = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent || !liAt.trim()) return;
    await submitParsedCookieSession(liAt);
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect this LinkedIn account and delete its synced chats and connections from Xonier CRM?")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.delete("/linkedin/connection", { params });
      setChats([]);
      setContacts([]);
      setSelected(null);
      setMessages([]);
      setText("");
      setTab("chats");
      generation.current += 1;
      await refreshConnection();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!own || connection.status !== "connected") return;
    setSyncing(true);
    setError("");
    setSyncNotice("");
    try {
      const res = await api.post<{
        synced?: boolean;
        chatsCount?: number;
        messagesCount?: number;
        contactsCount?: number;
      }>("/linkedin/sync");
      const chatsCount = res.data?.chatsCount ?? 0;
      const messagesCount = res.data?.messagesCount ?? 0;
      const contactsCount = res.data?.contactsCount ?? 0;
      setSyncNotice(
        chatsCount === 0
          ? `Synced 0 conversations and ${contactsCount} connections. Open Live LinkedIn → Messaging to capture your inbox directly.`
          : `Synced ${chatsCount} conversations, ${messagesCount} messages, and ${contactsCount} connections.`,
      );
      setRefreshCount(c => c + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const send = async () => {
    if (!selected || !text.trim() || sendLock.current || !own) return;
    sendLock.current = true;
    setSending(true);
    setError("");
    setSyncNotice("");
    const version = generation.current;
    const threadId = selected.threadId;
    const value = text.trim();
    if (sendAttempt.current?.threadId !== threadId || sendAttempt.current.text !== value) {
      sendAttempt.current = { threadId, text: value, requestId: crypto.randomUUID() };
    }
    try {
      await api.post("/linkedin/messages", sendAttempt.current);
      sendAttempt.current = null;
      if (generation.current !== version) return;
      setText("");
      const result = await api.get<Message[]>("/linkedin/messages", { params: { threadId } });
      if (generation.current === version) setMessages(result.data);
    } catch (err) {
      if (generation.current === version) setError(errorMessage(err));
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const openInLiveBrowser = (url?: string | null) => {
    if (!own || connection.status !== "connected") return;
    setNavigateTarget(url || "https://www.linkedin.com/feed/");
    setTab("browser");
  };

  const visibleError =
    error ||
    connectionError ||
    (chatError && `Could not load chats. ${chatError}`) ||
    (selected && messageError && `Could not load messages. ${messageError}`);

  const canSend = own && connection.status === "connected" && Boolean(selected);

  return (
    <div className="-m-2 space-y-4 text-slate-800 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FaLinkedin size={32} className="text-[#0A66C2]" />
          <div>
            <h1 className="text-2xl font-bold">LinkedIn</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in and run your LinkedIn inbox, connections, and feed right inside Xonier CRM.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {own && connection.status === "connected" && (
            <>
              <button
                type="button"
                onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}
                title="Open current LinkedIn page in a new browser tab"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ExternalLink size={15} />
                Open in New Tab
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void syncNow()}
                className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              >
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync LinkedIn"}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setError("");
              setSyncNotice("");
              setRefreshCount(count => count + 1);
            }}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-600"
            aria-label="Refresh LinkedIn"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {syncNotice && !visibleError && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
        >
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice("")}
            className="text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {visibleError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {visibleError}
        </div>
      )}

      {overview?.admin && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <label htmlFor="linkedin-owner" className="text-sm font-semibold">
            Company connections
          </label>
          <select
            id="linkedin-owner"
            value={owner}
            onChange={event => {
              generation.current += 1;
              setOwner(event.target.value);
              setChats([]);
              setContacts([]);
              setChatsLoaded(false);
              setChatError("");
              setMessageError("");
              setSelected(null);
              setMessages([]);
              setText("");
              if (event.target.value && tab === "browser") setTab("chats");
            }}
            className="max-w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
          >
            <option value="">My LinkedIn</option>
            {overview.connections
              .filter(item => item.owner !== overview.currentUser)
              .map(item => (
                <option key={item.owner} value={item.owner}>
                  {item.ownerName || `Agent …${item.owner?.slice(-6)}`}
                  {item.profileName ? ` (${item.profileName})` : ""} · {statusLabel[item.status] || item.status}
                </option>
              ))}
          </select>
          <p className="text-xs text-slate-500">
            You can view connected agents’ synced chats & connections. Replies use your own LinkedIn.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              {own ? "My LinkedIn" : "Agent LinkedIn"}
              {viewedConnection?.profileName ? ` · ${viewedConnection.profileName}` : ""}
              {viewedConnection?.handle ? ` (@${viewedConnection.handle})` : ""}
            </h2>
            {viewedConnection?.headline && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{viewedConnection.headline}</p>
            )}
            <p className="mt-1 text-sm text-sky-700 dark:text-sky-300">
              {loading ? "Checking connection…" : statusLabel[viewedConnection?.status || "disconnected"] || viewedConnection?.status}
            </p>
          </div>
          {(viewedConnection?.owner || connection.status === "login_browser") && (
            <button
              disabled={busy}
              onClick={() => void disconnect()}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
            >
              <Unplug size={16} />
              Disconnect
            </button>
          )}
        </div>

        {own && connection.status !== "connected" && (
          <div className="mt-5 space-y-5">
            {connection.status === "login_browser" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                  <span>
                    Sign in to your LinkedIn account directly below. Once login completes, your inbox & connections will sync automatically.
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshConnection()}
                    className="font-semibold underline"
                  >
                    Check status
                  </button>
                </div>
                <LiveLinkedInBrowser
                  active={true}
                  isLoginMode={true}
                  navigateTarget={null}
                  onNavigateConsumed={() => {}}
                  onConnected={() => {
                    void refreshConnection();
                    setRefreshCount(c => c + 1);
                  }}
                  onSynced={() => setRefreshCount(c => c + 1)}
                  streamTicket={connection.streamTicket}
                  bridgeUrl={connection.bridgeUrl}
                />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4 text-sm">
                  <h3 className="text-lg font-semibold">Connect your LinkedIn in 2 Clicks (No Password or Inspect Needed)</h3>
                  <ol className="list-decimal space-y-2 pl-5 text-slate-600 dark:text-slate-300">
                    <li>
                      Install{" "}
                      <a
                        href={COOKIE_EDITOR_WEBSTORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#0A66C2] underline"
                      >
                        Cookie-Editor from Chrome Web Store <ExternalLink size={12} />
                      </a>{" "}
                      (official 1-click Chrome extension).
                    </li>
                    <li>
                      On your logged-in{" "}
                      <a
                        href="https://www.linkedin.com/feed/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#0A66C2] underline"
                      >
                        linkedin.com
                      </a>{" "}
                      tab, click the <strong>Cookie-Editor</strong> icon and click <strong>Export</strong> (bottom-right copy button).
                    </li>
                    <li>
                      Tick the consent checkbox below and click <strong>1-Click Paste &amp; Connect</strong>.
                    </li>
                  </ol>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={event => setConsent(event.target.checked)}
                      className="mt-1"
                    />
                    <span>I agree to sync my LinkedIn conversations and connections into Xonier CRM.</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!consent || busy || loading}
                      onClick={() => void connectWithClipboardOrExtension()}
                      className="flex items-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 font-semibold text-white hover:bg-[#004182] disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : extInstalled ? <Zap size={16} /> : <ClipboardPaste size={16} />}
                      {busy
                        ? "Connecting LinkedIn…"
                        : extInstalled
                          ? "1-Click Auto-Connect from Chrome"
                          : "1-Click Paste & Connect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCookieForm(prev => !prev);
                        setTimeout(() => pasteInputRef.current?.focus(), 50);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <KeyRound size={14} />
                      {showCookieForm ? "Hide Paste Box" : "Open Paste Box"}
                    </button>
                    <button
                      disabled={!consent || busy || loading}
                      onClick={() => void connectWithBrowser()}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Globe size={14} />
                      Sign in with Live Browser
                    </button>
                  </div>

                  {extInstalled && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={14} /> Xonier LinkedIn Connector extension detected — ready for 1-click connect.
                    </p>
                  )}

                  {waitingForExtLogin && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                      LinkedIn opened in a new Chrome tab — sign in there once, and Xonier CRM will connect automatically as soon as you log in.
                    </div>
                  )}

                  {connection.error && <p className="text-red-600">{connection.error}</p>}
                </div>

                {showCookieForm && (
                  <form
                    onSubmit={e => void connectWithCookie(e)}
                    className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <h4 className="font-semibold">Quick Paste Box (Cookie-Editor Export or li_at)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>) below after clicking <strong>Export</strong> in{" "}
                      <a
                        href={COOKIE_EDITOR_WEBSTORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#0A66C2] underline"
                      >
                        Cookie-Editor
                      </a>
                      . It connects automatically on paste!
                    </p>
                    <input
                      ref={pasteInputRef}
                      type="text"
                      value={liAt}
                      onChange={e => setLiAt(e.target.value)}
                      onPaste={e => {
                        const pasted = e.clipboardData?.getData("text");
                        if (pasted && consent && parseLinkedInClipboard(pasted)) {
                          e.preventDefault();
                          setLiAt(pasted);
                          void submitParsedCookieSession(pasted);
                        }
                      }}
                      placeholder="Click here and press Ctrl+V / Cmd+V to auto-connect..."
                      required
                      className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0A66C2] dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={!consent || busy || !liAt.trim()}
                      className="w-full rounded-lg bg-[#0A66C2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#004182] disabled:opacity-50"
                    >
                      {busy ? "Connecting LinkedIn…" : "Connect LinkedIn"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setTab("chats");
                setRefreshCount(c => c + 1);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                tab === "chats" ? "bg-white text-[#0A66C2] shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-500"
              }`}
            >
              <MessageSquare size={15} /> Chats
            </button>
            <button
              type="button"
              onClick={() => setTab("contacts")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                tab === "contacts" ? "bg-white text-[#0A66C2] shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-500"
              }`}
            >
              <Users size={15} /> Connections
            </button>
            {own && connection.status === "connected" && (
              <button
                type="button"
                onClick={() => setTab("browser")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                  tab === "browser" ? "bg-white text-[#0A66C2] shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-500"
                }`}
              >
                <Globe size={15} /> Live LinkedIn
              </button>
            )}
          </div>
          {viewedConnection?.lastSyncedAt && (
            <span className="text-xs text-slate-400">
              Last synced: {new Date(viewedConnection.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {tab === "browser" && own && connection.status === "connected" ? (
          <div className="p-4">
            <LiveLinkedInBrowser
              active={tab === "browser"}
              navigateTarget={navigateTarget}
              onNavigateConsumed={() => setNavigateTarget(null)}
              onConnected={() => void refreshConnection()}
              onSynced={() => setRefreshCount(c => c + 1)}
              onFrameMeta={handleFrameMeta}
              streamTicket={connection.streamTicket}
              bridgeUrl={connection.bridgeUrl}
            />
          </div>
        ) : tab === "contacts" ? (
          <div className="flex h-[580px] flex-col">
            <div className="border-b border-slate-200 p-3 dark:border-slate-700">
              <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                <Search size={16} />
                <input
                  placeholder="Search connections by name, headline, or handle"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {(() => {
                const q = query.trim().toLowerCase();
                const list = contacts.filter(
                  c => !q || `${c.name} ${c.headline ?? ""} ${c.handle ?? ""}`.toLowerCase().includes(q),
                );
                if (!list.length) {
                  return (
                    <p className="p-8 text-center text-sm text-slate-500">
                      {!contactsLoaded
                        ? "Loading connections…"
                        : viewedConnection?.status === "connected"
                          ? "No matching connections yet. Click Sync LinkedIn above to fetch your network."
                          : "Connect LinkedIn to view synced connections."}
                    </p>
                  );
                }
                return list.map(c => {
                  const matchedChat = chats.find(ch => ch.handle && c.handle && ch.handle === c.handle);
                  return (
                    <div key={c.contactId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        {c.headline && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.headline}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {matchedChat && (
                          <button
                            type="button"
                            onClick={() => {
                              generation.current += 1;
                              setSelected(matchedChat);
                              setMessages([]);
                              setTab("chats");
                            }}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                          >
                            Open Chat
                          </button>
                        )}
                        {own && connection.status === "connected" && c.profileUrl && (
                          <button
                            type="button"
                            onClick={() => openInLiveBrowser(c.profileUrl)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                          >
                            <ExternalLink size={12} /> Open in Live Browser
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="grid h-[580px] md:grid-cols-[310px_1fr]">
            <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-200 dark:border-slate-700`}>
              <label className="m-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                <Search size={16} />
                <input
                  aria-label="Search chats"
                  placeholder="Search conversations"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const q = query.trim().toLowerCase();
                  const filtered = chats.filter(
                    chat => !q || `${chat.name} ${chat.headline ?? ""} ${chat.preview ?? ""}`.toLowerCase().includes(q),
                  );
                  if (!filtered.length) {
                    return (
                      <p className="p-5 text-center text-sm text-slate-500">
                        {chatError
                          ? "Chats could not load. Refresh to retry."
                          : !chatsLoaded
                            ? "Loading chats…"
                            : viewedConnection?.status === "connected"
                              ? "No conversations synced yet. Click Sync LinkedIn or open Messaging in Live LinkedIn."
                              : "Connect LinkedIn to see synced conversations."}
                      </p>
                    );
                  }
                  return filtered.map(chat => (
                    <button
                      key={chat.threadId}
                      onClick={() => {
                        generation.current += 1;
                        setSelected(chat);
                        setMessageError("");
                        setMessages([]);
                        setText("");
                      }}
                      className={`block w-full border-b border-slate-100 p-4 text-left dark:border-slate-700 ${
                        selected?.threadId === chat.threadId
                          ? "bg-sky-50 dark:bg-sky-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="truncate font-medium">{chat.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatTime(chat.timestamp)}</span>
                      </div>
                      {chat.headline && (
                        <p className="truncate text-[11px] text-slate-400">{chat.headline}</p>
                      )}
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {chat.preview || "Open conversation"}
                      </p>
                    </button>
                  ));
                })()}
              </div>
            </aside>

            <div className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
              {selected ? (
                <>
                  <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
                    <button
                      onClick={() => {
                        generation.current += 1;
                        setSelected(null);
                      }}
                      className="text-sm text-[#0A66C2] md:hidden"
                    >
                      Back
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{selected.name}</h3>
                      {selected.headline && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{selected.headline}</p>
                      )}
                    </div>
                    {own && connection.status === "connected" && (
                      <button
                        type="button"
                        onClick={() => openInLiveBrowser(`https://www.linkedin.com/messaging/thread/${selected.threadId}/`)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                      >
                        <Globe size={13} /> Open in Live Browser
                      </button>
                    )}
                    {!own && <span className="ml-auto text-xs text-slate-500">Admin view</span>}
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/40">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" /> Loading messages…
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="py-16 text-center text-sm text-slate-500">
                        No messages synced for this conversation yet.
                      </p>
                    ) : (
                      messages.map(message => (
                        <div key={message.messageId} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-xl px-4 py-2 ${
                              message.fromMe
                                ? "bg-sky-100 text-slate-900 dark:bg-sky-900 dark:text-slate-100"
                                : "border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                            <p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-400">
                              {formatTime(message.timestamp)}
                              {message.fromMe ? " · Sent" : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={bottom} />
                  </div>

                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      void send();
                    }}
                    className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
                  >
                    <input
                      aria-label="LinkedIn message"
                      maxLength={4096}
                      disabled={!canSend || sending}
                      value={text}
                      onChange={event => setText(event.target.value)}
                      placeholder={
                        !own
                          ? "Admin view: replies are sent by the account owner"
                          : connection.status !== "connected"
                            ? "Reconnect LinkedIn to reply"
                            : "Write a LinkedIn message"
                      }
                      className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-3 text-sm outline-none disabled:opacity-60 dark:bg-slate-900"
                    />
                    <button
                      aria-label="Send message"
                      disabled={!canSend || !text.trim() || sending}
                      className="rounded-lg bg-[#0A66C2] p-3 text-white hover:bg-[#004182] disabled:opacity-40"
                    >
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="m-auto p-8 text-center text-slate-500">
                  <FaLinkedin size={48} className="mx-auto mb-4 text-[#0A66C2]" />
                  <p>Select a LinkedIn conversation to read or reply.</p>
                  <p className="mt-2 text-xs">
                    You can also open the <strong>Live LinkedIn</strong> tab to browse your feed, send connection requests, or post updates right from Xonier CRM.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        LinkedIn integration uses a private browser session inside Xonier CRM. Avoid high-volume automated messaging to keep your LinkedIn account in good standing.
      </p>
    </div>
  );
}
