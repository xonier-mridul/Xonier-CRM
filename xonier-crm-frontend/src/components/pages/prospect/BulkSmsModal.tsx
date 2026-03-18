import { useState } from "react";
import { MdMessage } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { Prospect } from "@/src/types/prospect/prospect.type";
import { toast } from "react-toastify";
import RichEditor from "@/src/components/pages/prospect/RichEditor";
import MailService from "@/src/services/communication/mail.service";
import prospectService from "@/src/services/prospect.service";

const BulkSmsModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim()) {
      toast.warning("Please enter a message");
      return;
    }
    setIsSending(true);
    try {
      await Promise.all(
        leads.map((lead) => prospectService.sendMessage(lead.phone, messageText))
      );
      setSent(true);
      toast.success(`SMS sent to ${leads.length} lead${leads.length > 1 ? "s" : ""}`);
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to send some messages");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-linear-to-r from-yellow-500 to-amber-500 px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MdMessage className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk SMS</h3>
              <p className="text-sm text-yellow-100">
                Sending to {leads.length} lead{leads.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Recipient chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recipients</p>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {leads.map((lead) => (
                <span
                  key={lead.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800"
                >
                  <span className="w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                    {lead.fullName?.[0]?.toUpperCase()}
                  </span>
                  {lead.fullName}
                </span>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Message</label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="w-full mt-1.5 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:outline-none dark:bg-gray-700 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{messageText.length} chars</p>
          </div>

          {/* Send */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || sent}
              className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md transition-colors"
            >
              <MdMessage className="w-4 h-4" />
              {isSending ? "Sending..." : sent ? "Sent!" : `Send to ${leads.length} Lead${leads.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSmsModal;