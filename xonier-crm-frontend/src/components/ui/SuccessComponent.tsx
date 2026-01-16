"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";

interface SuccessProps {
  message?: string ;
}

const SuccessComponent: React.FC<SuccessProps> = ({ message }) => {
  if (!message) return null;

  

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full relative rounded-md border border-green-500/50 bg-green-50 dark:bg-green-950 
                   px-4 py-3 text-green-700 dark:text-green-400 shadow-sm"
      >
     
        <div className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 text-green-600 dark:text-green-400" size={18} />

        
          <p>{message}</p>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default SuccessComponent;
