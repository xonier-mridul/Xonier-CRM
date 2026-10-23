"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import type { ChatMessage } from "@/src/types/chat";

const emojis = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
const opened = "trakeroo:reaction-picker-open";

export default function ReactionPicker({ message, uid, anchor, close, select }: {
  message: ChatMessage; uid: string; anchor: HTMLElement; close: () => void; select: (emoji: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  useLayoutEffect(() => { closeRef.current = close; }, [close]);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    const owner = Symbol();
    // One picker across both the main timeline and the thread pane.
    document.dispatchEvent(new CustomEvent(opened, { detail: owner }));
    const another = (event: Event) => { if ((event as CustomEvent).detail !== owner) closeRef.current(); };
    const place = () => {
      if (!anchor.isConnected || !box.current) { closeRef.current(); return; }
      const rect = anchor.getBoundingClientRect(), popup = box.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { closeRef.current(); return; }
      setPosition({ left: Math.max(8, Math.min(rect.right - popup.width, window.innerWidth - popup.width - 8)),
        top: Math.max(8, Math.min(rect.bottom + 8 + popup.height <= window.innerHeight - 8 ? rect.bottom + 8 : rect.top - popup.height - 8, window.innerHeight - popup.height - 8)) });
    };
    const outside = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) closeRef.current();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); anchor.focus(); }
      const buttons = [...(box.current?.querySelectorAll<HTMLButtonElement>("button") || [])];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;
      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
      if (event.key === "Tab") closeRef.current();
    };
    place();
    (box.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') || box.current?.querySelector("button"))?.focus();
    document.addEventListener(opened, another);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard, true);
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener(opened, another); document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard, true); window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [anchor]);
  return createPortal(<div ref={box} role="toolbar" aria-label="Message reactions" style={position}
    className="fixed z-[180] flex max-w-[calc(100vw-16px)] gap-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:text-white">
    {emojis.map(emoji => {
      const selected = message.reactions[emoji]?.includes(uid) || false;
      return <button key={emoji} type="button" aria-label={"React " + emoji} aria-pressed={selected}
        title={selected ? "Remove your reaction" : "Add your reaction"} onClick={() => { close(); anchor.focus(); select(emoji); }}
        className={"relative rounded-lg border p-1.5 text-lg focus-visible:outline-2 focus-visible:outline-cyan-600 " + (selected ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950" : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-700")}>
        {emoji}{selected && <Check aria-hidden="true" size={10} className="absolute -right-0.5 -top-0.5 rounded-full bg-cyan-700 text-white" />}
      </button>;
    })}
  </div>, document.body);
}
