"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Message } from "@/src/types/communication/message.types";
import { MessageService}  from "@/src/services/communication/message.servicie";
import {
  Phone,
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
} from "lucide-react";

export default function Page() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const statusStyle = {
    sent: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    queued: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };

  const fetchMessage = async () => {
    try {
      setIsLoading(true);

      const res = await MessageService.getById(id);

      if (res.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMessage();
  }, [id]);

  return (
    <div className="ml-72 mt-14 p-6 space-y-6">

      {/* HEADER */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            SMS Details
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            View full information about this message
          </p>
        </div>

        {!isLoading && data && (
          <span
            className={`px-4 py-1 rounded-full text-sm font-medium ${
              statusStyle[data.status as keyof typeof statusStyle]
            }`}
          >
            {data.status}
          </span>
        )}
      </div>

      {/* INFO GRID */}
      <div className="grid md:grid-cols-2 gap-6">

        <InfoCard
          icon={<Phone size={18} />}
          label="To Number"
          value={data?.sent_to_number || "-"}
        />

        <InfoCard
          icon={<Send size={18} />}
          label="From Number"
          value={data?.sent_from_number || "-"}
        />

        <InfoCard
          icon={<MessageSquare size={18} />}
          label="Direction"
          value={data?.direction || "-"}
        />

        <InfoCard
          icon={<CheckCircle size={18} />}
          label="Channel"
          value={data?.channel || "-"}
        />

        <InfoCard
          icon={<Clock size={18} />}
          label="Sent At"
          value={data?.sent_at || "-"}
        />

        <InfoCard
          icon={<Clock size={18} />}
          label="Delivered At"
          value={data?.delivered_at || "-"}
        />

        {/* <InfoCard
          icon={<Clock size={18} />}
          label="Read At"
          value={data?.read_at || "-"}
        /> */}

        {(data?.status === "failed") && 
          <InfoCard
          icon={<AlertCircle size={18} />}
          label="Failed At"
          value={data?.failed_at || "-"}
        />
}
        <InfoCard
          icon={<DollarSign size={18} />}
          label="Cost"
          value={
            data?.cost ? `${data.cost} ${data.cost_currency}` : "-"
          }
        />

        <InfoCard
          icon={<MessageSquare size={18} />}
          label="Provider SID"
          value={data?.provider_message_sid || "-"}
        />

      </div>

      {/* MESSAGE CARD */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">
          Message
        </h3>

        <div className="flex">
          <div className="bg-blue-100 dark:bg-blue-900 text-sm p-4 rounded-lg max-w-xl text-slate-800 dark:text-white shadow-sm">
            {data?.message || "--- No message found ---"}
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {data?.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-red-600 font-semibold mb-2">
            Error Message
          </h3>

          <p className="text-red-700 text-sm">
            {data.error_message}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl p-4 flex items-start gap-3 shadow-sm">

      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md text-blue-600">
        {icon}
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {value}
        </p>
      </div>

    </div>
  );
}