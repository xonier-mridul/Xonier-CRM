import api from "../lib/axios";
import { CreateUserCustomField } from "../types/customForm.types";



const CustomFormService = {
    getAllByCreator : ()=> api.get(`/custom-field/get_buy_creator`),
    create:(payload: CreateUserCustomField)=> api.post("/custom-field/create", payload),
    delete: (id:string)=> api.delete(`/custom-field/delete/${id}`)
}


export default CustomFormService