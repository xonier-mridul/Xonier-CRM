import api from "../lib/axios";
import { CalendarEventPayload } from "../types/calenders/calender.types";



export const EventService = {
    create : (payload: CalendarEventPayload)=> api.post("/event/create", payload),
    getAll: ()=> api.get("/event/all"),
    delete: (id: string)=> api.delete(`/event/delete/${id}`)
}