import type { Metadata } from "next";
import { Suspense } from "react";
import ChatWorkspace from "@/src/components/chat/ChatWorkspace";
export const metadata: Metadata = { title: "Communication | Trakeroo" };
export default function CommunicationPage() { return <Suspense fallback={<p className="p-6 text-sm text-slate-400">Loading Communication…</p>}><ChatWorkspace /></Suspense>; }
