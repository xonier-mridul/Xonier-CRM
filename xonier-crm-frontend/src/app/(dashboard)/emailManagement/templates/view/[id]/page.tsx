"use client";

import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams();
  const id = params.id;

  return (
    <div className="ml-72 mt-14 p-6">
      <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-slate-900/10">
        <h2 className="text-xl font-bold dark:text-white">
          Email  Template Details
        </h2>

        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Viewing email ID: {id}
        </p>
      </div>
    </div>
  );
}