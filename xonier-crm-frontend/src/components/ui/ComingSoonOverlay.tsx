// components/ui/ComingSoonOverlay.tsx

import React from "react";

type Props = {
  show?: boolean; // control visibility
  message?: string;
  subMessage?: string;
};

const ComingSoonOverlay: React.FC<React.PropsWithChildren<Props>> = ({
  children,
  show = true,
  message = "🚧 Coming Soon",
  subMessage = "We’re working on this feature",
}) => {
  return (
    <div className="relative">
      {/* Content */}
      <div className={show ? "pointer-events-none opacity-60" : ""}>
        {children}
      </div>

      {/* Overlay */}
      {show && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-md bg-white/30 dark:bg-black/30 rounded-xl">
          <div className="px-6 py-4 rounded-2xl bg-white/70 dark:bg-gray-800/70 shadow-xl border border-white/20 text-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white animate-pulse">
              {message}
            </h2>
            <p className="text-xs mt-1 text-gray-600 dark:text-gray-300">
              {subMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComingSoonOverlay;