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
import {
  CalendarDays,
  LoaderCircle,
  Plus,
  ListPlus,
  Grid3X3,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/src/components/common/PageHeader";

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
  const [googleCalendar, setGoogleCalendar] = useState<{
    connected: boolean;
    accountEmail: string | null;
    adminCalendarConnected: boolean;
    adminCalendarEmail: string | null;
    isCompanyAdmin: boolean;
  } | null>(null);
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);

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

  const loadGoogleCalendarStatus = async () => {
    try {
      const response = await EventService.getGoogleCalendarConnection();
      setGoogleCalendar(response.data);
    } catch (error) {
      if (process.env.NEXT_PUBLIC_ENV === "development") console.error(error);
    }
  };

  useEffect(() => {
    void loadGoogleCalendarStatus();
    const result = new URLSearchParams(window.location.search).get("googleCalendar");
    if (result) {
      if (result === "connected") toast.success("Google Calendar connected. Existing follow-ups are syncing.");
      else toast.error("Google Calendar could not be connected. Check the account consent and OAuth configuration.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogleCalendarConnect = async () => {
    setGoogleCalendarLoading(true);
    try {
      const response = await EventService.connectGoogleCalendar();
      window.location.assign(response.data.authorizationUrl);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? extractErrorMessages(error)
        : "Unable to start Google Calendar connection";
      toast.error(Array.isArray(message) ? message[0] : message);
      setGoogleCalendarLoading(false);
    }
  };

  const handleGoogleCalendarDisconnect = async () => {
    setGoogleCalendarLoading(true);
    try {
      await EventService.disconnectGoogleCalendar();
      await loadGoogleCalendarStatus();
      toast.success("Google Calendar disconnected");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? extractErrorMessages(error)
        : "Unable to disconnect Google Calendar";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setGoogleCalendarLoading(false);
    }
  };

  const mapToCalendarEvents = (events: CalendarEvent[]): EventInput[] => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end ?? undefined,
      allDay: event.isAllDay,
      backgroundColor: event.followUpEntity ? "#cffafe" : getEventColor(event.priority),
      borderColor: event.followUpEntity ? "#5aa8ba" : getEventBorderColor(event.priority),
      textColor: event.followUpEntity ? "#015d73" : getEventTextColor(event.priority),
      extendedProps: {
        description: event.description,
        priority: event.priority,
        eventType: event.eventType,
        meetingLink: event.meetingLink ?? null,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        entityName: event.entityName ?? null,
        isFollowUp: Boolean(event.followUpEntity),
        followUpEntity: event.followUpEntity,
        followUpRecordId: event.followUpRecordId,
      },
      classNames: [`event-${event.priority?.toLowerCase() || "default"}`],
    }));
  };

  const getEventColor = (priority?: string): string => {
    const colors = {
      high: "#fee2e2",
      medium: "#fef3c7",
      low: "#d1fae5",
      default: "#e0e7ff",
    };
    return colors[priority?.toLowerCase() as keyof typeof colors] || colors.default;
  };

  const getEventBorderColor = (priority?: string): string => {
    const colors: Record<string, string> = {
      high: "#fca5a5", medium: "#fcd34d", low: "#6ee7b7", default: "#a5b4fc",
    };
    return colors[priority?.toLowerCase() || "default"] || colors.default;
  };

  const getEventTextColor = (priority?: string): string => {
    const colors: Record<string, string> = {
      high: "#991b1b", medium: "#92400e", low: "#065f46", default: "#3730a3",
    };
    return colors[priority?.toLowerCase() || "default"] || colors.default;
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
      const { isConfirmed } = await ConfirmPopup({
        title: t("are_you_sure"),
        text: t("delete_event_message").replace("{{title}}", title),
        btnTxt: t("yes_delete"),
      });
      if (isConfirmed) {
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

      <div>
        {isLoading && (
          <div role="status" className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin text-cyan-700 dark:text-cyan-300" />
            {t("loading_events")}
          </div>
        )}

        <PageHeader className="mb-6" title={t("calendar")} description={t("manage_meetings_events_and_schedules")} icon={<CalendarDays className="h-5 w-5" />} actions={<button type="button" onClick={handleBulkCreateClick} className="crm-button-primary"><ListPlus className="h-4 w-4" />{t("bulk_create_events")}</button>} />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900/60">
          <div className="text-sm">
            <p className="font-semibold text-slate-800 dark:text-white">Google Calendar</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {googleCalendar?.connected
                ? `Connected: ${googleCalendar.accountEmail}`
                : "Connect your account to sync your follow-ups."}
              {googleCalendar && !googleCalendar.adminCalendarConnected && !googleCalendar.isCompanyAdmin
                ? " The company admin must connect too to receive team follow-ups."
                : ""}
              {googleCalendar?.isCompanyAdmin && googleCalendar.connected
                ? " Team follow-ups will also appear here."
                : ""}
            </p>
          </div>
          {googleCalendar?.connected ? (
            <button type="button" onClick={handleGoogleCalendarDisconnect} disabled={googleCalendarLoading} className="crm-button-secondary">
              Disconnect
            </button>
          ) : (
            <button type="button" onClick={handleGoogleCalendarConnect} disabled={googleCalendarLoading} className="crm-button-primary">
              {googleCalendarLoading ? "Connecting…" : "Connect Google Calendar"}
            </button>
          )}
        </div>

        <ViewEventPopup
          open={openViewModal}
          event={selectedEvent}
          onClose={() => setOpenViewModal(false)}
          onDelete={handleDelete}
          onEdit={handleEditClick}
        />

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-900/60 sm:p-5">
          {/* Custom Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const api = calendarRef.current?.getApi();
                    api?.prev();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={t("previous")}
                  title={t("previous")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="min-w-[190px] text-center text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {formatCurrentMonth}
                </h2>
                <button
                  onClick={() => {
                    const api = calendarRef.current?.getApi();
                    api?.next();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={t("next")}
                  title={t("next")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  const api = calendarRef.current?.getApi();
                  api?.today();
                }}
                className="crm-button-secondary"
              >
                {t("today")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                {viewButtons.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleViewChange(id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeView === id
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  if (!hasPermission(PERMISSIONS.createEvent)) {
                    toast.info(t("no_create_event_permission"));
                    return;
                  }
                  openCreateEventModal(new Date().toISOString());
                }}
                className="crm-button-primary whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                {t("add_event")}
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="fc-custom-theme">
           <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={calendarLocale}
              events={eventData}
              height={activeView === "dayGridMonth" ? "auto" : "75vh"}
              selectable
              editable
              nowIndicator
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              dayMaxEvents={3}
              eventColor="#e0e7ff"
              eventTextColor="#3730a3"
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
        </section>
      </div>
    </>
  );
};

export default Page;
