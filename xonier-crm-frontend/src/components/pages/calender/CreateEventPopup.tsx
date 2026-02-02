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
const [err, setErr] = useState<string | string[]>("")
const [isLoading, setIsLoading] = useState<boolean>(false)
  const [form, setForm] = useState<CalendarEventPayload>({
    title: "",
    eventType: EventType.MEETING,
    start: "",
    end: null,
    isAllDay: false,
    priority: "medium",
    description: "",
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
    setForm(prev => ({ ...prev, [name]: checked }));
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

    const result  = await EventService.create(form)
    if(result.status === 200){

    toast.success("Event created successfully")
    await getAllEvent()
    onClose();
    setForm({
    title: "",
    eventType: EventType.MEETING,
    start: "",
    end: null,
    isAllDay: false,
    priority: "medium",
    description: "",
  
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
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-xl">
    
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Event
            </h2>
            <p className="text-sm text-gray-500">
              Schedule meeting, call or reminder
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-text-500 cursor-pointer hover:rotate-90"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>


        <div className="px-6 py-5 grid grid-cols-2 gap-4 ">
          <Input
            label="Event title"
            name="title"
            placeholder="Enter event title"
            value={form.title}
            onChange={handleInputChange}
            required
          />

          <Select
            label="Event type"
            name="eventType"
            value={form.eventType}
            onChange={handleSelectChange}
            options={[
              { label: "Meeting", value: "meeting" },
              { label: "todo", value: "todo" },
              { label: "note", value: "note" },
              { label: "task", value: "task" },
              { label: "reminder", value: "reminder"}
            ]}
          />

          <div className="grid grid-cols-2 gap-4 col-span-2">
            <Input
              label="Start date & time"
              type="datetime-local"
              name="start"
              value={form.start}
              onChange={handleInputChange}
              required
            />

            {!form.isAllDay && (
              <Input
                label="End date & time"
                type="datetime-local"
                name="end"
                value={form.end ?? ""}
                onChange={handleInputChange}
              />
            )}
          </div>
          
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 ">
            <input
              type="checkbox"
              name="isAllDay"
              checked={form.isAllDay}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            All day event
          </label>

          <Select
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={handleSelectChange}
            options={[
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
            ]}
          />
          
          <div className="col-span-2">
          <Input
            label="Description"
            type="textarea"
            name="description"
            placeholder="Optional notes about this event"
            value={form.description}
            
            onChange={handleInputChange}
          />
          </div>
        </div>
        {err && <ErrorComponent error={err}/>}

        <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 cursor-pointer rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={form.title === "" || form.start === "" }
            className="px-5 py-2 rounded-md text-sm font-medium cursor-hover disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300  text-white "
          >
           {isLoading ? "Creating..." : "Create Event"} 
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
