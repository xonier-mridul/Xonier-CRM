"use client";

import { useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { Minimize2, Maximize2, PhoneOff } from "lucide-react";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { JoinCall } from "@/src/types/chat";

export default function CallRoom({ session, onLeave, canEnd }: { session: JoinCall; onLeave: () => void; canEnd: boolean }) {
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const end = async () => {
    setEnding(true);
    try { await chatApi.endCall(session.call.conversationId, session.call.id); onLeave(); }
    catch (err) { setError(chatError(err)); setEnding(false); }
  };
  return <section aria-label="Active call" className={`fixed z-[160] overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 text-white shadow-2xl ${minimized ? "bottom-4 right-4 h-72 w-[min(420px,95vw)]" : "inset-4 md:inset-10"}`}>
    <div className="flex h-14 items-center justify-between border-b border-slate-700 px-4"><span className="text-sm font-semibold">Trakeroo · {session.call.kind === "video" ? "Video call" : "Voice call"}</span><div className="flex items-center gap-3">
      {canEnd && <button disabled={ending} onClick={() => void end()} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs disabled:opacity-50"><PhoneOff size={14} />{ending ? "Ending…" : "End for everyone"}</button>}
      <button aria-label={minimized ? "Expand call" : "Minimize call"} onClick={() => setMinimized(!minimized)}>{minimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}</button>
    </div></div>
    {error && <p role="alert" className="bg-red-950 px-4 py-2 text-sm">{error}</p>}
    <LiveKitRoom data-lk-theme="default" token={session.token} serverUrl={session.serverUrl} connect audio video={session.call.kind === "video"}
      onDisconnected={onLeave} onError={err => setError(err.message)} onMediaDeviceFailure={() => setError("Microphone/camera access failed. Check your browser permissions and device settings.")}
      style={{ height: "calc(100% - 56px)" }}>
      <VideoConference />
    </LiveKitRoom>
  </section>;
}
