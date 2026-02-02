import api from "../lib/axios";



export const FormFieldService = {
    getAll: ()=> api.get("/form/get-all"),
    getLeadsAll: ()=> api.get("/form/lead/all"),
    getDealAll: ()=> api.get("/form/deal/all"),
}