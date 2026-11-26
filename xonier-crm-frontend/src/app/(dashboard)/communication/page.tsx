import type { Metadata } from "next";
import { Suspense } from "react";
import ChatWorkspace from "@/src/components/chat/ChatWorkspace";
import ContentShimmer from "@/src/components/common/ContentShimmer";

export const metadata: Metadata = { title: "Communication | Trakeroo" };
export default function ChatPage() { return <Suspense fallback={<ContentShimmer rows={5} className="mx-auto max-w-4xl" />}><ChatWorkspace /></Suspense>; }
