"use client";

import React, { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";


import CreateEventModal from "@/src/components/pages/calender/CreateEventPopup";
import BulkCreateEventModal from "@/src/components/pages/calender/Bulkcreateeventpopup";
import { CalendarEvent } from "@/src/types/calenders/calender.types";
import axios from "axios";
import { EventInput } from "@fullcalendar/core";
import { toast } from "react-toastify";
import extractErrorMessages from "../../utils/error.utils";
import { EventService } from "@/src/services/event.service";
import ViewEventPopup from "@/src/components/pages/calender/ViewEventPopup";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import UpdateEventModal from "@/src/components/pages/calender/UpdateEventPopup";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Plus,
  ListPlus,
  Grid3X3,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Page = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [openModal, setOpenModal] = useState(false);
  const [openBulkModal, setOpenBulkModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [eventData, setEventData] = useState<EventInput[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [activeView, setActiveView] = useState("dayGridMonth");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { hasPermission } = usePermissions();
  const lastClickRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);
  const calendarRef = useRef<any>(null);

  const calendarLanguage = useMemo(() => {
  const lang = i18n.language?.toLowerCase();

  if (lang === "po") return "pt";
  if (lang === "pt-br") return "pt-BR";
  if (lang === "pt-pt") return "pt-PT";

  return lang || "en";
}, [i18n.language]);


  const calendarLocale = useMemo(() => {
  return {
    code: calendarLanguage,
    week: {
      dow: 0,
      doy: 6,
    },
    buttonText: {
      prev: t("fc_prev"),
      next: t("fc_next"),
      today: t("fc_today"),
      month: t("fc_month"),
      week: t("fc_week"),
      day: t("fc_day"),
      list: t("fc_list"),
    },
    weekText: t("fc_week_text"),
    allDayText: t("fc_all_day"),
    moreLinkText: t("fc_more_link"),
    noEventsText: t("fc_no_events"),
  };
}, [i18n.language, t]);

  // Format current month based on locale
  // const formatCurrentMonth = (date: Date) => {
  //   return date.toLocaleDateString(i18n.language, {
  //     month: "long",
  //     year: "numeric",
  //   });
  // };

const formatCurrentMonth = useMemo(() => {
  return currentMonth.toLocaleDateString(calendarLanguage, {
    month: "long",
    year: "numeric",
  });
}, [currentMonth, calendarLanguage]);

  const openCreateEventModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setOpenModal(true);
  };

  const getAllEvent = async () => {
    setIsLoading(true);
    try {
      const result = await EventService.getAll();
      if (result.status === 200) {
        const mapped = mapToCalendarEvents(result.data.data.data);
        setEventData(mapped);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr([t("something_went_wrong")]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllEvent();
  }, []);

  const mapToCalendarEvents = (events: CalendarEvent[]): EventInput[] => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end ?? undefined,
      allDay: event.isAllDay,
      backgroundColor: getEventColor(event.priority),
      borderColor: getEventColor(event.priority),
      textColor: "#ffffff",
      extendedProps: {
        description: event.description,
        priority: event.priority,
        eventType: event.eventType,
        meetingLink: event.meetingLink ?? null,
      },
      classNames: [`event-${event.priority?.toLowerCase() || "default"}`],
    }));
  };

  const getEventColor = (priority?: string): string => {
    const colors = {
      high: "#ef4444", // red
      medium: "#f59e0b", // amber
      low: "#10b981", // emerald
      default: "#6366f1", // cyan
    };
    return colors[priority?.toLowerCase() as keyof typeof colors] || colors.default;
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      allDay: info.event.allDay,
      extendedProps: info.event.extendedProps,
    });
    setOpenViewModal(true);
  };

  const handleCreateEvent = (data: any) => {
    console.log("Submit to API:", data);
  };

  function toDateTimeLocal(date: Date) {
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
  }

  const handleDateClick = (info: any) => {
    const now = Date.now();
    const timeSinceLast = lastClickRef.current ? now - lastClickRef.current : Infinity;

    if (timeSinceLast < 300) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }

    lastClickRef.current = now;

    if (!hasPermission(PERMISSIONS.createEvent)) {
      toast.info(t("no_create_event_permission"));
      return;
    }

    const formatted = toDateTimeLocal(info.date);

    if (clickCountRef.current === 1) {
      openCreateEventModal(formatted);
    } else if (clickCountRef.current === 2) {
      setOpenBulkModal(true);
    } else if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setLoading(true);
    try {
      if (!id) {
        toast.info(t("event_id_not_found"));
        return;
      }
      const isConfirm = await ConfirmPopup({
        title: t("are_you_sure"),
        text: t("delete_event_message").replace("{{title}}", title),
        btnTxt: t("yes_delete"),
      });
      if (isConfirm) {
        const result = await EventService.delete(id);
        setOpenViewModal(false);
        if (result.status === 200) {
          toast.success(t("event_deleted_successfully"));
          await getAllEvent();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr([t("something_went_wrong")]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!hasPermission(PERMISSIONS.updateEvent)) {
      toast.info(t("no_update_event_permission"));
      return;
    }
    setOpenViewModal(false);
    setOpenUpdateModal(true);
  };

  const handleUpdateSuccess = () => {
    getAllEvent();
  };

  const handleBulkCreateClick = () => {
    if (!hasPermission(PERMISSIONS.createEvent)) {
      toast.info(t("no_create_event_permission"));
      return;
    }
    setOpenBulkModal(true);
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(view);
    }
  };
const handleDatesSet = useCallback((dateInfo: any) => {
  const nextDate = dateInfo.view.currentStart;

  setCurrentMonth((prev) => {
    if (
      prev.getFullYear() === nextDate.getFullYear() &&
      prev.getMonth() === nextDate.getMonth() &&
      prev.getDate() === nextDate.getDate()
    ) {
      return prev;
    }

    return nextDate;
  });
}, []);
  const viewButtons = [
    { id: "dayGridMonth", label: t("view_month"), icon: Grid3X3 },
    { id: "timeGridWeek", label: t("view_week"), icon: CalendarDays },
    { id: "timeGridDay", label: t("view_day"), icon: Clock },
  ];

  return (
    <>
      <CreateEventModal
        open={openModal}
        defaultStart={selectedDate}
        onClose={() => setOpenModal(false)}
        onSubmit={handleCreateEvent}
        getAllEvent={getAllEvent}
      />

      <BulkCreateEventModal
        open={openBulkModal}
        onClose={() => setOpenBulkModal(false)}
        getAllEvent={getAllEvent}
      />

      <UpdateEventModal
        open={openUpdateModal}
        event={selectedEvent}
        onClose={() => setOpenUpdateModal(false)}
        onSuccess={handleUpdateSuccess}
      />

      <div className="mt-14 lg:ml-72 p-1 md:p-6 transition-all">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 bg-cyan-500 text-white px-6 py-3 rounded-lg shadow-lg"
            >
              {t("loading_events")}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 dark:text-white font-bold text-4xl mb-2">
                {t("calendar")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("manage_meetings_events_and_schedules")}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBulkCreateClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-500 text-white transition-all shadow-[10px] hover:shadow-[#16c2cf]"
            >
              <ListPlus className="w-4 h-4" />
              {t("bulk_create_events")}
            </motion.button>
          </div>
        </motion.div>

        <ViewEventPopup
          open={openViewModal}
          event={selectedEvent}
          onClose={() => setOpenViewModal(false)}
          onDelete={handleDelete}
          onEdit={handleEditClick}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-900/30 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6"
        >
          {/* Custom Toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 ">
            {/* Month Navigation */}
            <div className="grid grid-cols-4 md:grid-cols-5 items-center gap-3">
              <div className='flex col-span-3 md:col-span-4 items-center'>
                <button
                  onClick={() => {
                    const api = calendarRef.current?.getApi();
                    api?.prev();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t("previous")}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[200px] text-center">
                  {formatCurrentMonth}
                </h2>
                <button
                  onClick={() => {
                    const api = calendarRef.current?.getApi();
                    api?.next();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t("next")}
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <button
                onClick={() => {
                  const api = calendarRef.current?.getApi();
                  api?.today();
                }}
                className="px-4 py-2 text-sm font-medium bg-cyan-50 border border-cyan-300 dark:border-cyan-900 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
              >
                {t("today")}
              </button>
            </div>

            <div className='grid grid-cols-4 md:grid-cols-3 gap-4 '>
              {/* View Switcher */}
              <div className="flex gap-2 col-span-3 md:col-span-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                {viewButtons.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleViewChange(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeView === id
                        ? "bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!hasPermission(PERMISSIONS.createEvent)) {
                    toast.info(t("no_create_event_permission"));
                    return;
                  }
                  openCreateEventModal(new Date().toISOString());
                }}
                className="flex items-center gap-2 pr-3 md:px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all shadow-lg hover:shadow-emerald-500/25 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 " />
                {t("add_event")}
              </motion.button>
            </div>
          </div>

          {/* Calendar */}
          <div className="fc-custom-theme ">
           <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={calendarLocale}
              events={eventData}
              height="75vh"
              selectable
              editable
              nowIndicator
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              dayMaxEvents={3}
              eventColor="#6366f1"
              eventTextColor="#ffffff"
              datesSet={handleDatesSet}
              headerToolbar={false}
              views={{
                dayGridMonth: {
                  titleFormat: { year: "numeric", month: "long" },
                },
                timeGridWeek: {
                  titleFormat: { year: "numeric", month: "long", day: "numeric" },
                },
                timeGridDay: {
                  titleFormat: { year: "numeric", month: "long", day: "numeric" },
                },
              }}
            />
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Page;