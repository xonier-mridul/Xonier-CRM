import api from "../lib/axios"; 
import { CalendarEventPayload, BulkCalenderEventPayload } from "@/src/types/calenders/calender.types";

export const EventService = {
    create: (payload: CalendarEventPayload) => api.post("/event/create", payload),
    bulkCreate: (payload: BulkCalenderEventPayload) => api.post("/event/bulk-create", payload),
    getAll: () => api.get("/event/all"),
    update: (payload: CalendarEventPayload & { id: string }) => api.put(`/event/update/${payload.id}`, payload),
    delete: (id: string) => api.delete(`/event/delete/${id}`)
}