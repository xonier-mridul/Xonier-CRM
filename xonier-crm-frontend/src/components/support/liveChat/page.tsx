"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FiSend } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "@/src/types/support/support.type";

function createMessage(sender: ChatMessage["sender"], text: string): ChatMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function LiveChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("agent", t("support.chat.welcomeMessage")),
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, createMessage("user", trimmed)]);
    setInput("");
    setIsTyping(true);

    // TODO: replace with real-time integration (WebSocket / Pusher / Ably)
    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, createMessage("agent", t("support.chat.autoReply"))]);
    }, 1400);
  }

  return (
    <div className="flex h-[26rem] flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-lg font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
            {t("support.chat.agentInitial")}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("support.chat.agentName")}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("support.chat.onlineLabel")}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-3">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                message.sender === "user"
                  ? "rounded-br-sm bg-cyan-600 text-white"
                  : "rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
              }`}
            >
              <p>{message.text}</p>
              <span
                className={`mt-1 block text-[10px] ${
                  message.sender === "user" ? "text-cyan-100" : "text-slate-400"
                }`}
              >
                {message.timestamp}
              </span>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-slate-700">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${dot * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("support.chat.inputPlaceholder") ?? ""}
          className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="submit"
          aria-label={t("support.chat.sendLabel") ?? ""}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition-colors hover:bg-cyan-700"
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
}