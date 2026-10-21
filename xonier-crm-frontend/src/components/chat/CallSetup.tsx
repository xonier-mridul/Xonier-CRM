"use client";
import { useState } from "react";
import { PreJoin } from "@livekit/components-react";
import "@livekit/components-styles";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import ChatDialog from "./ChatDialog";
import { chatError } from "@/src/services/chat.service";
import type { CallPreferences } from "@/src/types/chat";

export default function CallSetup({ kind, ready, reason, joining, name, close, onJoin }: {
  kind: "voice" | "video"; ready: boolean; reason: string; joining: boolean; name: string;
  close: () => void; onJoin: (choices: CallPreferences) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const secure = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices;
  return <ChatDialog title={kind === "video" ? "Get ready for your video call" : "Get ready for your voice call"} subtitle="Check your devices before inviting or joining your teammates." close={close} busy={joining}>
    <div className="overflow-auto p-6">
      {!ready || !secure ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"><AlertCircle size={24} /><h3 className="mt-3 font-semibold">{!ready ? "Calling setup required" : "A secure connection is required"}</h3><p className="mt-2 text-sm leading-relaxed">{!ready ? reason : "Open Trakeroo over HTTPS (or localhost for development) to use your microphone and camera."}</p><p className="mt-3 text-xs leading-relaxed">A chat WebSocket carries events, not audio/video. Calls also need a reachable WebRTC media service and appropriate network access. No call has been placed.</p></div> : <div data-lk-theme="default" className="relative overflow-hidden rounded-xl bg-slate-950 p-3"><fieldset disabled={joining} className="disabled:opacity-50"><PreJoin className={kind === "voice" ? "[&_.lk-button-group.video]:hidden [&_.lk-video-container]:hidden" : ""} persistUserChoices={false} defaults={{ username: name, audioEnabled: false, videoEnabled: false }} onError={cause => setError(cause.name === "NotAllowedError" ? "Microphone/camera permission was denied. You can join muted, or enable access in your browser's site settings." : cause.message)} onValidate={choices => !!choices.username.trim()} onSubmit={choices => { void onJoin({ ...choices, videoEnabled: kind === "video" && choices.videoEnabled }).catch(cause => setError(chatError(cause))); }} joinLabel={joining ? "Connecting…" : "Join call"} /></fieldset>{joining && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/70 text-sm text-white"><Loader2 size={18} className="animate-spin" />Connecting securely…</div>}</div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{error}</p>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400"><ShieldCheck size={15} className="shrink-0" />Devices start muted. Enable your microphone or camera when ready. Only conversation members can join; devices are released when you leave.</p>
    </div>
  </ChatDialog>;
}
