// components/Support/Support.tsx  ← paste here, replacing your current code
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SupportPanel from "./supportPanel/page";
import { SupportView } from "@/src/types/support/support.type";
import FloatingButton from "./floatingButton/page";
// import type { SupportView } from "./types";
// import { useClickOutside } from "./hooks/useClickOutside";
// import { useEscapeKey } from "./hooks/useEscapeKey";

interface SupportProps {
  hasUnread?: boolean;
}

export default function Support({ hasUnread = false }: SupportProps) {
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<SupportView>("menu");
  const supportRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => setActiveView("menu"), 200);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        supportRef.current &&
        !supportRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <div
      ref={supportRef}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4 sm:bottom-6 sm:right-6"
    >
      <AnimatePresence>
        {open && (
          <SupportPanel
            activeView={activeView}
            onSelectView={setActiveView}
            onBack={() => setActiveView("menu")}
            onClose={close}
          />
        )}
      </AnimatePresence>

      <FloatingButton open={open} hasUnread={hasUnread} onToggle={() => setOpen((prev) => !prev)} />
    </div>
  );
}