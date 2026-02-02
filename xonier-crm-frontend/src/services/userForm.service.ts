import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { UpdateUserForm } from "../types/userForm/userForm.types";



export const UserFormService = {
    getAllLead: ()=> api.get("/user-form/user-id/lead"),
    getAllDeal: ()=> api.get("/user-form/user-id/deal"),
    create: (payload: UpdateUserForm)=> api.post("/user-form/create", payload),
    update:(id: ParamValue, data: UpdateUserForm)=> api.put(`/user-form/update/${id}`, data) 
}

