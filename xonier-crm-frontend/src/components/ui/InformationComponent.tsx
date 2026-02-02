"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { IoMdInformationCircleOutline } from "react-icons/io";

interface SuccessProps {
  message?: string ;
}

const InformationComponent: React.FC<SuccessProps> = ({ message }) => {
  if (!message) return null;

  

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full relative rounded-md border animate-pulse border-blue-500/50 bg-blue-50 dark:bg-blue-950 
                   px-4 py-3 text-blue-700 dark:text-blue-400 shadow-sm"
      >
     
        <div className="flex items-start gap-2">
          <IoMdInformationCircleOutline className="mt-0.5 text-blue-600 dark:text-blue-400" size={18} />

        
          <p>{message}</p>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default InformationComponent;
