import api from "../lib/axios"

interface otprequestPayload {
    page?: number;
    limit?: number;
    search?: string;
}

export const OtpService = {
    getAll: (data: otprequestPayload) => {
        const params = new URLSearchParams();

        params.append("page", String(data.page));
        params.append("limit", String(data.limit));
        if(data.search){
            params.append("search", data.search);
        }

        return api.get(`/otp/all?${params.toString()}`);
    },
}