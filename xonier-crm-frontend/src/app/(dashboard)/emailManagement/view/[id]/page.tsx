"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmailLog } from "@/src/types/communication/mail.types";
import EmailService from "@/src/services/communication/mail.service";
import { Mail, User, Clock, CheckCircle, AlertCircle, FileText, Send } from "lucide-react";
import { MailX } from "lucide-react";


export default function Page() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<EmailLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const statusStyle = {
    sent: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    opened: "bg-blue-100 text-blue-700",
    queued: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };


  const fetchEmailLog = async () => {
    try {
      const res = await EmailService.getLogById(id);

      if (res?.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEmailLog();
  }, [id]);

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6">
        <p className="text-gray-500">Loading email log...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ml-72 mt-14 p-6 flex justify-center items-center">

        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-600">

          <div className="flex flex-col items-center text-center gap-3">

            <div className="bg-red-100 text-red-600 p-3 rounded-full">
              <MailX size={28} />
            </div>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Email Not Found
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-300">
              The email log you are trying to view does not exist or may have been removed.
            </p>

            <a
              href="/emailManagement/outbox"
              className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
            >
              Go Back to Outbox
            </a>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="ml-72 mt-14 p-6 space-y-6">

      {/* HEADER */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Email Log Details
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            Complete information about this email
          </p>
        </div>

        <span
          className={`px-4 py-1 rounded-full text-sm font-medium ${statusStyle[data.status]
            }`}
        >
          {data.status}
        </span>
      </div>

      {/* INFO GRID */}
      <div className="grid md:grid-cols-2 gap-6">

        <InfoCard
          icon={<Mail size={18} />}
          label="To Email"
          value={data.to_email}
        />

        <InfoCard
          icon={<Send size={18} />}
          label="From Email"
          value={data.from_email}
        />

        <InfoCard
          icon={<FileText size={18} />}
          label="Subject"
          value={data.subject}
        />

        <InfoCard
          icon={<User size={18} />}
          label="Provider Message ID"
          value={data.provider_message_id || "-"}
        />

        <InfoCard
          icon={<Clock size={18} />}
          label="Sent At"
          value={data.sent_at || "-"}
        />

        <InfoCard
          icon={<Clock size={18} />}
          label="Delivered At"
          value={data.delivered_at || "-"}
        />

        <InfoCard
          icon={<CheckCircle size={18} />}
          label="Opened At"
          value={data.opened_at || "-"}
        />

        <InfoCard
          icon={<AlertCircle size={18} />}
          label="Failed At"
          value={data.failed_at || "-"}
        />

      </div>

      {/* EMAIL BODY */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-200 p-6 shadow-sm">

        <h3 className="text-lg font-semibold mb-4 dark:text-white">
          Email Body
        </h3>

        <div
          className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-sm whitespace-pre-line text-slate-800 dark:text-white"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      </div>

      {/* ERROR MESSAGE */}
      {data.error_message && (
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
  value: string | null | undefined;
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

        <p className="text-sm font-semibold text-slate-800 dark:text-white break-all">
          {value || "-"}
        </p>
      </div>

    </div>
  );
}