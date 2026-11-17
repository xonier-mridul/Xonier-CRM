"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import { toast } from "react-toastify";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { EventService } from "@/src/services/event.service";
import { CalendarEventPayload } from "@/src/types/calenders/calender.types";
import { EventType } from "@/src/constants/enum";
import ErrorComponent from "../../ui/ErrorComponent";
import CrmEntityRecordPicker from "../../common/CrmEntityRecordPicker";
import { useTranslation } from "react-i18next";

interface CreateEventModalProps {
  open: boolean;
  defaultStart: string | null;
  onClose: () => void;
  onSubmit: (data: any) =>  void;
  getAllEvent: ()=> Promise<void>
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  open,
  defaultStart,
  onClose,
  onSubmit,
  getAllEvent
}) => {
  const { t } = useTranslation();
const [err, setErr] = useState<string | string[]>("")
const [isLoading, setIsLoading] = useState<boolean>(false)
  const [form, setForm] = useState<CalendarEventPayload>({
    title: "",
    eventType: EventType.MEETING,
    start: "",
    end: null,
    meetingLink: "",
    isAllDay: false,
    priority: "medium",
    description: "",
    entityType: "",
    entityId: "",
    entityName: "",
  });


  useEffect(() => {
    if (defaultStart && open) {
      setForm(prev => ({
        ...prev,
        start: defaultStart,
      }));
    }
  }, [defaultStart, open]);

  if (!open) return null;


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {

    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  
const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, checked } = e.target;

  setForm((prev) => {
    const updatedForm = {
      ...prev,
      [name]: checked,
    };

    if (name === "isAllDay" && checked) {
      updatedForm.end = null;
    }

    return updatedForm;
  });
};

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async() => {
    setIsLoading(true)
    try {
         if (!form.title || !form.start){
      return toast.info("Please fill all required fill  properly")
    };
  
    const payload: CalendarEventPayload = {
      ...form,
      entityType: form.entityType && form.entityId ? form.entityType : null,
      entityId: form.entityType && form.entityId ? form.entityId : null,
      entityName: form.entityType && form.entityId ? form.entityName || null : null,
    };
    const result  = await EventService.create(payload)
    console.log("event created:",result)
    if(result.status === 201){

    toast.success("Event created successfully")
    await getAllEvent()
    onClose();
    setForm({
    title: "",
    eventType: EventType.MEETING,
    start: "",
    meetingLink: "",
    end: null,
    isAllDay: false,
    priority: "medium",
    description: "",
    entityType: "",
    entityId: "",
    entityName: "",
    })
    setErr("")
    
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
        
    } finally{
        setIsLoading(false)
    }
   
  };


  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50 dark:bg-white/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-xl">
    
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-400 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("create_event")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("schedule_meeting_call_or_reminder")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 group rounded-md hover:bg-red-100 dark:hover:bg-text-500 cursor-pointer hover:rotate-90"
          >
            <X className="w-5 h-5 text-gray-500 group-hover:text-red-500" />
          </button>
        </div>


        <div className="px-6 py-5 grid grid-cols-2 gap-4  items-end justify-end">
          <Input
            label={t("event_title")}
            name="title"
            placeholder={t("enter_event_title")}
            value={form.title}
            onChange={handleInputChange}
            required
          />

          <Select
            label={t("event_type_2")}
            name="eventType"
            value={form.eventType}
            onChange={handleSelectChange}
            options={[
              { label: "meeting", value: "meeting" },
              { label: "todo", value: "todo" },
              { label: "note", value: "note" },
              { label: "task", value: "task" },
              { label: "reminder", value: "reminder"}
            ]}
          />

          {/* <div className="grid grid-cols-2 gap-4 col-span-2"> */}
            <Input
              label={t("start_date_time_2")}
              type="datetime-local"
              name="start"
              value={form.start}
              onChange={handleInputChange}
              required
            />
            

            {!form.isAllDay && (
              <Input
                label={t("end_date_time_2")}
                type="datetime-local"
                name="end"
                value={form.end ?? ""}
                onChange={handleInputChange}
              />
            )}
        
          
         

          <Select
            label={t("priority")}
            name="priority"
            value={form.priority}
            onChange={handleSelectChange}
            options={[
              { label: "low", value: "low" },
              { label: "medium", value: "medium" },
              { label: "high", value: "high" },
            ]}
          />
            {form.eventType === EventType.MEETING &&
         
         <Input
          label={t("meeting_link")}
          name="meetingLink"
          type="url"
          value={form.meetingLink ?? ""}
          onChange={handleInputChange}
          placeholder="https://meet.google.com/abc-defg-hij"
          className="col-span-2"
          />
       }
             <label className={`flex col-span-2 items-end justify-end   w-full h-full gap-3 text-sm text-gray-700 dark:text-gray-300 `}>
            <input
              type="checkbox"
              name="isAllDay"
              checked={form.isAllDay}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            {t("all_day_event")}
          </label>

          <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Link to CRM Record
              </label>
              <select
                value={form.entityType || ""}
                onChange={(e) => {
                  const nextType = e.target.value as "lead" | "deal" | "";
                  setForm((prev) => ({
                    ...prev,
                    entityType: nextType,
                    entityId: "",
                    entityName: "",
                  }));
                }}
                className="w-full px-3 py-2.5 rounded-md border text-[14px] bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="deal">Deal</option>
              </select>
            </div>

            {(form.entityType === "lead" || form.entityType === "deal") && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {form.entityType === "lead" ? "Linked Lead" : "Linked Deal"}
                </label>
                <CrmEntityRecordPicker
                  entityType={form.entityType}
                  value={form.entityId || ""}
                  displayName={form.entityName || ""}
                  onChange={(entityId, entityName) =>
                    setForm((prev) => ({
                      ...prev,
                      entityId,
                      entityName,
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-md border text-[14px] bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex items-center justify-between gap-2 text-left cursor-pointer"
                />
              </div>
            )}
          </div>
         
         
          
          <div className="col-span-2">
          <Input
            label={t("description")}
            type="textarea"
            name="description"
            placeholder={t("optional_notes_about_this_event")}
            value={form.description}
            
            onChange={handleInputChange}
          />
          </div>
         
        </div>
        {err && <ErrorComponent error={err}/>}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-400 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 cursor-pointer text-slate-500 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={form.title === "" || form.start === "" }
            className="px-5 py-2 rounded-md text-sm font-medium cursor-hover disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-600 disabled:bg-cyan-500  text-white "
          >
           {isLoading ? "Creating..." : t("create_event")} 
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
