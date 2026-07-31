"use client";

import { motion } from "framer-motion";
import type { IconType } from "react-icons";

interface TimelineStepProps {
  title: string;
  description: string;
  date: string;
  icon: IconType;
  active: boolean;
  completed: boolean;
  isLast?: boolean;
  orientation?: "horizontal" | "vertical";
  index: number;
}

export default function TimelineStep({
  title,
  description,
  date,
  icon: Icon,
  active,
  completed,
  isLast = false,
  orientation = "horizontal",
  index,
}: TimelineStepProps) {
  const circleClasses = completed
    ? "bg-[#33BF8B] text-white"
    : active
    ? "bg-gradient-to-br from-[#1BA2C3] to-[#33BF8B] text-white shadow-lg shadow-[#1BA2C3]/30"
    : "bg-gray-100 text-gray-400";

  if (orientation === "vertical") {
    return (
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: active ? 1.1 : 1, opacity: 1 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white shadow ${circleClasses}`}
          >
            <Icon size={18} />
          </motion.div>
          {!isLast && (
            <div
              className={`w-0.5 flex-1 min-h-[2.5rem] mt-1 rounded-full ${
                completed ? "bg-[#33BF8B]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
        <div className="pb-8">
          <h4 className={`text-sm font-semibold ${active || completed ? "text-gray-900" : "text-gray-400"}`}>
            {title}
          </h4>
          <span className="text-xs text-gray-400">{date}</span>
          <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex w-full max-w-[9rem] flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: active ? 1.15 : 1, opacity: 1 }}
        transition={{ delay: index * 0.08, duration: 0.3 }}
        className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow mb-3 ${circleClasses}`}
      >
        <Icon size={18} />
      </motion.div>
      <h4 className={`text-sm font-semibold ${active || completed ? "text-gray-900" : "text-gray-400"}`}>
        {title}
      </h4>
      <span className="text-xs text-gray-400 mt-0.5">{date}</span>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}


