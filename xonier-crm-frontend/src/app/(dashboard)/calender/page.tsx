"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import CreateEventModal from "@/src/components/pages/calender/CreateEventPopup";
import { CalendarEvent } from "@/src/types/calenders/calender.types";
import axios from "axios";
import { EventInput } from "@fullcalendar/core";
import { toast } from "react-toastify";

import extractErrorMessages from "../../utils/error.utils";
import { EventService } from "@/src/services/event.service";
import ViewEventPopup from "@/src/components/pages/calender/ViewEventPopup";
import { ParamValue } from "next/dist/server/request/params";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";

const Page = (): JSX.Element => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [err, setErr] = useState<string | string[]>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
const [eventData, setEventData] = useState<EventInput[]>([]);
const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
const [openViewModal, setOpenViewModal] = useState(false);

const {hasPermission} = usePermissions()

  const openCreateEventModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setOpenModal(true);
  };


  const getAllEvent = async () => {
  setIsLoading(true);
  try {
    const result = await EventService.getAll();

    if (result.status === 200) {
      const mapped = mapToCalendarEvents(result.data.data);
      setEventData(mapped);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      setErr(extractErrorMessages(error));
    } else {
      setErr(["Something went wrong"]);
    }
  } finally {
    setIsLoading(false);
  }
};


  const mapToCalendarEvents = (events: CalendarEvent[]): EventInput[] => {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end ?? undefined, 
    allDay: event.isAllDay,
    extendedProps: {
      description: event.description,
      priority: event.priority,
      eventType: event.eventType,
    },
  }));
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

  const lastClickRef = useRef<number | null>(null);

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

    if (lastClickRef.current && now - lastClickRef.current < 300) {
      if(!hasPermission(PERMISSIONS.createEvent)){
      toast.info("You not have permission to create event")
      return
    } ;
      const formatted = toDateTimeLocal(info.date);
      openCreateEventModal(formatted);
    }

    lastClickRef.current = now;
  };

  useEffect(() => {
    getAllEvent()
  }, [])


  const handleDelete = async(id:string, title:string)=>{
    setLoading(true)
    try {
      if(!id){
        toast.info(`Event id not found`)
        return
      }

      const isConfirm = await ConfirmPopup({title: "Are you sure", text:`Are you want to delete ${title} event!`, btnTxt: "Yes, Delete"})
      if(isConfirm){
        const result = await EventService.delete(id)
        setOpenViewModal(false)
      if(result.status === 200){
         toast.success("Event deleted successfully")
         await getAllEvent()
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
      setLoading(false)
    }
  }
  

  return (
    <>
      <CreateEventModal
        open={openModal}
        defaultStart={selectedDate}
        onClose={() => setOpenModal(false)}
        onSubmit={handleCreateEvent}
        getAllEvent={getAllEvent}
      />

      <div
        className="mt-14 ml-72 p-6 transition-all"
 
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Calendar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage meetings, events and schedules
          </p>
        </div>

        <ViewEventPopup
  open={openViewModal}
  event={selectedEvent}
  onClose={() => setOpenViewModal(false)}
  onDelete={handleDelete}
/>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={eventData}
            height="75vh"
            selectable
            editable
            nowIndicator
            dateClick={handleDateClick}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            eventClick={handleEventClick} 
            buttonText={{
              today: "Today",
              month: "Month",
              week: "Week",
              day: "Day",
            }}
            dayMaxEvents={3}
            eventColor="#2563eb"
            eventTextColor="#ffffff"
          />
        </div>
      </div>
    </>
  );
};

export default Page;
