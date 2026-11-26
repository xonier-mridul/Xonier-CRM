let channel: BroadcastChannel | undefined;

function engagementChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") return;
  try {
    return channel ??= new BroadcastChannel("lead-engagement-updated");
  } catch {
    // The saved lead is still available to either page on its next load.
  }
}

export function notifyLeadEngagementUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("follow-up-updated"));
  engagementChannel()?.postMessage(null);
}

export function subscribeToLeadEngagementUpdates(refresh: () => void) {
  const updates = engagementChannel();
  updates?.addEventListener("message", refresh);
  return () => updates?.removeEventListener("message", refresh);
}
