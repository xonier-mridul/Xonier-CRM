import api from "../lib/axios";

export type FollowUpEntity = "deal" | "quotation" | "invoice" | "enquiry";
export type FollowUpCountEntity = FollowUpEntity | "lead";

export const FollowUpService = {
  update: (entity: FollowUpEntity, id: string, followUpIn: string | null) =>
    api.patch(`/follow-up/${entity}/${id}`, { followUpIn }),
  count: (entity: FollowUpCountEntity, fromDate?: string, toDate?: string) =>
    api.get(`/follow-up/count/${entity}`, { params: { fromDate: fromDate || undefined, toDate: toDate || undefined } }),
};
