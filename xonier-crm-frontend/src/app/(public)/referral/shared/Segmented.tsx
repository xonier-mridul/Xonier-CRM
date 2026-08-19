"use client";

import { useState } from "react";

export default function Segmented({ options }: { options: string[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex rounded-lg border border-slate-200 bg-paper p-0.5">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => setActive(i)}
          className={`rounded-md px-3 py-1.5 text-xs ${
            i === active ? "bg-cyan-500 font-medium text-white shadow-sm" : "text-slate-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
