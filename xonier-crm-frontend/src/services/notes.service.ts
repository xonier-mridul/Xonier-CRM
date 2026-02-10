import api from "../lib/axios";
import { NoteCreatePayload } from "../types/note/note.types";



const NoteService = {
    getAllActive: (page?: number, limit?: number, filters?: Record<string, any>) => {
    const params = new URLSearchParams();

    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    return api.get(`/note/all/active?${params.toString()}`);
  },
  getAllPrivate: (page?: number, limit?: number, filters?: Record<string, any>) => {
    const params = new URLSearchParams();

    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    return api.get(`/note/all/private?${params.toString()}`);
  },
  create: (payload: NoteCreatePayload)=> api.post("/note/create", payload),
  ChangePinnedStatus: (id:string)=> api.patch(`/note/update/pinned/${id}`, {}),
  softDelete:(id:string)=> api.patch(`/note/soft-delete/${id}`, {})
}

export default NoteService