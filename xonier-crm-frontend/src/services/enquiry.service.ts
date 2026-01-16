import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { BulkCreateEnquiryPayload, CreateEnquiryPayload, GetEnquiryPayload, UpdateEnquiryPayload } from "../types/enquiry/enquiry.types";


export const EnquiryService = {
    getAll: (data: GetEnquiryPayload)=> api.get(
      `/enquiry/all?` +
        `${data.page ? `page=${data.page}&` : ""}` +
        `${data.limit ? `limit=${data.limit}&` : ""}` +
        `${data.enquiry_id ? `enquiry_id=${data.enquiry_id}&` : ""}` +
        `${data.fullName ? `fullName=${data.fullName}&` : ""}` +
        `${data.email ? `email=${data.email}&` : ""}` +
        `${data.phone ? `phone=${data.phone}&` : ""}` +
        `${data.companyName ? `companyName=${data.companyName}&` : ""}` +
        `${data.projectType ? `projectType=${data.projectType}&` : ""}` +
        `${data.priority ? `priority=${data.priority}&` : ""}`
    ),
    getById:(id:ParamValue)=> api.get(`/enquiry/get-by-id/${id}`),
    create: (payload: CreateEnquiryPayload)=> api.post("/enquiry/create", payload),
    bulkCreate: (payload: BulkCreateEnquiryPayload)=> api.post("/enquiry/create/bulk", payload),
    update: (id:ParamValue, payload: UpdateEnquiryPayload)=> api.put(`/enquiry/update/${id}`, payload),
    delete: (id:string)=> api.delete(`/enquiry/delete/${id}`)
}
