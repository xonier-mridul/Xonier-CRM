"use client";
import { useState } from "react";
import { LiveKitRoom, GridLayout, ParticipantTile, ControlBar, RoomAudioRenderer, ConnectionStateToast, useTracks, useConnectionState, useParticipants } from "@livekit/components-react";
import { DisconnectReason, Track } from "livekit-client";
import "@livekit/components-styles";
import { Minimize2, Maximize2, PhoneOff, LogOut } from "lucide-react";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { JoinCall, CallPreferences } from "@/src/types/chat";
function ConnectionBadge() {
  const state = useConnectionState();
  const participants = useParticipants();
  return <span role="status" className="text-[11px] capitalize text-slate-400">{state} · {participants.length} {participants.length === 1 ? "participant" : "participants"}</span>;
}
function CallMedia({ video }: { video: boolean }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  return <div className="flex h-full min-h-0 flex-col"><div className="min-h-0 flex-1"><GridLayout tracks={tracks}><ParticipantTile /></GridLayout></div>
    <ControlBar controls={{ microphone: true, camera: video, screenShare: video, chat: false, leave: false }} />
    <RoomAudioRenderer /><ConnectionStateToast />
  </div>;
}
export default function CallRoom({ session, onLeave, canEnd }: { session: JoinCall & { preferences: CallPreferences }; onLeave: () => void; canEnd: boolean }) {
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const preferences = session.preferences;
  const end = async () => {
    const result = await ConfirmPopup({ title: "End this call for everyone?", text: "All participants will be disconnected. To leave without ending the call, use Leave instead.", btnTxt: "End call" });
    if (!result.isConfirmed) return;
    setEnding(true);
    try { await chatApi.endCall(session.call.conversationId, session.call.id); onLeave(); }
    catch (cause) { setError(chatError(cause)); setEnding(false); }
  };
  return <section aria-label="Active call" className={"fixed z-[160] overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 text-white shadow-2xl " + (minimized ? "bottom-4 right-4 h-80 w-[min(460px,95vw)]" : "inset-3 md:inset-8")}>
    <LiveKitRoom data-lk-theme="default" token={session.token} serverUrl={session.serverUrl} connect
      audio={preferences.audioEnabled ? { deviceId: preferences.audioDeviceId } : false}
      video={preferences.videoEnabled ? { deviceId: preferences.videoDeviceId } : false}
      // The legacy dual-PC path avoids WebKit rejecting configuration updates
      // during offer-with-join. Keep server-provided ICE/TURN configuration intact.
      options={{ adaptiveStream: true, dynacast: true, singlePeerConnection: false }}
      onConnected={() => { void chatApi.callConnected(session.call.conversationId, session.call.id).catch(() => {}); }}
      onDisconnected={reason => {
        if (reason === DisconnectReason.CLIENT_INITIATED) onLeave();
        else setError(reason === DisconnectReason.DUPLICATE_IDENTITY ? "This account joined the same call elsewhere. Leave this screen to continue there, or rejoin here." : "The call disconnected. Leave and rejoin; if it repeats, check media-server and network connectivity.");
      }} onError={cause => setError(cause.message || "The media connection failed. Check your network or leave and retry.")}
      onMediaDeviceFailure={() => setError("Microphone/camera access failed. Check site permissions; you can still participate with devices muted.")}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-700 px-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">Communication · {session.call.kind === "video" ? "Video call" : "Voice call"}</p><ConnectionBadge /></div><div className="flex shrink-0 items-center gap-2">
        {canEnd && <button aria-label="End call for everyone" title="End call for everyone" disabled={ending} onClick={() => void end()} className="rounded-lg border border-red-800 p-2 text-xs text-red-300 disabled:opacity-40"><span className="hidden sm:inline">{ending ? "Ending…" : "End for everyone"}</span><PhoneOff size={14} className="sm:hidden" /></button>}
        <button aria-label="Leave call" title="Leave this call" onClick={onLeave} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white"><LogOut size={14} />Leave</button><button aria-label={minimized ? "Expand call" : "Minimize call"} onClick={() => setMinimized(!minimized)} className="rounded-lg p-2 hover:bg-slate-800">{minimized ? <Maximize2 size={17} /> : <Minimize2 size={17} />}</button>
      </div></header>
      {error && <div role="alert" className="flex shrink-0 items-start gap-2 bg-red-950 px-4 py-3 text-xs leading-relaxed text-red-200"><PhoneOff size={15} className="shrink-0" />{error}</div>}
      <div className="min-h-0 flex-1"><CallMedia video={session.call.kind === "video"} /></div>
    </LiveKitRoom>
  </section>;
}
