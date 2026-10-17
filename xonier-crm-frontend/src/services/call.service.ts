import api from "../lib/axios";

const CallService = {
  /** Ask the logged-in user's mobile app to dial this lead. */
  request: (leadId: string, campaignId?: string, campaignLeadId?: string) =>
    api.post("/call/request", { leadId, campaignId, campaignLeadId }),
  getLeadHistory: (leadId: string) => api.get(`/activity/lead/${leadId}/call-history`),
  getSession: (sessionId: string) => api.get(`/call/session/${sessionId}`),
  cancel: (sessionId: string) => api.post(`/call/session/${sessionId}/cancel`),
  /** "Was call connected?" -> true / false */
  dispose: (sessionId: string, connected: boolean) =>
    api.post(`/call/session/${sessionId}/dispose`, { connected }),
};

export default CallService;
