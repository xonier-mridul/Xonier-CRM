import api from "../lib/axios";

export const TimerService = {
    start: (taskId: string) =>
        api.post(`/task/${taskId}/timer/start`),

    pause: (logId: string) =>
        api.patch(`/task/timer/${logId}/pause`),

    resume: (logId: string) =>
        api.patch(`/task/timer/${logId}/resume`),

    stop: (logId: string, note?: string) =>
        api.patch(`/task/timer/${logId}/stop`, { note }),

    getByTask: (taskId: string) =>
        api.get(`/task/${taskId}/timer`),

    getActiveTimer: (taskId: string) =>
        api.get(`/task/${taskId}/timer/active`),
}