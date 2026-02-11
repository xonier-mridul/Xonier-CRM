import api from "../lib/axios"; 
import { CalendarEventPayload } from "@/src/types/calenders/calender.types";

export const EventService = {
    create: (payload: CalendarEventPayload) => api.post("/event/create", payload),
    getAll: () => api.get("/event/all"),
    update: (payload: CalendarEventPayload & { id: string }) => api.put(`/event/update/${payload.id}`, payload),
    delete: (id: string) => api.delete(`/event/delete/${id}`)
}