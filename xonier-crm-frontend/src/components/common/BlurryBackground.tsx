"use client";

import React, { JSX, useEffect } from "react";

interface BlurryBackgroundProps {
  onClick?: () => void;
}

const BlurryBackground = ({ onClick }: BlurryBackgroundProps): JSX.Element => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClick) {
        onClick();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClick]);

  return (
    <div
      onClick={onClick}
      className="
        fixed inset-0 w-full h-full
        bg-black/30 backdrop-blur-sm
        z-[199]
        cursor-pointer
      "
      aria-hidden="true"
    />
  );
};

export default BlurryBackground;
