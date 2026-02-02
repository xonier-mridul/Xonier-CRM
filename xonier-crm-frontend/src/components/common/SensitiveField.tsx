"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SensitiveFieldProps {
  value: string;
  maskedValue: string;
  link: string,
  revealDuration?: number; 
  fontSize?: string
}

export default function SensitiveField({
  value,
  maskedValue,
  link,
  revealDuration = 5000,
  fontSize = "base"
}: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, revealDuration);

    return () => clearTimeout(timer);
  }, [visible, revealDuration]);

  return (
    <span
      onClick={() => setVisible(true)}
      className={`cursor-pointer select-none text-${fontSize} text-blue-400 dark:text-blue-300 hover:underline`}
      title="Click to reveal for 5 seconds"
    >
      {visible ? (<Link href={link}
                                className="text-sm hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                              > {value} </Link>)  : maskedValue }
    </span>
  );
}
