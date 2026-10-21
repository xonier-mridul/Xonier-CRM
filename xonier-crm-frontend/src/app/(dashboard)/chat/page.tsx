import type { Metadata } from "next";
import { Suspense } from "react";
import ChatWorkspace from "@/src/components/chat/ChatWorkspace";

export const metadata: Metadata = { title: "chat | Trakeroo" };
export default function ChatPage() { return <Suspense fallback={<p>Loading team chat…</p>}><ChatWorkspace /></Suspense>; }
