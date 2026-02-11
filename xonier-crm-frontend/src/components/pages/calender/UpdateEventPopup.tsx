"use client";

import React, { useEffect, useState } from "react";
import { EventType } from "@/src/constants/enum";
import { CalendarEventPayload } from "@/src/types/calenders/calender.types";
import { EventService } from "@/src/services/event.service";
import { toast } from "react-toastify";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { EventInput } from "@fullcalendar/core";

interface UpdateEventModalProps {
  open: boolean;
  event: EventInput | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  open,
  event,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CalendarEventPayload>({
    title: "",
    description: "",
    eventType: EventType.MEETING,
    meetingLink: null,
    start: "",
    end: null,
    isAllDay: false,
    priority: "medium",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when event changes
  useEffect(() => {
    if (event && open) {
      const startDate = event.start instanceof Date ? event.start : new Date(event.start as string);
      const endDate = event.end ? (event.end instanceof Date ? event.end : new Date(event.end as string)) : null;

      setFormData({
        title: event.title || "",
        description: event.extendedProps?.description || "",
        eventType: event.extendedProps?.eventType || EventType.MEETING,
        meetingLink: event.extendedProps?.meetingLink || null,
        start: formatDateTimeLocal(startDate),
        end: endDate ? formatDateTimeLocal(endDate) : null,
        isAllDay: event.allDay || false,
        priority: event.extendedProps?.priority || "medium",
      });
      setErrors({});
    }
  }, [event, open]);

  const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  };

  const handleChange = (field: keyof CalendarEventPayload, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.start) {
      newErrors.start = "Start date/time is required";
    }

    if (formData.end && formData.start) {
      const startDate = new Date(formData.start);
      const endDate = new Date(formData.end);
      
      if (endDate <= startDate) {
        newErrors.end = "End date/time must be after start date/time";
      }
    }

    if (formData.eventType === EventType.MEETING && formData.meetingLink && formData.meetingLink.trim()) {
      try {
        new URL(formData.meetingLink);
      } catch {
        newErrors.meetingLink = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    if (!event?.id) {
      toast.error("Event ID not found");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload
      const payload: CalendarEventPayload & { id: string } = {
        ...formData,
        id: event.id as string,
        description: formData.description || "",
        meetingLink: formData.meetingLink?.trim() || null,
        end: formData.isAllDay ? null : (formData.end || null),
      };

      const result = await EventService.update(payload);

      if (result.status === 200) {
        toast.success("Event updated successfully");
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error("Update event error:", error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Failed to update event");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      eventType: EventType.MEETING,
      meetingLink: null,
      start: "",
      end: null,
      isAllDay: false,
      priority: "medium",
    });
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/20 backdrop-blur-md bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Update Event
          </h2>
        </div>


        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4 grid grid-cols-2 gap-5">

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter event title"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.title ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select
                id="eventType"
                value={formData.eventType}
                onChange={(e) => handleChange("eventType", e.target.value as EventType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.values(EventType).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>


            {formData.eventType === EventType.MEETING && (
              <div>
                <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting Link
                </label>
                <input
                  id="meetingLink"
                  type="url"
                  value={formData.meetingLink || ""}
                  onChange={(e) => handleChange("meetingLink", e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.meetingLink ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.meetingLink && (
                  <p className="text-sm text-red-500 mt-1">{errors.meetingLink}</p>
                )}
              </div>
            )}


            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value as "low" | "medium" | "high")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            


            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start {formData.isAllDay ? "Date" : "Date & Time"} <span className="text-red-500">*</span>
              </label>
              <input
                id="start"
                type={formData.isAllDay ? "date" : "datetime-local"}
                value={formData.isAllDay ? formData.start.split("T")[0] : formData.start}
                onChange={(e) => handleChange("start", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.start ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.start && (
                <p className="text-sm text-red-500 mt-1">{errors.start}</p>
              )}
            </div>


            {!formData.isAllDay && (
              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date & Time
                </label>
                <input
                  id="end"
                  type="datetime-local"
                  value={formData.end || ""}
                  onChange={(e) => handleChange("end", e.target.value || null)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.end ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.end && (
                  <p className="text-sm text-red-500 mt-1">{errors.end}</p>
                )}
              </div>
            )}
          </div>

            
          <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter event description (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center mt-2 mb-4">
              <input
                type="checkbox"
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => handleChange("isAllDay", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isAllDay" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                All Day Event
              </label>
            </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                "Update Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateEventModal;