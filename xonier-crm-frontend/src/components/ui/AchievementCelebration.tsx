"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, LockKeyhole, Trophy } from "lucide-react";

export interface AchievementStat {
  label: string;
  value: string | number;
  icon?: "completed" | "hours";
}

export interface AchievementCelebrationProps {
  open: boolean;
  onClose: () => void;
  badge?: string;
  title?: string;
  subtitle?: string;
  stats?: AchievementStat[];
  durationMs?: number;
}

const PARTICLES = [
  { angle: -85, distance: 74, size: 6, color: "#10b981", pill: false, delay: 0.05 },
  { angle: -62, distance: 88, size: 5, color: "#6366f1", pill: true, delay: 0.08 },
  { angle: -38, distance: 78, size: 6, color: "#f59e0b", pill: false, delay: 0.04 },
  { angle: -18, distance: 92, size: 5, color: "#01728e", pill: true, delay: 0.1 },
  { angle: 12, distance: 80, size: 6, color: "#10b981", pill: false, delay: 0.06 },
  { angle: 34, distance: 90, size: 5, color: "#8b5cf6", pill: true, delay: 0.09 },
  { angle: 58, distance: 74, size: 6, color: "#f59e0b", pill: false, delay: 0.05 },
  { angle: 82, distance: 86, size: 5, color: "#14b8a6", pill: true, delay: 0.07 },
  { angle: 112, distance: 76, size: 6, color: "#6366f1", pill: false, delay: 0.06 },
  { angle: 138, distance: 88, size: 5, color: "#10b981", pill: true, delay: 0.1 },
  { angle: 162, distance: 74, size: 6, color: "#f59e0b", pill: false, delay: 0.05 },
  { angle: -165, distance: 86, size: 5, color: "#01728e", pill: true, delay: 0.08 },
  { angle: -140, distance: 78, size: 6, color: "#10b981", pill: false, delay: 0.04 },
  { angle: -115, distance: 90, size: 5, color: "#8b5cf6", pill: true, delay: 0.09 },
];

export default function AchievementCelebration({
  open,
  onClose,
  badge = "Day Wrapped · Report Locked",
  title = "Evening Report Submitted!",
  subtitle = "Great work today. Your progress has been finalized and recorded.",
  stats = [],
  durationMs = 2600,
}: AchievementCelebrationProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, durationMs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, durationMs, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="achievement-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/25 dark:bg-slate-950/50 backdrop-blur-[2px] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[390px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-6 pt-8 pb-7 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22),0_4px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_28px_72px_-16px_rgba(0,0,0,0.85)] dark:ring-white/[0.06]"
          >
            {/* Subtle ambient glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-2xl dark:bg-emerald-500/15"
            />

            {/* Badge + radiating particles */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              {/* Expanding pulse rings */}
              <motion.span
                aria-hidden="true"
                initial={{ scale: 0.65, opacity: 0.6 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{ duration: 0.95, ease: "easeOut" }}
                className="absolute h-14 w-14 rounded-2xl border-2 border-emerald-400/70 dark:border-emerald-400/50"
              />
              <motion.span
                aria-hidden="true"
                initial={{ scale: 0.65, opacity: 0.45 }}
                animate={{ scale: 2.05, opacity: 0 }}
                transition={{ duration: 1.15, delay: 0.12, ease: "easeOut" }}
                className="absolute h-14 w-14 rounded-2xl border border-teal-400/50"
              />

              {/* Micro-confetti burst */}
              {PARTICLES.map((p, idx) => {
                const rad = (p.angle * Math.PI) / 180;
                const tx = Math.cos(rad) * p.distance;
                const ty = Math.sin(rad) * p.distance;
                return (
                  <motion.span
                    key={idx}
                    aria-hidden="true"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                    animate={{
                      x: tx,
                      y: ty,
                      scale: [0, 1.15, 0.75],
                      opacity: [0, 1, 0],
                      rotate: p.pill ? p.angle + 45 : 0,
                    }}
                    transition={{
                      duration: 0.95,
                      delay: p.delay,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      width: p.pill ? p.size * 1.9 : p.size,
                      height: p.size,
                      backgroundColor: p.color,
                    }}
                    className="pointer-events-none absolute rounded-full"
                  />
                );
              })}

              {/* Center achievement emblem */}
              <motion.div
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.04 }}
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_12px_28px_-6px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/15"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M5.5 12.5L10 17L18.5 7.5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.18 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <Trophy className="h-3 w-3" strokeWidth={2.2} />
              <span>{badge}</span>
            </motion.div>

            {/* Title & subtitle */}
            <motion.h3
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.24 }}
              className="mt-2.5 text-[17px] font-semibold tracking-[-0.015em] text-slate-900 dark:text-slate-50"
            >
              {title}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3 }}
              className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {subtitle}
            </motion.p>

            {/* Optional stat chips */}
            {stats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.36 }}
                className="mt-4 flex flex-wrap items-center justify-center gap-2"
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 text-[12px] text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
                  >
                    {stat.icon === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : stat.icon === "hours" ? (
                      <Clock3 className="h-3.5 w-3.5 text-indigo-500" />
                    ) : (
                      <LockKeyhole className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className="font-semibold">{stat.value}</span>
                    <span className="text-slate-400 dark:text-slate-400">{stat.label}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Auto-dismiss progress hairline */}
            <motion.div
              aria-hidden="true"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: durationMs / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
