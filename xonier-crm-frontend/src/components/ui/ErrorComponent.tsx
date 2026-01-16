"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorProps {
  error?: string | string[];
}

const ErrorComponent: React.FC<ErrorProps> = ({ error }) => {
  if (!error || (Array.isArray(error) && error.length === 0)) return null;

  const errors = Array.isArray(error) ? error : [error];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full relative rounded-md border border-red-500/50 bg-red-50 dark:bg-red-950 
                   px-4 py-3 text-red-500 dark:text-red-400 "
      >
        
        
        <ul className="list-disc list-inside space-y-1 text-sm">
          {errors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorComponent;
