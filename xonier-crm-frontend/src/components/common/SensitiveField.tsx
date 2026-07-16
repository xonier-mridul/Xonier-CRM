"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      title={t("click_to_reveal_for_5_seconds")}
    >
      {value ? (visible ? (<Link href={link}
                                className="text-sm hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                              > {value} </Link>)  : maskedValue ): "N/A"}
    </span>
  );
}
