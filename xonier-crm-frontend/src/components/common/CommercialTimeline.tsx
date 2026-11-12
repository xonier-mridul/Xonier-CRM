"use client";

import { useEffect, useState } from "react";
import api from "@/src/lib/axios";

type Item = { id: string; at: string; kind: string; title: string; detail: string; pending: boolean };

export default function CommercialTimeline({ entityType, entityId }: { entityType: "lead" | "deal"; entityId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.get<{ data: Item[] }>(`/next-action/${entityType}/${entityId}/timeline`)
      .then((response) => active && setItems(response.data.data))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [entityId, entityType]);
  if (loading) return <p className="text-sm text-gray-500">Loading timeline…</p>;
  if (!items.length) return <p className="text-sm text-gray-500">No commercial history yet.</p>;
  return <div className="space-y-3">{items.map((item) => (
    <div key={item.id} className="border-l-2 border-cyan-500 pl-4">
      <div className="flex flex-wrap gap-x-2"><p className="font-medium text-gray-900 dark:text-white">{item.title}</p>{item.pending && <span className="text-xs font-semibold text-cyan-700">NEXT ACTION</span>}</div>
      {item.detail && <p className="text-sm text-gray-500">{item.detail}</p>}
      <p className="text-xs text-gray-400">{new Date(item.at).toLocaleString()}</p>
    </div>
  ))}</div>;
}
