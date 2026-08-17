"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import { toast } from "react-toastify";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { EventService } from "@/src/services/event.service";
import { CalendarEventPayload } from "@/src/types/calenders/calender.types";
import { EventType } from "@/src/constants/enum";
import { useTranslation } from "react-i18next";

interface BulkCreateEventModalProps {
  open: boolean;
  onClose: () => void;
  getAllEvent: () => Promise<void>;
}

const emptyEvent = (): CalendarEventPayload => ({
  title: "",
  eventType: EventType.MEETING,
  start: "",
  end: null,
  meetingLink: null,
  isAllDay: false,
  priority: "medium",
  description: "",
});

interface BulkResult {
  inserted: number;
  duplicates: number;
  failed: number;
  duplicateRecords: Array<{ title: string; reason: string }>;
  failedRecords: Array<{ title: string; reason: string }>;
}

const BulkCreateEventModal: React.FC<BulkCreateEventModalProps> = ({
  open,
  onClose,
  getAllEvent,
}) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEventPayload[]>([emptyEvent()]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [err, setErr] = useState<string | string[]>("");

  if (!open) return null;

  const handleFieldChange = (
    index: number,
    field: keyof CalendarEventPayload,
    value: any
  ) => {
    setEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev))
    );
  };

  const handleAddRow = () => {
    setEvents((prev) => [...prev, emptyEvent()]);
  };

  const handleRemoveRow = (index: number) => {
    if (events.length === 1) return;
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setEvents([emptyEvent()]);
    setResult(null);
    setErr("");
    onClose();
  };

  const handleSubmit = async () => {
    const invalidTitle = events.some((ev) => !ev.title.trim());
    const invalidStartDate = events.some((ev) => !ev.start);
    if (invalidTitle) {
      toast.info("Please fill valid title for all events");
      return;
    }
    else if(invalidStartDate){
      toast.info("Please fill valid start date for all events");
      return;
    }

    setIsLoading(true);
    setErr("");
    setResult(null);

    try {
      const response = await EventService.bulkCreate({ events });

      if (response.status === 201) {
        const data: BulkResult = response.data.data;
        console.log("dd: ", data)
        setResult(data);

        if (data.inserted > 0) {
          toast.success(`${data.inserted} event(s) created successfully`);
          await getAllEvent();
        }

        if (data.duplicates > 0) {
          toast.warn(`${data.duplicates} duplicate(s) skipped`);
        }

        if (data.failed > 0) {
          toast.error(`${data.failed} event(s) failed`);
        }

        if (data.inserted > 0 && data.duplicates === 0 && data.failed === 0) {
          handleClose();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-gray-900 shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("bulk_create_events")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("add_multiple_events_at_once")} {events.length} {t("event_s_queued")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-transform hover:rotate-90"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Result summary */}
        {result && (
          <div className="px-6 pt-4 shrink-0 space-y-2">
            <div className="flex gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                {result.inserted} {t("inserted")}
              </span>
              {result.duplicates > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {result.duplicates} {t("duplicate_s")}
                </span>
              )}
              {result.failed > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {result.failed} {t("failed_2")}
                </span>
              )}
            </div>

            {result.duplicateRecords.length > 0 && (
              <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 space-y-0.5">
                <p className="font-semibold mb-1">{t("duplicates_skipped")}</p>
                {result.duplicateRecords.map((r, i) => (
                  <p key={i}>• {r.title} — {r.reason}</p>
                ))}
              </div>
            )}

            {result.failedRecords.length > 0 && (
              <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 space-y-0.5">
                <p className="font-semibold mb-1">{t("failed_3")}</p>
                {result.failedRecords.map((r, i) => (
                  <p key={i}>• {r.title} — {r.reason}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event rows */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {events.map((event, index) => (
            <div
              key={index}
              className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("event")}{index + 1}
                </span>
                <button
                  onClick={() => handleRemoveRow(index)}
                  disabled={events.length === 1}
                  className="p-1 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("title_2")}
                  name="title"
                  placeholder={t("event_title")}
                  value={event.title}
                  onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                  required
                />

                <Select
                  label={t("event_type")}
                  name="eventType"
                  value={event.eventType}
                  onChange={(e) => handleFieldChange(index, "eventType", e.target.value)}
                  options={[
                    { label: "Meeting", value: "meeting" },
                    { label: "Todo", value: "todo" },
                    { label: "Note", value: "note" },
                    { label: "Task", value: "task" },
                    { label: "Reminder", value: "reminder" },
                  ]}
                />

                <Input
                  label={t("start_date_time")}
                  type="datetime-local"
                  name="start"
                  value={event.start}
                  onChange={(e) => handleFieldChange(index, "start", e.target.value)}
                  required
                />

                {!event.isAllDay && (
                  <Input
                    label={t("end_date_time")}
                    type="datetime-local"
                    name="end"
                    value={event.end ?? ""}
                    onChange={(e) =>
                    
                    handleFieldChange(index, "end", e.target.value || null)
                    }
                  />
                )}

                <Select
                  label={t("priority")}
                  name="priority"
                  value={event.priority}
                  onChange={(e) =>
                    handleFieldChange(
                      index,
                      "priority",
                      e.target.value as "low" | "medium" | "high"
                    )
                  }
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                  ]}
                />

                {event.eventType === EventType.MEETING && (
                  <Input
                    label={t("meeting_link")}
                    name="meetingLink"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={event.meetingLink ?? ""}
                    onChange={(e) =>
                      handleFieldChange(index, "meetingLink", e.target.value || null)
                    }
                  />
                )}

                <div className="col-span-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={event.isAllDay}
                      onChange={(e) => {
                              const checked = e.target.checked;

                                handleFieldChange(index, "isAllDay", checked);

                                if (checked) {
                                  handleFieldChange(index, "end", null);
                                }}}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    {t("all_day_event")}
                  </label>
                </div>

                <div className="col-span-2">
                  <Input
                    label={t("description_2")}
                    type="textarea"
                    name="description"
                    placeholder={t("optional_notes")}
                    value={event.description}
                    onChange={(e) =>
                      handleFieldChange(index, "description", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("add_another_event")}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700 shrink-0">
          <p className="text-sm text-gray-400">
            {events.length} {t("event_s_will_be_submitted")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 cursor-pointer rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-5 py-2 rounded-md text-sm font-medium cursor-pointer disabled:cursor-not-allowed bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white transition-colors"
            >
              {isLoading ? "Creating..." : `Create ${events.length} Event(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCreateEventModal;